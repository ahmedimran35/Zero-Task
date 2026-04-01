const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db.cjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.cjs');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

const providerConfig = {
  openrouter: {
    label: 'OpenRouter',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  openai: {
    label: 'OpenAI',
    modelsUrl: 'https://api.openai.com/v1/models',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  anthropic: {
    label: 'Anthropic',
    modelsUrl: null,
    chatUrl: 'https://api.anthropic.com/v1/messages',
    keyHeader: 'x-api-key',
    keyPrefix: '',
    format: 'anthropic',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    staticModels: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    chatUrl: null,
    keyHeader: null,
    keyPrefix: '',
    format: 'gemini',
    staticModels: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
  },
  groq: {
    label: 'Groq',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  mistral: {
    label: 'Mistral',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    chatUrl: 'https://api.mistral.ai/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  cohere: {
    label: 'Cohere',
    modelsUrl: 'https://api.cohere.ai/v1/models',
    chatUrl: 'https://api.cohere.ai/v1/chat',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'cohere',
  },
  together: {
    label: 'Together AI',
    modelsUrl: 'https://api.together.xyz/v1/models',
    chatUrl: 'https://api.together.xyz/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  perplexity: {
    label: 'Perplexity',
    modelsUrl: null,
    chatUrl: 'https://api.perplexity.ai/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
    staticModels: [
      { id: 'sonar-pro', name: 'Sonar Pro' },
      { id: 'sonar', name: 'Sonar' },
      { id: 'sonar-pro-online', name: 'Sonar Pro Online' },
      { id: 'sonar-online', name: 'Sonar Online' },
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    modelsUrl: 'https://api.deepseek.com/v1/models',
    chatUrl: 'https://api.deepseek.com/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  xai: {
    label: 'xAI',
    modelsUrl: 'https://api.x.ai/v1/models',
    chatUrl: 'https://api.x.ai/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
  kilococode: {
    label: 'Kilo Code Gateway',
    modelsUrl: null,
    chatUrl: 'https://api.kilocode.ai/v1/chat/completions',
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
    staticModels: [
      { id: 'kilo-code', name: 'Kilo Code' },
      { id: 'kilo-code-fast', name: 'Kilo Code Fast' },
    ],
  },
  openai_compatible: {
    label: 'OpenAI Compatible',
    modelsUrl: null,
    chatUrl: null,
    keyHeader: 'Authorization',
    keyPrefix: 'Bearer ',
    format: 'openai',
  },
};

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

router.get('/active', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ai_providers WHERE is_active = 1').get();
  if (!row) return res.json(null);
  res.json({ id: row.id, providerType: row.provider_type, name: row.name, baseUrl: row.base_url, model: row.model, isActive: true });
});

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
    db.prepare('UPDATE ai_providers SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);
  }
  res.json({ success: true });
});

// Deactivate all must come BEFORE /:id/activate to avoid route shadowing
router.put('/deactivate-all', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE ai_providers SET is_active = 0').run();
  res.json({ success: true });
});

router.put('/:id/activate', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE ai_providers SET is_active = 0').run();
  db.prepare('UPDATE ai_providers SET is_active = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM ai_providers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Fetch models - supports both new provider (key in body) and existing provider (key from DB)
router.post('/fetch-models', async (req, res) => {
  const { providerId, providerType, apiKey, baseUrl } = req.body;

  let type = providerType;
  let key = apiKey;
  let url = baseUrl;

  // If providerId given, look up from DB
  if (providerId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM ai_providers WHERE id = ?').get(providerId);
    if (!row) return res.status(404).json({ error: 'Provider not found' });
    type = row.provider_type;
    key = row.api_key;
    url = row.base_url;
  }

  if (!type || !key) return res.status(400).json({ error: 'Provider type and API key required' });

  const config = providerConfig[type];
  if (!config) return res.status(400).json({ error: 'Unknown provider type: ' + type });

  // Static models (Anthropic, Gemini, Perplexity)
  if (config.staticModels) {
    return res.json({ models: config.staticModels });
  }

  // Build models URL
  let modelsUrl = config.modelsUrl;
  if (type === 'openai_compatible' && url) {
    modelsUrl = url.replace(/\/+$/, '') + '/v1/models';
  } else if (type === 'openai_compatible' && !url) {
    return res.status(400).json({ error: 'Base URL required for OpenAI Compatible provider' });
  }
  if (type === 'gemini') {
    modelsUrl = modelsUrl + '?key=' + encodeURIComponent(key);
  }

  if (!modelsUrl) return res.status(400).json({ error: 'No models endpoint for this provider' });

  try {
    const headers = { 'Accept': 'application/json' };
    if (config.keyHeader && type !== 'gemini') {
      headers[config.keyHeader] = config.keyPrefix + key;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(modelsUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'API error: ' + response.status + ' - ' + text.slice(0, 300) });
    }

    const data = await response.json();
    let models = [];

    // OpenAI / OpenRouter / Groq / Mistral / Together / DeepSeek / xAI format: { data: [{ id }] }
    if (data.data && Array.isArray(data.data)) {
      models = data.data.filter(m => m.id).map(m => ({
        id: m.id,
        name: m.id.replace(/[:/]/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      }));
    }
    // Gemini format: { models: [{ name }] }
    else if (data.models && Array.isArray(data.models)) {
      models = data.models.filter(m => m.name).map(m => ({
        id: m.name.replace('models/', ''),
        name: (m.displayName || m.name.replace('models/', '')).replace(/-/g, ' '),
      }));
    }
    // Cohere format: { models: [{ name }] }
    else if (data.models && Array.isArray(data.models)) {
      models = data.models.map(m => ({ id: m.name || m.id, name: m.name || m.id }));
    }
    // Plain array
    else if (Array.isArray(data)) {
      models = data.map(m => ({
        id: typeof m === 'string' ? m : m.id,
        name: typeof m === 'string' ? m : (m.name || m.id),
      }));
    }

    models.sort((a, b) => {
      const aChat = /gpt|claude|llama|mistral|gemini|qwen|deepseek|sonar|command|mixtral/i.test(a.id);
      const bChat = /gpt|claude|llama|mistral|gemini|qwen|deepseek|sonar|command|mixtral/i.test(b.id);
      if (aChat && !bChat) return -1;
      if (!aChat && bChat) return 1;
      return a.id.localeCompare(b.id);
    });

    res.json({ models });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out after 15 seconds. Check the URL and try again.' });
    }
    res.status(500).json({ error: 'Failed to fetch models: ' + err.message });
  }
});

module.exports = { router, providerConfig };
