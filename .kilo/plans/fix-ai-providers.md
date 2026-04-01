# Plan: Fix AI Provider Endpoints & Management

## Problems Found

### Critical Bugs
1. **fetch-models always fails**: Frontend sends `apiKey: ''`, server requires it and never reads stored key from DB
2. **Route ordering**: `/deactivate-all` is shadowed by `/:id/activate` (Express matches first registered)
3. **kilococode vs kilocode mismatch**: Frontend sends `kilococode`, backend config uses `kilocode`
4. **Users enter key twice**: Key entered on create, then again on the provider card after creation
5. **Anthropic chat broken**: `callAI()` sends OpenAI-format `messages` body to Anthropic's `/v1/messages` endpoint which requires different format
6. **No provider-specific response parsing**: OpenRouter/Anthropic/etc have different response schemas

### Missing Providers
Only 5 providers exist. User wants 11+: OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Mistral, Cohere, Together AI, Perplexity, DeepSeek, xAI, Kilo Code, OpenAI Compatible.

---

## Implementation

### Step 1: Rewrite `server/routes/ai-providers.cjs`

#### A. Fix provider config with correct endpoints for ALL providers

Each provider config has: `label`, `modelsUrl`, `chatUrl`, `keyHeader`, `keyPrefix`, `format`, `extraHeaders`, and optionally `staticModels`.

| Provider | modelsUrl | chatUrl | keyHeader | format |
|----------|-----------|---------|-----------|--------|
| openrouter | openrouter.ai/api/v1/models | openrouter.ai/api/v1/chat/completions | Authorization: Bearer | openai |
| openai | api.openai.com/v1/models | api.openai.com/v1/chat/completions | Authorization: Bearer | openai |
| anthropic | (static) | api.anthropic.com/v1/messages | x-api-key (no prefix) | anthropic |
| gemini | generativelanguage.googleapis.com/v1beta/models?key=KEY | .../models/MODEL:generateContent?key=KEY | (in URL) | gemini |
| groq | api.groq.com/openai/v1/models | api.groq.com/openai/v1/chat/completions | Authorization: Bearer | openai |
| mistral | api.mistral.ai/v1/models | api.mistral.ai/v1/chat/completions | Authorization: Bearer | openai |
| cohere | api.cohere.ai/v1/models | api.cohere.ai/v1/chat | Authorization: Bearer | cohere |
| together | api.together.xyz/v1/models | api.together.xyz/v1/chat/completions | Authorization: Bearer | openai |
| perplexity | (static) | api.perplexity.ai/chat/completions | Authorization: Bearer | openai |
| deepseek | api.deepseek.com/v1/models | api.deepseek.com/v1/chat/completions | Authorization: Bearer | openai |
| xai | api.x.ai/v1/models | api.x.ai/v1/chat/completions | Authorization: Bearer | openai |
| kilocode | kilocode.ai/api/models | kilocode.ai/api/chat/completions | Authorization: Bearer | openai |
| openai_compatible | baseUrl/v1/models | baseUrl/v1/chat/completions | Authorization: Bearer | openai |

#### B. Fix fetch-models to read key from DB

The `/fetch-models` endpoint should:
- Accept `providerId` (the provider's database ID)
- Look up the provider in DB to get stored `api_key`
- Use stored key to call the provider's models endpoint
- Also accept `apiKey` directly for the "Add Provider" flow (key entered once, fetch before saving)

Two flows:
1. **New provider**: Frontend sends `{ providerType, apiKey, baseUrl }` → server uses provided key to fetch models (not yet in DB)
2. **Existing provider**: Frontend sends `{ providerId }` → server reads key from DB

#### C. Fix route ordering

Move `PUT /deactivate-all` above `PUT /:id/activate`.

#### D. Fix Anthropic chat format

The `callAI` function needs provider-specific request body formatting:
- Anthropic: `{ model, messages, max_tokens }` + `anthropic-version: 2023-06-01` header
- Gemini: Different URL pattern and body format
- Cohere: `{ model, message, chat_history }` format
- All OpenAI-compatible: standard `{ model, messages, max_tokens }`

#### E. Fix Anthropic response parsing

Current code parses `data.choices[0].message.content`. Anthropic returns `data.content[0].text`. Need to handle both.

---

### Step 2: Rewrite `src/components/settings/AIProviderManager.tsx`

#### A. Key entered ONCE during provider creation

Remove the separate API key input on the provider card after creation. The flow becomes:
1. Click "Add Provider"
2. Select provider type
3. Enter display name
4. Enter API key
5. (For OpenAI Compatible only) Enter base URL
6. Click "Add Provider" → saves to DB with key, then auto-fetches models
7. User selects model from dropdown
8. Click "Activate"

No secondary key input after creation.

#### B. Update provider list to match new backend

- Fix `kilococode` ID to match backend
- Add all 11+ providers to the `providerTypes` array with correct icons
- Remove the API key input field from provider cards (key only entered once during creation)
- Add a "Change Key" button that opens a small inline input (for key rotation)

#### C. Fix fetch-models call

Send `providerId` for existing providers so server reads key from DB.

#### D. Better error handling

Replace empty `catch {}` blocks with toast notifications.

---

### Step 3: Update `server/routes/ai.cjs`

#### A. Fix callAI to handle all provider formats

Need to handle:
- **OpenAI-compatible** (OpenRouter, OpenAI, Groq, Mistral, Together, DeepSeek, xAI, Perplexity, Kilo Code): Standard `{ model, messages, max_tokens }` body, `choices[0].message.content` response
- **Anthropic**: `{ model, messages, max_tokens }` body + `anthropic-version` header, `content[0].text` response
- **Gemini**: URL-based model selection, `{ contents: [{ parts: [{ text }] }] }` body, `candidates[0].content.parts[0].text` response
- **Cohere**: `{ model, message, chat_history }` body, `text` response

#### B. Add provider-specific config fields

Add to each provider config:
- `format: 'openai' | 'anthropic' | 'gemini' | 'cohere'` — determines request/response format
- `extraHeaders: {}` — additional headers (e.g., `anthropic-version`)

---

### Step 4: Update `server/db.cjs`

No schema changes needed. Current schema is sufficient.

---

### Step 5: Security - API key handling

- Keys stored as-is in local SQLite database (user confirmed)
- Keys never returned in API responses — only `hasKey: boolean` sent to frontend
- Frontend only sends key TO server during creation or key rotation
- Provider cards show `••••••••` placeholder (never the actual key)
- No plaintext keys in logs or error messages

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/routes/ai-providers.cjs` | Complete rewrite: all 12 providers, fix fetch-models, fix route ordering |
| `server/routes/ai.cjs` | Fix callAI for all provider formats, fix response parsing |
| `src/components/settings/AIProviderManager.tsx` | Rewrite: key-once flow, all providers, remove key input from cards |
| `src/components/settings/SettingsView.tsx` | No changes needed (already delegates to AIProviderManager) |
| `src/utils/api.ts` | No changes needed (API methods already exist) |

## Verification

1. `curl POST /api/ai-providers/fetch-models` with valid OpenAI key → returns model list
2. `curl POST /api/ai-providers/fetch-models` with valid Anthropic key → returns static models
3. Create provider → fetch models → select model → activate → test summarize endpoint
4. Frontend: Add Provider → enter key once → models fetched → select → activate
5. Run `npx vitest run` and `npm run build`
