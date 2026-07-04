/* Districts: proximity zones that open each portfolio panel while driving. */

export const DISTRICTS = [
  { id: 'hero',     x: 0,   z: 82,  r: 13, heading: Math.PI },        /* spawn / arrival */
  { id: 'services', x: 0,   z: 28,  r: 14, heading: Math.PI },        /* market street */
  { id: 'about',    x: -7,  z: 2,   r: 11, heading: Math.PI * 0.75 }, /* HQ pagoda plaza */
  { id: 'projects', x: 0,   z: -29, r: 18, heading: Math.PI },        /* empire district */
  { id: 'skills',   x: 6,   z: -53, r: 13, heading: Math.PI * 1.15 }, /* construction site */
  { id: 'contact',  x: 0,   z: -74, r: 12, heading: Math.PI },        /* beacon plaza */
];

const EXIT_PAD = 3.5; /* hysteresis so panels don't flicker at the border */

export function createDistricts(onChange) {
  let current = null;

  function update(pos) {
    if (current) {
      const d = DISTRICTS.find((x) => x.id === current);
      if (Math.hypot(pos.x - d.x, pos.z - d.z) <= d.r + EXIT_PAD) {
        /* still inside (with pad) — but let a *nearer* district steal focus */
        let best = null;
        let bestDist = Infinity;
        for (const q of DISTRICTS) {
          const dd = Math.hypot(pos.x - q.x, pos.z - q.z);
          if (dd <= q.r && dd < bestDist) { best = q.id; bestDist = dd; }
        }
        if (best && best !== current) { current = best; onChange(current); }
        return current;
      }
      current = null;
      onChange(null);
    }
    for (const q of DISTRICTS) {
      if (Math.hypot(pos.x - q.x, pos.z - q.z) <= q.r) {
        current = q.id;
        onChange(current);
        break;
      }
    }
    return current;
  }

  return { update, get current() { return current; } };
}
