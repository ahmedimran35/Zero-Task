const express = require('express');
const { authMiddleware } = require('../middleware/auth.cjs');
const { getDb } = require('../db.cjs');
const { providerConfig } = require('./ai-providers.cjs');
const router = express.Router();

router.use(authMiddleware);

function getActiveProvider() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1').get();
  if (!row) return null;
  return { id: row.id, type: row.provider_type, apiKey: row.api_key, baseUrl: row.base_url, model: row.model };
}

function checkAndUseQuota(userId) {
  const db = getDb();
  const quota = db.prepare('SELECT * FROM user_ai_quotas WHERE user_id = ?').get(userId);
  
  if (!quota || quota.daily_limit === 0) {
    return { allowed: false, error: 'No AI quota available' };
  }
  
  const now = new Date();
  if (quota.reset_at && new Date(quota.reset_at) < now) {
    db.prepare('UPDATE user_ai_quotas SET used_today = 0, reset_at = ? WHERE id = ?').run(
      new Date(now.getTime() + 24*60*60*1000).toISOString(), quota.id
    );
    quota.used_today = 0;
  }
  
  if (quota.used_today >= quota.daily_limit) {
    return { allowed: false, error: 'Daily AI quota exceeded' };
  }
  
  db.prepare('UPDATE user_ai_quotas SET used_today = used_today + 1 WHERE id = ?').run(quota.id);
  
  return { allowed: true, remaining: quota.daily_limit - quota.used_today - 1 };
}

async function callAI(messages, maxTokens) {
  const provider = getActiveProvider();
  if (!provider || !provider.apiKey) throw new Error('No AI provider configured');
  if (!provider.model) throw new Error('No model selected');
  const config = providerConfig[provider.type];
  if (!config) throw new Error('Unknown provider: ' + provider.type);
  const format = config.format || 'openai';
  let url, headers, body;
  if (format === 'openai') {
    url = config.chatUrl;
    if (provider.type === 'openai_compatible' && provider.baseUrl)
      url = provider.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    body = { model: provider.model, messages, max_tokens: maxTokens || 300 };
  } else if (format === 'anthropic') {
    url = config.chatUrl;
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    if (config.extraHeaders) Object.assign(headers, config.extraHeaders);
    body = { model: provider.model, max_tokens: maxTokens || 300, messages };
  } else if (format === 'gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + provider.model + ':generateContent?key=' + encodeURIComponent(provider.apiKey);
    headers = { 'Content-Type': 'application/json' };
    const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    body = { contents, generationConfig: { maxOutputTokens: maxTokens || 300 } };
    const sysMsg = messages.find(m => m.role === 'system');
    if (sysMsg) body.systemInstruction = { parts: [{ text: sysMsg.content }] };
  } else if (format === 'cohere') {
    url = config.chatUrl;
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    const userMsg = messages.filter(m => m.role === 'user').pop();
    body = { model: provider.model, message: userMsg?.content || '', chat_history: [], max_tokens: maxTokens || 300 };
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) { const t = await response.text(); throw new Error('AI error: ' + response.status + ' ' + t.slice(0, 300)); }
  const data = await response.json();
  if (format === 'openai') return data.choices?.[0]?.message?.content || '';
  if (format === 'anthropic') return data.content?.[0]?.text || '';
  if (format === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (format === 'cohere') return data.text || '';
  throw new Error('Unknown response format');
}

router.post('/parse-task', (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Input required' });
  let title = input, priority = null, dueDate = null;
  const tags = [], now = new Date();
  const pats = [{ p: /\bp1\b/i, v: 'urgent' }, { p: /\bp2\b/i, v: 'high' }, { p: /\bp3\b/i, v: 'medium' }, { p: /\bp4\b/i, v: 'low' }, { p: /\burgent\b/i, v: 'urgent' }];
  for (const { p, v } of pats) { if (p.test(title)) { priority = v; title = title.replace(p, '').trim(); break; } }
  const tm = title.match(/#(\w+)/g);
  if (tm) { for (const m of tm) tags.push(m.slice(1).toLowerCase()); title = title.replace(/#\w+/g, '').trim(); }
  if (/\btoday\b/i.test(title)) { dueDate = now.toISOString().split('T')[0]; title = title.replace(/\btoday\b/gi, '').trim(); }
  else if (/\btomorrow\b/i.test(title)) { const d = new Date(now); d.setDate(d.getDate()+1); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\btomorrow\b/gi, '').trim(); }
  else if (/\bnext week\b/i.test(title)) { const d = new Date(now); d.setDate(d.getDate()+7); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\bnext week\b/gi, '').trim(); }
  title = title.replace(/\s+/g, ' ').replace(/\s+(by|on|at|for|due)\s*$/i, '').trim();
  res.json({ title: title || input, priority, dueDate, tags });
});

router.post('/summarize', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { taskTitle, comments, description } = req.body;
  try {
    const content = 'Task: ' + taskTitle + '\nDescription: ' + (description || 'None') + '\nComments:\n' + (comments || []).map(c => '- ' + c.author + ': ' + c.text).join('\n');
    const summary = await callAI([{ role: 'system', content: 'Summarize in 2-3 sentences. Focus on status, blockers, next steps.' }, { role: 'user', content }], 200);
    res.json({ summary: summary || 'No summary.' });
  } catch (err) { res.json({ summary: 'AI error: ' + err.message }); }
});

router.post('/generate-subtasks', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { title, description } = req.body;
  try {
    const text = await callAI([{ role: 'system', content: 'Generate 3-6 subtasks. Return ONLY JSON array: ["subtask1","subtask2"].' }, { role: 'user', content: 'Title: ' + title + '\nDescription: ' + (description || 'None') }], 300);
    res.json({ subtasks: JSON.parse(text) });
  } catch (err) { res.json({ subtasks: [], error: err.message }); }
});

router.post('/search', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { query } = req.body;
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.userId);
  const lower = (query || '').toLowerCase();
  const results = tasks.filter(t => t.title.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower)).slice(0, 10);
  try {
    const ts = tasks.map(t => '[' + t.id + '] ' + t.title + ' (' + t.status + ')').join('\n');
    const idsText = await callAI([{ role: 'system', content: 'Return matching IDs as JSON array. Only the array.' }, { role: 'user', content: 'Tasks:\n' + ts + '\nQuery: ' + query }], 300);
    const ids = JSON.parse(idsText);
    const aiResults = tasks.filter(t => ids.includes(t.id)).slice(0, 10);
    res.json({ results: aiResults.length > 0 ? aiResults : results, mode: 'ai' });
  } catch { res.json({ results, mode: 'keyword' }); }
});

router.get('/standup', (req, res) => {
  const db = getDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const recent = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND updated_at > ? ORDER BY updated_at DESC').all(req.userId, yesterday);
  res.json({
    completed: recent.filter(t => t.status === 'done').map(t => ({ id: t.id, title: t.title })),
    inProgress: recent.filter(t => t.status === 'in-progress').map(t => ({ id: t.id, title: t.title })),
    planned: recent.filter(t => t.status === 'todo').slice(0, 5).map(t => ({ id: t.id, title: t.title })),
    blockers: [],
  });
});

// Workspace Q&A
router.post('/workspace-q', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').all(req.userId);
  const summary = tasks.map(t => '- [' + t.status + '|' + t.priority + '] ' + t.title + (t.due_date ? ' (due: ' + t.due_date.split('T')[0] + ')' : '')).join('\n');
  try {
    const answer = await callAI([
      { role: 'system', content: 'You are a project assistant. Answer concisely about tasks. Mention specific task titles when relevant.' },
      { role: 'user', content: 'My tasks:\n' + summary + '\n\nQuestion: ' + question },
    ], 400);
    res.json({ answer: answer || 'No answer.' });
  } catch (err) { res.json({ answer: 'AI error: ' + err.message }); }
});

// Generate description
router.post('/generate-description', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { title, existingDescription } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const desc = await callAI([
      { role: 'system', content: 'Write a clear task description (2-4 sentences). Include what to do, acceptance criteria. Concise and actionable.' },
      { role: 'user', content: 'Title: ' + title + (existingDescription ? '\nExisting: ' + existingDescription : '') },
    ], 300);
    res.json({ description: desc || '' });
  } catch (err) { res.json({ description: '', error: err.message }); }
});

// Suggest priority
router.post('/suggest-priority', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { title, description, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await callAI([
      { role: 'system', content: 'Suggest priority. Return ONLY JSON: {"priority":"low|medium|high|urgent","reason":"brief"}. Consider urgency, complexity, impact.' },
      { role: 'user', content: 'Title: ' + title + '\nDesc: ' + (description || 'None') + '\nDue: ' + (dueDate || 'None') },
    ], 150);
    res.json(JSON.parse(result));
  } catch (err) { res.json({ priority: 'medium', reason: 'Could not determine' }); }
});

// Suggest tags
router.post('/suggest-tags', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const result = await callAI([
      { role: 'system', content: 'Suggest 2-5 tags. Return ONLY JSON array: ["tag1","tag2"]. Lowercase.' },
      { role: 'user', content: 'Title: ' + title + '\nDesc: ' + (description || 'None') },
    ], 100);
    const tags = JSON.parse(result);
    res.json({ tags: Array.isArray(tags) ? tags : [] });
  } catch (err) { res.json({ tags: [] }); }
});

// Weekly summary
router.post('/weekly-summary', async (req, res) => {
  const quotaCheck = checkAndUseQuota(req.userId);
  if (!quotaCheck.allowed) return res.status(403).json({ error: quotaCheck.error });
  
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND updated_at > ?').all(req.userId, weekAgo);
  const summary = tasks.map(t => '- [' + t.status + '] ' + t.title).join('\n');
  try {
    const text = await callAI([
      { role: 'system', content: 'Write a brief weekly summary (3-5 sentences). Highlight completed work, ongoing efforts, blockers.' },
      { role: 'user', content: 'Updated this week (' + tasks.length + ' tasks):\n' + summary },
    ], 300);
    res.json({ summary: text || 'No activity.' });
  } catch (err) { res.json({ summary: 'AI error: ' + err.message }); }
});

module.exports = router;
