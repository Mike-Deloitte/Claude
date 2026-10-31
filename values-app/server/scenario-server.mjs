// Scenario server: generates new scenarios with an AI model when a profile runs out
// of built-in ones. Runs on your own computer. The AI key stays here and never goes
// to the phone app.
//
// Run:  ANTHROPIC_API_KEY=sk-... SCENARIO_TOKEN=pick-a-long-random-string node server/scenario-server.mjs
// Set PORT to change the port (default 8787). MOCK_AI=1 returns fixed scenarios, for testing.
//
// The phone sends only: how many scenarios it needs, and the titles it has already shown.
// Nothing about the profile, its name, or its answers is sent.

import http from 'node:http';

export const PORT = Number(process.env.PORT ?? 8787);
const MODEL = 'claude-sonnet-5-5';
const MAX_COUNT = 15;
const MAX_AVOID = 200;
const MAX_BODY = 16 * 1024;

// Must match src/taxonomy.js. A test in test/ checks that the two lists are equal.
export const TAG_IDS = [
  'fairness', 'loyalty', 'honesty', 'care', 'autonomy', 'achievement', 'tradition', 'security',
  'consequentialist', 'duty', 'virtue', 'egalitarian',
  'harm-care', 'reciprocity', 'ingroup-loyalty', 'authority', 'sanctity', 'liberty',
];
const MORAL_IDS = ['harm-care', 'reciprocity', 'ingroup-loyalty', 'authority', 'sanctity', 'liberty'];
const TAG_SET = new Set(TAG_IDS);

// Checks one scenario from the model. Returns a clean scenario, or null if it is unusable.
export function validateScenario(raw, avoidTitles = []) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (title.length < 3 || title.length > 80) return null;
  if (text.length < 20 || text.length > 400) return null;

  const avoid = new Set(avoidTitles.map((t) => String(t).toLowerCase()));
  if (avoid.has(title.toLowerCase())) return null;

  if (!Array.isArray(raw.options) || raw.options.length < 4) return null;
  const options = [];
  for (const option of raw.options.slice(0, 4)) {
    const optionText = typeof option?.text === 'string' ? option.text.trim() : '';
    if (optionText.length < 3 || optionText.length > 200) return null;
    const tags = {};
    for (const [id, strength] of Object.entries(option.tags ?? {})) {
      if (!TAG_SET.has(id) || typeof strength !== 'number' || !Number.isFinite(strength)) continue;
      tags[id] = Math.min(1, Math.max(0, strength));
    }
    options.push({ text: optionText, tags });
  }
  // Every scenario needs at least one option that carries a moral tag.
  if (!options.some((o) => Object.keys(o.tags).some((id) => MORAL_IDS.includes(id)))) return null;
  return { title, text, options };
}

// Pulls the JSON array out of the model's reply, even if it adds a little prose around it.
export function parseScenarioList(replyText) {
  const start = replyText.indexOf('[');
  const end = replyText.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(replyText.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildPrompt(count, avoidTitles) {
  const avoid = avoidTitles.length
    ? `Do not write any scenario similar to these titles: ${JSON.stringify(avoidTitles.slice(0, MAX_AVOID))}.`
    : '';
  return `Write ${count} new self-reflection scenarios. Each is a realistic everyday dilemma with no clear right answer.
Each scenario has a short title, a text of 1-3 sentences describing the situation, and exactly four responses a person might give.
Each response has text (one sentence, first person or neutral) and "tags": an object mapping tag ids to strengths from 0 to 1.
Use only these tag ids: ${TAG_IDS.join(', ')}.
Each scenario must include at least one response with a moral tag (${MORAL_IDS.join(', ')}).
Cover a range of situations: work, family, friends, money, community, strangers.
${avoid}
Return only a JSON array of ${count} objects with keys "title", "text", "options". No other text.`;
}

async function generateWithModel(count, avoidTitles, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(count, avoidTitles) }],
    }),
  });
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const data = await response.json();
  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseScenarioList(text);
}

export function mockScenarios(count, avoidTitles = []) {
  const avoid = new Set(avoidTitles.map((t) => t.toLowerCase()));
  const out = [];
  for (let n = 1; out.length < count; n++) {
    const title = `Mock scenario ${n}`;
    if (avoid.has(title.toLowerCase())) continue;
    out.push({
      title,
      text: 'A test scenario used to check the app without calling the AI service.',
      options: [
        { text: 'Option one for the test.', tags: { care: 0.5, 'harm-care': 0.5 } },
        { text: 'Option two for the test.', tags: { duty: 0.5, reciprocity: 0.5 } },
        { text: 'Option three for the test.', tags: { autonomy: 0.5, liberty: 0.5 } },
        { text: 'Option four for the test.', tags: { security: 0.5, authority: 0.5 } },
      ],
    });
  }
  return out;
}

// Builds the response: validated scenarios with fresh keys. The model sometimes returns
// unusable items, so it is asked again for the missing ones, up to three attempts.
const MAX_ATTEMPTS = 3;

export async function produceScenarios(count, avoidTitles, { apiKey, mock }) {
  const scenarios = [];
  const seen = [...avoidTitles];
  for (let attempt = 0; attempt < MAX_ATTEMPTS && scenarios.length < count; attempt++) {
    const missing = count - scenarios.length;
    const raw = mock
      ? mockScenarios(missing, seen)
      : await generateWithModel(missing, seen, apiKey);
    for (const candidate of raw) {
      const clean = validateScenario(candidate, seen);
      if (!clean) continue;
      scenarios.push({ key: `ai-${crypto.randomUUID()}`, ...clean });
      seen.push(clean.title);
      if (scenarios.length === count) break;
    }
  }
  return scenarios;
}

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createServer({ apiKey, token, mock }) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST' || req.url !== '/scenarios') return send(res, 404, { error: 'not found' });
    if (token && req.headers.authorization !== `Bearer ${token}`) return send(res, 401, { error: 'unauthorised' });

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, { error: 'invalid request' });
    }
    const count = Number(body.count);
    const avoidTitles = Array.isArray(body.avoidTitles) ? body.avoidTitles.filter((t) => typeof t === 'string') : [];
    if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
      return send(res, 400, { error: `count must be 1 to ${MAX_COUNT}` });
    }
    if (!mock && !apiKey) return send(res, 500, { error: 'server has no AI key' });

    try {
      const scenarios = await produceScenarios(count, avoidTitles.slice(0, MAX_AVOID), { apiKey, mock });
      return send(res, 200, { scenarios });
    } catch (err) {
      console.error('scenario generation failed:', err.message);
      return send(res, 502, { error: 'could not generate scenarios' });
    }
  });
}

// Start the server only when run directly, not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith('scenario-server.mjs')) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mock = process.env.MOCK_AI === '1';
  const token = process.env.SCENARIO_TOKEN;
  if (!mock && !apiKey) {
    console.error('Set ANTHROPIC_API_KEY first (or MOCK_AI=1 for testing).');
    process.exit(1);
  }
  createServer({ apiKey, token, mock }).listen(PORT, '0.0.0.0', () => {
    console.log(`Scenario server on port ${PORT}${mock ? ' (mock mode)' : ''}${token ? ' (token required)' : ''}`);
  });
}
