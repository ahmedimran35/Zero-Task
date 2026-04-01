const express = require('express');
const { authMiddleware } = require('../middleware/auth.cjs');
const { getDb } = require('../db.cjs');
const router = express.Router();

router.use(authMiddleware);

// Parse natural language task input
router.post('/parse-task', (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Input required' });

  let title = input;
  let priority = null;
  let dueDate = null;
  const tags = [];
  const now = new Date();

  // Extract priority
  const priorityPatterns = [
    { pattern: /\bp1\b/i, value: 'urgent' },
    { pattern: /\bp2\b/i, value: 'high' },
    { pattern: /\bp3\b/i, value: 'medium' },
    { pattern: /\bp4\b/i, value: 'low' },
    { pattern: /\burgent\b/i, value: 'urgent' },
    { pattern: /\bhigh priority\b/i, value: 'high' },
    { pattern: /\blow priority\b/i, value: 'low' },
  ];
  for (const { pattern, value } of priorityPatterns) {
    if (pattern.test(title)) {
      priority = value;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  // Extract tags
  const tagMatches = title.match(/#(\w+)/g);
  if (tagMatches) {
    for (const m of tagMatches) tags.push(m.slice(1).toLowerCase());
    title = title.replace(/#\w+/g, '').trim();
  }

  // Extract due dates
  const lower = title.toLowerCase();
  if (/\btoday\b/i.test(lower)) {
    dueDate = now.toISOString().split('T')[0];
    title = title.replace(/\btoday\b/gi, '').trim();
  } else if (/\btomorrow\b/i.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    dueDate = d.toISOString().split('T')[0];
    title = title.replace(/\btomorrow\b/gi, '').trim();
  } else if (/\bnext week\b/i.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    dueDate = d.toISOString().split('T')[0];
    title = title.replace(/\bnext week\b/gi, '').trim();
  }

  const inDaysMatch = lower.match(/\bin (\d+) days?\b/);
  if (inDaysMatch) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    dueDate = d.toISOString().split('T')[0];
    title = title.replace(/\bin \d+ days?\b/gi, '').trim();
  }

  const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    dueDate = dateMatch[1];
    title = title.replace(/\d{4}-\d{2}-\d{2}/, '').trim();
  }

  title = title.replace(/\s+/g, ' ').replace(/\s+(by|on|at|for|due)\s*$/i, '').trim();

  res.json({ title: title || input, priority, dueDate, tags });
});

// Summarize task
router.post('/summarize', async (req, res) => {
  const { taskTitle, comments, description } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ summary: 'AI summarization requires an OpenAI API key configured in server environment.' });

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    const content = `Task: ${taskTitle}\nDescription: ${description || 'None'}\nComments:\n${(comments || []).map((c) => `- ${c.author}: ${c.text}`).join('\n')}`;
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize the following task and its discussion in 2-3 concise sentences. Focus on current status, blockers, and next steps.' },
        { role: 'user', content },
      ],
      max_tokens: 200,
    });
    res.json({ summary: completion.choices[0]?.message?.content || 'No summary available.' });
  } catch (err) {
    res.json({ summary: `AI error: ${err.message}` });
  }
});

// Generate subtasks
router.post('/generate-subtasks', async (req, res) => {
  const { title, description } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ subtasks: [], error: 'OpenAI API key not configured' });

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate 3-6 actionable subtasks for the given task. Return ONLY a JSON array of strings, e.g. ["subtask 1", "subtask 2"]. No other text.' },
        { role: 'user', content: `Title: ${title}\nDescription: ${description || 'None'}` },
      ],
      max_tokens: 300,
    });
    const text = completion.choices[0]?.message?.content || '[]';
    const subtasks = JSON.parse(text);
    res.json({ subtasks: Array.isArray(subtasks) ? subtasks : [] });
  } catch (err) {
    res.json({ subtasks: [], error: err.message });
  }
});

// Smart search
router.post('/search', async (req, res) => {
  const { query } = req.body;
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.userId);

  // Keyword search fallback
  const lower = (query || '').toLowerCase();
  const results = tasks.filter((t) =>
    t.title.toLowerCase().includes(lower) ||
    t.description.toLowerCase().includes(lower) ||
    t.category.toLowerCase().includes(lower)
  ).slice(0, 10);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.json({ results, mode: 'keyword' });

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    const taskSummary = tasks.map((t) => `[${t.id}] ${t.title} (${t.status}, ${t.priority})`).join('\n');
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Given these tasks and a user query, return the IDs of relevant tasks as a JSON array. Only return the JSON array, no other text.' },
        { role: 'user', content: `Tasks:\n${taskSummary}\n\nQuery: ${query}` },
      ],
      max_tokens: 300,
    });
    const ids = JSON.parse(completion.choices[0]?.message?.content || '[]');
    const aiResults = tasks.filter((t) => ids.includes(t.id)).slice(0, 10);
    res.json({ results: aiResults.length > 0 ? aiResults : results, mode: 'ai' });
  } catch {
    res.json({ results, mode: 'keyword' });
  }
});

// Daily standup
router.get('/standup', (req, res) => {
  const db = getDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const recent = db.prepare(
    `SELECT * FROM tasks WHERE user_id = ? AND updated_at > ? ORDER BY updated_at DESC`
  ).all(req.userId, yesterday);

  const completed = recent.filter((t) => t.status === 'done');
  const inProgress = recent.filter((t) => t.status === 'in-progress');
  const todo = recent.filter((t) => t.status === 'todo');

  res.json({
    completed: completed.map((t) => ({ id: t.id, title: t.title })),
    inProgress: inProgress.map((t) => ({ id: t.id, title: t.title })),
    planned: todo.slice(0, 5).map((t) => ({ id: t.id, title: t.title })),
    blockers: [], // Could be enhanced to detect blocked tasks
  });
});

module.exports = router;
