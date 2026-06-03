import { Groq } from 'groq-sdk';
import { promises as fs } from 'fs';
import { join } from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
let client: Groq | null = null;

function getGroq(): Groq {
  if (!client) {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set. Get one at https://console.groq.com');
    client = new Groq({ apiKey: GROQ_API_KEY });
  }
  return client;
}

export async function loadPrompt(name: string): Promise<string> {
  try {
    const p = join(process.cwd(), 'prompts', `${name}.md`);
    return await fs.readFile(p, 'utf-8');
  } catch { return ''; }
}

export async function callGroq(system: string, user: string) {
  const groq = getGroq();
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

export async function callGroqText(system: string, user: string) {
  const groq = getGroq();
  const resp = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.1, max_tokens: 4096,
  });
  return { answer: resp.choices[0]?.message?.content || '', tokens_used: resp.usage?.total_tokens || 0 };
}
