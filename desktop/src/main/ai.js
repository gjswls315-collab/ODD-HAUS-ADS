'use strict';

// AI 말투 변환: rewrites one of the app's own reminder lines in a friend's voice.
// Only runs when the user turned it on and entered their own Anthropic API key, and only ever
// sends the canned line and the friend's description, never anything the user typed.

const Anthropic = require('@anthropic-ai/sdk');
const cast = require('../shared/cast.json');

const SYSTEM = [
  '너는 바탕화면에 사는 작은 캐릭터의 대사 작가야.',
  '주어진 문장을 캐릭터의 말투로 바꿔 써. 뜻은 그대로 두고, 한국어 한 줄, 40자 이내.',
  '따옴표나 설명 없이 바뀐 대사만 출력해. 이모지는 원래 문장에 있을 때만 하나까지.',
].join('\n');

// The server-side refusal fallback is available on these models (Claude API).
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

const cache = new Map();

function clean(text, original) {
  const line = String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean);
  if (!line) return original;
  const unquoted = line.replace(/^["'“‘「]+|["'”’」]+$/g, '').trim();
  return unquoted.length > 60 ? `${unquoted.slice(0, 58)}…` : unquoted || original;
}

/**
 * @returns {Promise<string>} the line in the friend's voice, or the original line on any failure
 */
async function restyle({ apiKey, model, friend, text }) {
  const who = cast.friends[friend];
  if (!apiKey || !who) return text;
  const key = `${model}|${friend}|${text}`;
  if (cache.has(key)) return cache.get(key);

  const client = new Anthropic({ apiKey, timeout: 20000, maxRetries: 1 });
  const params = {
    model,
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `캐릭터: ${who.ko}(${who.name}) — ${who.what}. ${who.persona}\n원래 문장: ${text}`,
      },
    ],
  };
  const res = FALLBACK_MODELS.has(model)
    ? await client.beta.messages.create({
        ...params,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })
    : await client.messages.create(params);

  if (res.stop_reason === 'refusal') return text;
  const out = clean(
    res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(''),
    text,
  );
  if (cache.size > 300) cache.clear();
  cache.set(key, out);
  return out;
}

/** Same as restyle, but never throws: falls back to the original line. */
async function restyleSafe(opts) {
  try {
    return await restyle(opts);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.warn('[ai] API key was rejected');
    else if (err instanceof Anthropic.RateLimitError) console.warn('[ai] rate limited');
    else if (err instanceof Anthropic.APIError) console.warn(`[ai] API error ${err.status}`);
    else console.warn('[ai] request failed:', err && err.message);
    return opts.text;
  }
}

module.exports = { restyle, restyleSafe, clean };
