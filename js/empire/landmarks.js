/* District landmarks: every portfolio section built as a place in the city. */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { makeSign, makeVerticalSign, makeGlow, windowTexture, registerFlicker } from './signage.js';

const TEAL = '#36f1cd';
const PURPLE = '#a894ff';
const EMBER = '#ff8a5c';

function box(w, h, d, color, opts = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ color, fog: true, ...opts })
  );
}

function litBuilding(w, h, d, variant, tintHex = 0x9aa8cc) {
  const tex = windowTexture(variant);
  tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 10)));
  const side = new THREE.MeshBasicMaterial({ map: tex, color: tintHex, fog: true });
  const cap = new THREE.MeshBasicMaterial({ color: 0x070a12, fog: true });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, cap, cap, side, side]);
  mesh.position.y = h / 2;
  return mesh;
}

function neonTrim(w, d, y, color, group) {
  const mat = new THREE.MeshBasicMaterial({ color, fog: true });
  const t = 0.09;
  const front = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), mat);
  front.position.set(0, y, d / 2);
  const back = front.clone(); back.position.z = -d / 2;
  const left = new THREE.Mesh(new THREE.BoxGeometry(t, t, d), mat);
  left.position.set(-w / 2, y, 0);
  const right = left.clone(); right.position.x = w / 2;
  group.add(front, back, left, right);
}

/* ---------- torii gate (arrival) ---------- */
function buildTorii() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x2a0d16, fog: true });

  for (const x of [-5.2, 5.2]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 8.2, 12), bodyMat);
    pillar.position.set(x, 4.1, 0);
    g.add(pillar);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 8.2, 6),
      new THREE.MeshBasicMaterial({ color: PALETTE.teal, fog: true })
    );
    tube.position.set(x - Math.sign(x) * 0.5, 4.1, 0);
    g.add(tube);
  }

  const kasagi = box(13.4, 0.6, 0.9, 0x1c0a12);
  kasagi.position.y = 8.5;
  const kasagiTop = box(14.2, 0.3, 1.05, 0x1c0a12);
  kasagiTop.position.y = 8.95;
  const shimaki = box(11, 0.42, 0.7, 0x1c0a12);
  shimaki.position.y = 7.5;
  g.add(kasagi, kasagiTop, shimaki);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(14.2, 0.07, 0.07),
    new THREE.MeshBasicMaterial({ color: PALETTE.teal, fog: true })
  );
  trim.position.set(0, 9.12, 0.5);
  g.add(trim, ((t) => { t = trim.clone(); t.position.z = -0.5; return t; })());

  /* hanging sign */
  const sign = makeSign('THE NEON EMPIRE', { color: TEAL, sub: 'EST. 2024 · POPULATION: 1 BUILDER', height: 1.15 });
  sign.position.set(0, 6.1, 0.1);
  registerFlicker(sign.material);
  g.add(sign);
  const glow = makeGlow(new THREE.Color(PALETTE.teal), 7, 0.28);
  glow.position.set(0, 6, 0.4);
  g.add(glow);

  g.position.set(0, 0, 58);
  return g;
}

/* ---------- services shōtengai (market street) ---------- */
function buildServicesStreet() {
  const g = new THREE.Group();
  const stalls = [
    { jp: 'CODE', x: -5.4, z: 34, color: TEAL },
    { jp: 'AI',   x: 5.4,  z: 30, color: PURPLE },
    { jp: 'API',  x: -5.4, z: 26, color: PURPLE },
    { jp: 'DATA', x: 5.4,  z: 22, color: TEAL },
  ];
  for (const s of stalls) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x1a2030, fog: true })
    );
    pole.position.set(s.x, 2.3, s.z);
    g.add(pole);

    const sign = makeVerticalSign(s.jp, { color: s.color, height: 3.1 });
    sign.position.set(s.x + (s.x < 0 ? 0.62 : -0.62), 2.75, s.z);
    sign.rotation.y = s.x < 0 ? Math.PI / 2.4 : -Math.PI / 2.4;
    if (Math.random() < 0.5) registerFlicker(sign.material);
    g.add(sign);

    const awning = box(2.1, 0.12, 1.5, 0x11141f);
    awning.position.set(s.x + (s.x < 0 ? 0.4 : -0.4), 2.0, s.z);
    g.add(awning);
    const lamp = makeGlow(new THREE.Color(s.color), 1.6, 0.5);
    lamp.position.set(s.x, 4.4, s.z);
    g.add(lamp);
  }
  return g;
}

/* ---------- HQ pagoda (about) ---------- */
function buildPagoda() {
  const g = new THREE.Group();
  const widths = [7.2, 6.2, 5.2, 4.2, 3.2];
  let y = 0;
  widths.forEach((w, i) => {
    const body = litBuilding(w, 2.3, w, 3 + i, 0xb39aff);
    body.position.y = y + 1.15;
    g.add(body);
    y += 2.3;
    const roof = box(w + 2.2, 0.26, w + 2.2, 0x0c0f1c);
    roof.position.y = y + 0.13;
    g.add(roof);
    neonTrim(w + 2.2, w + 2.2, y + 0.13, i % 2 ? PALETTE.teal : PALETTE.purple, g);
    y += 0.26;
  });
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 2.4, 8),
    new THREE.MeshBasicMaterial({ color: 0x36f1cd, fog: true })
  );
  spire.position.y = y + 1.2;
  g.add(spire);
  const tip = makeGlow(new THREE.Color(PALETTE.teal), 2.4, 0.7);
  tip.position.y = y + 2.4;
  g.add(tip);

  const hq = makeSign('CARLO HQ', { color: TEAL, sub: 'QUEZON CITY · PHILIPPINES', height: 1.25 });
  hq.position.set(5.6, 6.4, 3.2);
  hq.rotation.y = Math.PI / 7;
  g.add(hq);

  g.position.set(-13, 0, 2);
  return g;
}

/* ---------- the empire district (projects) ---------- */
function buildProjects(updaters) {
  const g = new THREE.Group();
  const projects = [
    { name: 'GROWTHOS',   x: -11,  z: -26, w: 9,   h: 26, live: true,  color: TEAL,   v: 11 },
    { name: 'MERIDIAN',   x: 10.5, z: -33, w: 8,   h: 22, live: true,  color: PURPLE, v: 12 },
    { name: 'IDS',        x: -10.5, z: -40, w: 8,  h: 24, live: true,  color: TEAL,   v: 13 },
    { name: 'TALENTFLOW', x: 9.5,  z: -18, w: 7,   h: 11, live: false, color: PURPLE, v: 14 },
    { name: 'EMPOWERED',  x: -9.5, z: -12, w: 6,   h: 9,  live: false, color: PURPLE, v: 15 },
    { name: 'HOPE IS',    x: 10,   z: -46, w: 7,   h: 10, live: false, color: TEAL,   v: 16 },
  ];
  for (const p of projects) {
    const b = litBuilding(p.w, p.h, p.w, p.v);
    b.position.set(p.x, p.h / 2, p.z);
    g.add(b);

    const facing = p.x < 0 ? 1 : -1; /* face the street */
    const sign = makeSign(p.name, { color: p.color, height: 1.5 });
    sign.position.set(p.x + facing * (p.w / 2 + 0.12), p.h * 0.72, p.z);
    sign.rotation.y = facing * Math.PI / 2;
    registerFlicker(sign.material);
    g.add(sign);

    /* door glow at street level */
    const door = makeGlow(new THREE.Color(p.color), 2.2, 0.3);
    door.position.set(p.x + facing * (p.w / 2), 1, p.z);
    g.add(door);

    /* antenna + beacon on live platforms */
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6),
      new THREE.MeshBasicMaterial({ color: 0x223, fog: true })
    );
    ant.position.set(p.x, p.h + 1.3, p.z);
    g.add(ant);
    if (p.live) {
      const live = makeSign('· LIVE ·', { color: EMBER, height: 0.62, glow: 3.4 });
      live.position.set(p.x + facing * (p.w / 2 + 0.12), p.h * 0.9, p.z);
      live.rotation.y = facing * Math.PI / 2;
      g.add(live);
      const blink = makeGlow(new THREE.Color(PALETTE.ember), 1.5, 0.9);
      blink.position.set(p.x, p.h + 2.7, p.z);
      g.add(blink);
      const phase = Math.random() * 6;
      updaters.push((t) => { blink.material.opacity = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.4 + phase)); });
    }
  }
  return g;
}

/* ---------- under construction (skills) ---------- */
function buildConstruction(updaters) {
  const g = new THREE.Group();
  const steel = new THREE.MeshBasicMaterial({ color: 0xffb347, fog: true });
  const brace = new THREE.MeshBasicMaterial({ color: 0x36f1cd, fog: true });
  const W = 10, LEVELS = 5, LH = 3.4;

  /* columns */
  for (const cx of [-W / 2, 0, W / 2]) {
    for (const cz of [-W / 2, 0, W / 2]) {
      if (cx === 0 && cz === 0) continue;
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, LEVELS * LH, 0.18), steel);
      col.position.set(cx, LEVELS * LH / 2, cz);
      g.add(col);
    }
  }
  /* perimeter beams per level + a few diagonals */
  for (let l = 1; l <= LEVELS; l++) {
    const y = l * LH;
    for (const [w, d, x, z] of [[W, 0.16, 0, -W / 2], [W, 0.16, 0, W / 2], [0.16, W, -W / 2, 0], [0.16, W, W / 2, 0]]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.16, d + 0.16), steel);
      beam.position.set(x, y, z);
      g.add(beam);
    }
    if (l % 2) {
      const diag = new THREE.Mesh(new THREE.BoxGeometry(0.1, Math.hypot(LH, W) * 0.98, 0.1), brace);
      diag.position.set(-W / 2, y - LH / 2, 0);
      diag.rotation.x = Math.atan2(W, LH);
      g.add(diag);
    }
  }

  /* skill tags hung on the frame */
  const skills = [
    ['PHP · LARAVEL', TEAL], ['NEXT.JS', PURPLE], ['REACT', TEAL], ['PYTHON · FASTAPI', PURPLE],
    ['MYSQL', TEAL], ['NOCODB', PURPLE], ['CLAUDE API', EMBER], ['DOCKER', TEAL],
    ['TAILWIND', PURPLE], ['KEYCLOAK SSO', TEAL],
  ];
  skills.forEach(([label, color], i) => {
    const s = makeSign(label, { color, height: 0.6, glow: 2 });
    const side = i % 4;
    const lvl = 1 + (i % LEVELS);
    const off = -W / 2 + 1.6 + (i * 2.1) % (W - 3);
    if (side === 0) s.position.set(off, lvl * LH - 0.9, -W / 2 - 0.1);
    else if (side === 1) { s.position.set(-W / 2 - 0.1, lvl * LH - 0.9, off); s.rotation.y = Math.PI / 2; }
    else if (side === 2) s.position.set(off, lvl * LH - 0.9, W / 2 + 0.1);
    else { s.position.set(W / 2 + 0.1, lvl * LH - 0.9, off); s.rotation.y = -Math.PI / 2; }
    g.add(s);
  });

  /* crane */
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 24, 0.5), steel);
  mast.position.set(W / 2 + 3, 12, -W / 2 - 2);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 0.4), steel);
  jib.position.set(W / 2 + 3 - 4.5, 23.4, -W / 2 - 2);
  const cable = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 6, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x334, fog: true })
  );
  cable.position.set(W / 2 - 4, 20.4, -W / 2 - 2);
  g.add(mast, jib, cable);
  const warn = makeGlow(new THREE.Color(0xff4b4b), 1.3, 0.9);
  warn.position.set(W / 2 + 3, 24.3, -W / 2 - 2);
  g.add(warn);
  updaters.push((t) => { warn.material.opacity = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(t * 3.1)); });

  /* floating hologram */
  const holo = makeSign('UNDER CONSTRUCTION', { color: '#ffb347', sub: 'ALWAYS LEARNING · ALWAYS BUILDING', height: 1.2 });
  holo.position.set(0, LEVELS * LH + 3.4, 0);
  g.add(holo);
  updaters.push((t) => { holo.position.y = LEVELS * LH + 3.4 + Math.sin(t * 0.8) * 0.3; holo.rotation.y = t * 0.25; });

  g.position.set(14, 0, -62);
  return g;
}

/* ---------- rooftop beacon (contact) ---------- */
function buildBeaconTower(updaters) {
  const g = new THREE.Group();
  const tower = litBuilding(12, 30, 12, 21, 0x8fa0c8);
  g.add(tower);

  const lip = box(12.8, 0.5, 12.8, 0x0c0f1c);
  lip.position.y = 30.25;
  g.add(lip);
  neonTrim(12.8, 12.8, 30.5, PALETTE.teal, g);

  const penthouse = litBuilding(4, 2.6, 4, 22, 0x8fa0c8);
  penthouse.position.set(-3, 0, -3);
  penthouse.position.y = 30.5 + 1.3;
  penthouse.position.x = -3;
  penthouse.position.z = -3;
  g.add(penthouse);

  /* the beacon */
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.2, 10),
    new THREE.MeshBasicMaterial({ color: 0x131828, fog: true })
  );
  base.position.set(2.5, 31.1, 2.5);
  g.add(base);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 2.6, 70, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: PALETTE.teal, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    })
  );
  beam.position.set(2.5, 31.7 + 35, 2.5);
  g.add(beam);
  const core = makeGlow(new THREE.Color(PALETTE.teal), 5, 0.85);
  core.position.set(2.5, 32, 2.5);
  g.add(core);
  updaters.push((t) => {
    core.material.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6));
    beam.material.opacity = 0.07 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.6));
    beam.rotation.y = t * 0.4;
  });

  const sign = makeSign("LET'S BUILD", { color: TEAL, sub: 'ROOFTOP · GET IN TOUCH', height: 1.3 });
  sign.position.set(-2.5, 34.4, 3.5);
  sign.rotation.y = Math.PI / 16;
  g.add(sign);

  g.position.set(0, 0, -86);
  return g;
}

/* ---------- camera stops ---------- */
export const STOPS = [
  { id: 'hero',     cam: [0, 3.0, 84],   look: [0, 6.5, 40] },
  { id: 'services', cam: [0, 2.9, 42],   look: [0, 3.4, 22] },
  { id: 'about',    cam: [1.5, 3.6, 14], look: [-13, 7.5, 2] },
  { id: 'projects', cam: [0.5, 5.2, -4], look: [-3, 11, -30] },
  { id: 'skills',   cam: [2, 6, -49],    look: [14, 9.5, -62] },
  { id: 'contact',  cam: [0, 34, -64],   look: [2, 31.5, -84] },
];

/* mid-waypoints between stops keep the flight on the street */
export const WAYPOINTS = [
  [0, 3.2, 61],    /* through the torii */
  [0.8, 3.1, 26],
  [1.2, 4.2, 6],
  [1.4, 5.4, -30],
  [3.5, 18, -54],  /* the ascent */
];

export function buildLandmarks() {
  const updaters = [];
  const group = new THREE.Group();
  group.add(
    buildTorii(),
    buildServicesStreet(),
    buildPagoda(),
    buildProjects(updaters),
    buildConstruction(updaters),
    buildBeaconTower(updaters)
  );
  return { group, updaters };
}
