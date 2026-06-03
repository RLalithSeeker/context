import { Groq } from 'groq-sdk';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Per-request Groq key store (bring-your-own-key).
 * Each request runs inside keyStore.run(userKey, ...). The server holds NO key of
 * its own — AI tools use only the caller's key, used for that single request and
 * never persisted or logged. Non-AI tools (scrape/crawl/fonts/logo) need no key.
 */
export const keyStore = new AsyncLocalStorage<string>();

function resolveKey(explicit?: string): string {
  const key = (explicit || keyStore.getStore() || '').trim();
  if (!key) {
    throw new Error(
      'Groq API key required for AI tools. Get a free key at https://console.groq.com/keys, ' +
      'then pass it via the "apiKey" field (REST body) or the "x-groq-key" header (REST/MCP). ' +
      'Your key is used only for this request and is never stored. ' +
      'Scraping tools (scrape, crawl, sitemap, images, fonts, logo) need no key.'
    );
  }
  return key;
}

function getGroq(apiKey?: string): Groq {
  return new Groq({ apiKey: resolveKey(apiKey) });
}

export async function loadPrompt(name: string): Promise<string> {
  try {
    const p = join(process.cwd(), 'prompts', `${name}.md`);
    return await fs.readFile(p, 'utf-8');
  } catch { return ''; }
}

export async function callGroq(system: string, user: string, apiKey?: string) {
  const groq = getGroq(apiKey);
  const resp = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.1, max_tokens: 4096,
    response_format: { type: 'json_object' },
  });
  const raw = resp.choices[0]?.message?.content || '';
  const tokens = resp.usage?.total_tokens || 0;
  let parsed: any;
  try {
    const jsonStr = raw.replace(/```(?:json)?\s*|\s*```/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch { try { parsed = JSON.parse(raw); } catch { parsed = raw; } }
  return { data: parsed, tokens_used: tokens };
}

export async function callGroqText(system: string, user: string, apiKey?: string) {
  const groq = getGroq(apiKey);
  const resp = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.1, max_tokens: 4096,
  });
  return { answer: resp.choices[0]?.message?.content || '', tokens_used: resp.usage?.total_tokens || 0 };
}
