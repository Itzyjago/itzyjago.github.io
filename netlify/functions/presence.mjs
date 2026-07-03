/* Neon Empire — presence API (Netlify Function, Blobs-backed)
   POST {id, sec, dev, bro, ref}        -> heartbeat, returns {n}
   POST {id, bye:true}                  -> departure, returns {ok}
   GET                                  -> {n}
   GET ?key=<PRESENCE_DASHBOARD_KEY>    -> {n, visitors:[...]}   */
import { getStore } from '@netlify/blobs';

const WINDOW_MS = 45_000;
const SECTIONS = ['hero', 'services', 'about', 'projects', 'skills', 'contact'];
const ORIGIN_OK = /^(https:\/\/itzyjago\.github\.io|https:\/\/[a-z0-9-]+\.netlify\.app|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

/* In-memory fallback so `netlify dev` (and any Blobs hiccup) still works. */
const mem = new Map();
const memStore = {
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async get(key) { return mem.get(key) ?? null; },
  async setJSON(key, value) { mem.set(key, value); },
  async delete(key) { mem.delete(key); },
};

async function openStore() {
  try {
    const s = getStore({ name: 'presence', consistency: 'strong' });
    await s.list();
    return s;
  } catch {
    return memStore;
  }
}

async function readRoster(s) {
  const now = Date.now();
  const roster = [];
  const { blobs } = await s.list();
  for (const { key } of blobs) {
    let v = null;
    try { v = await s.get(key, { type: 'json' }); } catch { /* skip */ }
    if (!v || typeof v.t !== 'number' || now - v.t > WINDOW_MS || v.t - now > 60_000) {
      try { await s.delete(key); } catch { /* skip */ }
      continue;
    }
    roster.push({ id: key, ...v });
  }
  roster.sort((a, b) => a.first - b.first);
  return roster;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'access-control-allow-origin': ORIGIN_OK.test(origin) ? origin : 'https://itzyjago.github.io',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'content-type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const s = await openStore();

  if (req.method === 'POST') {
    let body;
    try {
      const text = await req.text();
      if (text.length > 1024) throw new Error('too large');
      body = JSON.parse(text);
    } catch {
      return json({ error: 'bad request' }, 400, headers);
    }
    const id = String(body.id || '');
    if (!/^[a-f0-9]{6,16}$/.test(id)) return json({ error: 'bad id' }, 400, headers);

    if (body.bye === true) {
      try { await s.delete(id); } catch { /* skip */ }
      return json({ ok: true }, 200, headers);
    }

    let prev = null;
    try { prev = await s.get(id, { type: 'json' }); } catch { /* skip */ }
    const geo = context?.geo || {};
    const entry = {
      t: Date.now(),
      first: (prev && prev.first) || Date.now(),
      sec: SECTIONS.includes(body.sec) ? body.sec : 'hero',
      dev: body.dev === 'mobile' ? 'mobile' : 'desktop',
      bro: String(body.bro || '').slice(0, 24),
      ref: String(body.ref || '').slice(0, 128),
      cc: (geo.country && geo.country.code) || '',
      country: (geo.country && geo.country.name) || '',
      city: geo.city || '',
    };
    try { await s.setJSON(id, entry); } catch { /* skip */ }
    const roster = await readRoster(s).catch(() => []);
    return json({ n: Math.max(roster.length, 1) }, 200, headers);
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const roster = await readRoster(s).catch(() => []);
    const key = url.searchParams.get('key');
    if (key !== null) {
      const want = process.env.PRESENCE_DASHBOARD_KEY;
      if (!want || key !== want) return json({ error: 'forbidden' }, 403, headers);
      return json({ n: roster.length, visitors: roster }, 200, headers);
    }
    return json({ n: roster.length }, 200, headers);
  }

  return json({ error: 'not found' }, 404, headers);
};

export const config = { path: '/api/presence' };
