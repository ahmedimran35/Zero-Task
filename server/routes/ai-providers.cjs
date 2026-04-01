const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

// All routes require admin
router.use(authMiddleware, adminMiddleware);

// Provider config by type
const providerConfig = {
  openrouter: {
    label: 'OpenRouter',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
  },
  openai: {
    label: 'OpenAI',
    modelsUrl: 'https://api.openai.com/v1/models',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
  },
  anthropic: {
    label: 'Anthropic',
    modelsUrl: null,
    chatUrl: 'https://api.anthropic.com/v1/messages',
    keyHeader: 'x-api-key',
    keyPrefix: '',
    staticModels: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
  },
  openai_compatible: {
    label: 'OpenAI Compatible',
    modelsUrl: '/v1/models',
    chatUrl: '/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
  },
  kilocode: {
    label: 'Kilo Code Gateway',
    modelsUrl: 'https://kilocode.ai/api/models',
    chatUrl: 'https://kilocode.ai/api/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
  },
};

// List all providers
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ai_providers ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({
    id: r.id,
    providerType: r.provider_type,
    name: r.name,
    baseUrl: r.base_url,
    model: r.model,
    isActive: !!r.is_active,
    createdAt: r.created_at,
    hasKey: !!r.api_key,
  })));
});

// Get active provider
router.get('/active', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1').get();
  if (!row) return res.json(null);
  res.json({
    id: row.id,
    providerType: row.provider_type,
    name: row.name,
    baseUrl: row.base_url,
    model: row.model,
    isActive: true,
  });
});

// Create provider
router.post('/', (req, res) => {
  const { providerType, name, apiKey, baseUrl } = req.body;
  if (!providerType || !name) return res.status(400).json({ error: 'Provider type and name required' });

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO ai_providers (id, provider_type, name, api_key, base_url) VALUES (?, ?, ?, ?, ?)').run(
    id, providerType, name.trim(), apiKey || '', baseUrl || ''
  );
  res.json({ id, providerType, name: name.trim(), baseUrl: baseUrl || '', model: '', isActive: false, createdAt: new Date().toISOString(), hasKey: !!apiKey });
});

// Update provider (set model, rename, etc.)
router.put('/:id', (req, res) => {
  const { name, model, baseUrl, apiKey } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM ai_providers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Provider not found' });

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (model !== undefined) { updates.push('model = ?'); params.push(model); }
  if (baseUrl !== undefined) { updates.push('base_url = ?'); params.push(baseUrl); }
  if (apiKey !== undefined) { updates.push('api_key = ?'); params.push(apiKey); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE ai_providers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

// Set active provider (deactivates all others)
router.put('/:id/activate', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE ai_providers SET is_active = 0').run();
  db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Deactivate all providers
router.put('/deactivate-all', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE ai_providers SET is_active = 0').run();
  res.json({ success: true });
});

// Delete provider
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM ai_providers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Fetch available models from provider
router.post('/fetch-models', async (req, res) => {
  const { providerType, apiKey, baseUrl } = req.body;
  if (!providerType || !apiKey) return res.status(400).json({ error: 'Provider type and API key required' });

  const config = providerConfig[providerType];
  if (!config) return res.status(400).json({ error: 'Unknown provider type' });

  // Anthropic has static models
  if (config.staticModels) {
    return res.json({ models: config.staticModels });
  }

  let modelsUrl = config.modelsUrl;
  if (providerType === 'openai_compatible' && baseUrl) {
    modelsUrl = baseUrl.replace(/\/+$/, '') + '/v1/models';
  } else if (providerType === 'kilococode' && baseUrl) {
    modelsUrl = baseUrl;
  }

  try {
    const headers = {};
    headers[config.keyHeader] = config.keyPrefix + apiKey;

    const response = await fetch(modelsUrl, { headers });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `API error: ${response.status} - ${text.slice(0, 200)}` });
    }

    const data = await response.json();
    let models = [];

    if (data.data && Array.isArray(data.data)) {
      models = data.data
        .filter((m) => m.id)
        .map((m) => ({
          id: m.id,
          name: m.id.replace(/[:/]/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        }));
    } else if (Array.isArray(data)) {
      models = data.map((m) => ({
        id: typeof m === 'string' ? m : m.id,
        name: typeof m === 'string' ? m : (m.name || m.id),
      }));
    }

    // Sort: put chat-capable models first
    models.sort((a, b) => {
      const aChat = /gpt|claude|llama|mistral|gemini|qwen|deepseek/i.test(a.id);
      const bChat = /gpt|claude|llama|mistral|gemini|qwen|deepseek/i.test(b.id);
      if (aChat && !bChat) return -1;
      if (!aChat && bChat) return 1;
      return a.id.localeCompare(b.id);
    });

    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch models: ' + err.message });
  }
});

module.exports = { router, providerConfig };
