/* Live-presence client. Heartbeats to the Netlify function; exposes the
   current "in the district" count. Silently no-ops when unreachable. */
import { PRESENCE_API, HEARTBEAT_MS } from './config.js';

const id = Array.from(crypto.getRandomValues(new Uint8Array(6)))
  .map((b) => b.toString(16).padStart(2, '0')).join('');

const ua = navigator.userAgent;
const dev = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
const bro =
  /Edg\//.test(ua) ? 'Edge' :
  /OPR\//.test(ua) ? 'Opera' :
  /Firefox\//.test(ua) ? 'Firefox' :
  /Chrome\//.test(ua) ? 'Chrome' :
  /Safari\//.test(ua) ? 'Safari' : 'Other';

let ref = 'direct';
try { if (document.referrer) ref = new URL(document.referrer).hostname || 'direct'; } catch { /* keep default */ }

let section = 'hero';
let count = 0;
let failures = 0;
let disabled = !PRESENCE_API;
const listeners = new Set();

function emit() { listeners.forEach((fn) => fn(count)); }

async function beat() {
  if (disabled) return;
  try {
    const res = await fetch(PRESENCE_API, {
      method: 'POST',
      /* text/plain keeps the request "simple" — no CORS preflight */
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ id, sec: section, dev, bro, ref }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (typeof data.n === 'number') { count = data.n; failures = 0; emit(); }
  } catch {
    if (++failures >= 3) { disabled = true; count = 0; emit(); }
  }
}

export function setSection(sec) {
  if (sec !== section) { section = sec; beat(); }
}

/** Subscribe to live count changes; fires immediately with current value. */
export function onCount(fn) { listeners.add(fn); fn(count); }

export function start() {
  if (disabled) return;
  beat();
  setInterval(beat, HEARTBEAT_MS);
  addEventListener('pagehide', () => {
    try { navigator.sendBeacon(PRESENCE_API, JSON.stringify({ id, bye: true })); } catch { /* best effort */ }
  });
}
