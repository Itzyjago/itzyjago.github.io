/* Neon Empire — presence API (Netlify Function, Blobs-backed)
   POST {id, sec, dev, bro, ref}        -> heartbeat, returns {n}
   POST {id, bye:true}                  -> departure, returns {ok}
   GET                                  -> {n}
   GET + X-Dashboard-Key header (or ?key=) -> {n, visitors:[...]}   */
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

const WINDOW_MS = 45_000;
const MAX_ROSTER = 250; /* flood cap: beyond this, new ids are counted but not stored */
const SECTIONS = ['hero', 'services', 'about', 'projects', 'skills', 'contact'];
/* pinned origins: the GitHub Pages site, this Netlify site (+ its deploy
   previews, `<slug>--carloditalo`), and local dev */
const ORIGIN_OK = /^(https:\/\/itzyjago\.github\.io|https:\/\/([a-z0-9-]+--)?carloditalo\.netlify\.app|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

/* In-memory fallback so `netlify dev` (and any Blobs hiccup) still works. */
const mem = new Map();
const memStore = {
  async list() { return { blobs: [...mem.keys()].map((key) => ({ key })) }; },
  async get(key) { return mem.get(key) ?? null; },
  async setJSON(key, value) { mem.set(key, value); },
  async delete(key) { mem.delete(key); },
};

/* Probe once per warm instance. In prod, a transient probe failure is NOT
   memoized — falling back to per-instance memory permanently would silently
   split state across lambdas. */
let storeChoice = null;
async function openStore() {
  if (storeChoice) return storeChoice;
  try {
    const s = getStore({ name: 'presence', consistency: 'strong' });
    await s.list();
    storeChoice = s;
    return s;
  } catch {
    if (process.env.NETLIFY_DEV) storeChoice = memStore;
    return memStore;
  }
}

async function readRoster(s) {
  const now = Date.now();
  const { blobs } = await s.list();
  const keys = blobs.slice(0, MAX_ROSTER + 50).map((b) => b.key);
  const vals = await Promise.all(
    keys.map((k) => s.get(k, { type: 'json' }).catch(() => null))
  );
  const roster = [];
  const stale = [];
  keys.forEach((key, i) => {
    const v = vals[i];
    if (!v || typeof v.t !== 'number' || now - v.t > WINDOW_MS || v.t - now > 60_000) {
      stale.push(key);
    } else {
      roster.push({ id: key, ...v });
    }
  });
  await Promise.all(stale.map((k) => s.delete(k).catch(() => {})));
  roster.sort((a, b) => a.first - b.first);
  return roster;
}

function keyMatches(given, want) {
  if (!want || !given) return false;
  const a = createHash('sha256').update(String(given)).digest();
  const b = createHash('sha256').update(String(want)).digest();
  return timingSafeEqual(a, b);
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

export default async (req, context) => {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'access-control-allow-origin': ORIGIN_OK.test(origin) ? origin : 'https://itzyjago.github.io',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, x-dashboard-key',
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

    const roster = await readRoster(s).catch(() => []);
    const known = roster.find((v) => v.id === id) || null;
    if (known || roster.length < MAX_ROSTER) {
      const geo = context?.geo || {};
      const entry = {
        t: Date.now(),
        first: (known && known.first) || Date.now(),
        sec: SECTIONS.includes(body.sec) ? body.sec : 'hero',
        dev: body.dev === 'mobile' ? 'mobile' : 'desktop',
        bro: String(body.bro || '').slice(0, 24),
        ref: String(body.ref || '').slice(0, 128),
        cc: (geo.country && geo.country.code) || '',
        country: (geo.country && geo.country.name) || '',
        city: geo.city || '',
      };
      try { await s.setJSON(id, entry); } catch { /* skip */ }
    }
    return json({ n: Math.max(roster.length + (known ? 0 : 1), 1) }, 200, headers);
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const roster = await readRoster(s).catch(() => []);
    const key = req.headers.get('x-dashboard-key') ?? url.searchParams.get('key');
    if (key !== null) {
      if (!keyMatches(key, process.env.PRESENCE_DASHBOARD_KEY)) {
        return json({ error: 'forbidden' }, 403, headers);
      }
      return json({ n: roster.length, visitors: roster }, 200, headers);
    }
    return json({ n: roster.length }, 200, headers);
  }

  return json({ error: 'not found' }, 404, headers);
};

export const config = { path: '/api/presence' };
