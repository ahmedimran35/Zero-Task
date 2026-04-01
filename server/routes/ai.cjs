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

async function callAI(messages, maxTokens) {
  const provider = getActiveProvider();
  if (!provider || !provider.apiKey) throw new Error('No AI provider configured');
  if (!provider.model) throw new Error('No model selected');

  const config = providerConfig[provider.type];
  if (!config) throw new Error('Unknown provider type: ' + provider.type);

  const format = config.format || 'openai';
  let url, headers, body;

  if (format === 'openai') {
    url = config.chatUrl;
    if (provider.type === 'openai_compatible' && provider.baseUrl) {
      url = provider.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
    }
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    body = { model: provider.model, messages, max_tokens: maxTokens || 300 };
  }
  else if (format === 'anthropic') {
    url = config.chatUrl;
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    if (config.extraHeaders) Object.assign(headers, config.extraHeaders);
    body = { model: provider.model, max_tokens: maxTokens || 300, messages };
  }
  else if (format === 'gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + provider.model + ':generateContent?key=' + encodeURIComponent(provider.apiKey);
    headers = { 'Content-Type': 'application/json' };
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    body = { contents, generationConfig: { maxOutputTokens: maxTokens || 300 } };
    if (messages.find(m => m.role === 'system')) {
      body.systemInstruction = { parts: [{ text: messages.find(m => m.role === 'system').content }] };
    }
  }
  else if (format === 'cohere') {
    url = config.chatUrl;
    headers = { 'Content-Type': 'application/json' };
    headers[config.keyHeader] = config.keyPrefix + provider.apiKey;
    const userMsg = messages.filter(m => m.role === 'user').pop();
    const chatHistory = messages.filter(m => m.role !== 'system' && m !== userMsg).map(m => ({
      role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
      message: m.content
    }));
    body = { model: provider.model, message: userMsg?.content || '', chat_history: chatHistory, max_tokens: maxTokens || 300 };
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error('AI API error: ' + response.status + ' ' + text.slice(0, 300));
  }

  const data = await response.json();

  if (format === 'openai') {
    return data.choices?.[0]?.message?.content || '';
  }
  if (format === 'anthropic') {
    return data.content?.[0]?.text || '';
  }
  if (format === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  if (format === 'cohere') {
    return data.text || '';
  }

  throw new Error('Unknown response format');
}

router.post('/parse-task', (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Input required' });
  let title = input, priority = null, dueDate = null;
  const tags = [], now = new Date();
  const pats = [
    { p: /\bp1\b/i, v: 'urgent' }, { p: /\bp2\b/i, v: 'high' },
    { p: /\bp3\b/i, v: 'medium' }, { p: /\bp4\b/i, v: 'low' },
    { p: /\burgent\b/i, v: 'urgent' }, { p: /\bhigh priority\b/i, v: 'high' },
  ];
  for (const { p, v } of pats) { if (p.test(title)) { priority = v; title = title.replace(p, '').trim(); break; } }
  const tm = title.match(/#(\w+)/g);
  if (tm) { for (const m of tm) tags.push(m.slice(1).toLowerCase()); title = title.replace(/#\w+/g, '').trim(); }
  if (/\btoday\b/i.test(title)) { dueDate = now.toISOString().split('T')[0]; title = title.replace(/\btoday\b/gi, '').trim(); }
  else if (/\btomorrow\b/i.test(title)) { const d = new Date(now); d.setDate(d.getDate()+1); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\btomorrow\b/gi, '').trim(); }
  else if (/\bnext week\b/i.test(title)) { const d = new Date(now); d.setDate(d.getDate()+7); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\bnext week\b/gi, '').trim(); }
  const dm = title.match(/\bin (\d+) days?\b/i);
  if (dm) { const d = new Date(now); d.setDate(d.getDate()+parseInt(dm[1])); dueDate = d.toISOString().split('T')[0]; title = title.replace(/\bin \d+ days?\b/gi, '').trim(); }
  title = title.replace(/\s+/g, ' ').replace(/\s+(by|on|at|for|due)\s*$/i, '').trim();
  res.json({ title: title || input, priority, dueDate, tags });
});

router.post('/summarize', async (req, res) => {
  const { taskTitle, comments, description } = req.body;
  try {
    const content = 'Task: ' + taskTitle + '\nDescription: ' + (description || 'None') + '\nComments:\n' + (comments || []).map(c => '- ' + c.author + ': ' + c.text).join('\n');
    const summary = await callAI([
      { role: 'system', content: 'Summarize in 2-3 sentences. Focus on status, blockers, next steps.' },
      { role: 'user', content },
    ], 200);
    res.json({ summary: summary || 'No summary.' });
  } catch (err) { res.json({ summary: 'AI error: ' + err.message }); }
});

router.post('/generate-subtasks', async (req, res) => {
  const { title, description } = req.body;
  try {
    const text = await callAI([
      { role: 'system', content: 'Generate 3-6 subtasks. Return ONLY JSON array of strings: ["subtask1","subtask2"].' },
      { role: 'user', content: 'Title: ' + title + '\nDescription: ' + (description || 'None') },
    ], 300);
    const subtasks = JSON.parse(text);
    res.json({ subtasks: Array.isArray(subtasks) ? subtasks : [] });
  } catch (err) { res.json({ subtasks: [], error: err.message }); }
});

router.post('/search', async (req, res) => {
  const { query } = req.body;
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.userId);
  const lower = (query || '').toLowerCase();
  const results = tasks.filter(t => t.title.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower) || t.category.toLowerCase().includes(lower)).slice(0, 10);
  try {
    const ts = tasks.map(t => '[' + t.id + '] ' + t.title + ' (' + t.status + ', ' + t.priority + ')').join('\n');
    const idsText = await callAI([
      { role: 'system', content: 'Return task IDs matching query as JSON array. Only the array.' },
      { role: 'user', content: 'Tasks:\n' + ts + '\n\nQuery: ' + query },
    ], 300);
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

module.exports = router;
