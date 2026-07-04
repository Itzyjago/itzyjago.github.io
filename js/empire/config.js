/* Central config for The Neon Empire. */

/* Netlify site that hosts the presence function. When the page itself is
   served by Netlify (or `netlify dev`), same-origin is used automatically;
   on itzyjago.github.io the heartbeats go cross-origin to this site. */
export const NETLIFY_SITE = 'https://carloditalo.netlify.app';

export const PRESENCE_API = (() => {
  const h = location.hostname;
  if (h.endsWith('.netlify.app') || h === 'localhost' || h === '127.0.0.1') {
    return '/api/presence';
  }
  return NETLIFY_SITE ? `${NETLIFY_SITE.replace(/\/$/, '')}/api/presence` : '';
})();

export const HEARTBEAT_MS = 12_000;

export const PALETTE = {
  void: 0x07080d,
  teal: 0x36f1cd,
  purple: 0x7c5cff,
  ember: 0xff8a5c,      /* warm accent — reserved for live humans */
  paper: 0xe8ecf8,
};

export const SECTIONS = ['hero', 'services', 'about', 'projects', 'skills', 'contact'];

export const STOP_META = [
  { id: 'hero',     num: '01', en: 'ARRIVAL' },
  { id: 'services', num: '02', en: 'MARKET ST' },
  { id: 'about',    num: '03', en: 'HQ TOWER' },
  { id: 'projects', num: '04', en: 'EMPIRE DISTRICT' },
  { id: 'skills',   num: '05', en: 'THE STRUCTURE' },
  { id: 'contact',  num: '06', en: 'ROOFTOP' },
];
