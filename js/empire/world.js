/* The city itself — renderer, atmosphere, ground, skyline, ambient life. */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { windowTexture, makeGlow, makeSign, registerFlicker } from './signage.js';

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(PALETTE.void);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.void, 0.014);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
  camera.position.set(0, 3, 84);

  /* ---- ground + street ---- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshBasicMaterial({ color: 0x04050a, fog: true })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  const grid = new THREE.GridHelper(420, 84, 0x123a36, 0x0d1226);
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  scene.add(grid);

  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 200),
    new THREE.MeshBasicMaterial({ color: 0x070912, fog: true })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.01, -5);
  scene.add(street);

  for (const x of [-6.6, 6.6]) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 200),
      new THREE.MeshBasicMaterial({
        color: x < 0 ? PALETTE.teal : PALETTE.purple,
        transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
      })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.02, -5);
    scene.add(strip);
  }

  /* ---- horizon glow (city haze) ---- */
  [[-70, 26, -120, PALETTE.teal, 90], [60, 22, -110, PALETTE.purple, 110], [0, 18, 130, PALETTE.purple, 100]]
    .forEach(([x, y, z, color, size]) => {
      const g = makeGlow(new THREE.Color(color), size, 0.09);
      g.position.set(x, y, z);
      scene.add(g);
    });

  /* ---- skyline: far silhouettes + mid lit blocks ---- */
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);

  const far = new THREE.InstancedMesh(
    boxGeo, new THREE.MeshBasicMaterial({ color: 0x0a0e1a, fog: true }), 220
  );
  const mid = new THREE.InstancedMesh(
    boxGeo, new THREE.MeshBasicMaterial({ map: windowTexture(1), fog: true }), 90
  );

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  const rnd = seededRand(20260704);

  for (let i = 0; i < 220; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 75 + rnd() * 65;
    eu.set(0, rnd() * Math.PI, 0);
    m.compose(
      new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r - 10),
      q.setFromEuler(eu),
      new THREE.Vector3(5 + rnd() * 8, 14 + rnd() * 42, 5 + rnd() * 8)
    );
    far.setMatrixAt(i, m);
  }

  const tint = new THREE.Color();
  for (let i = 0; i < 90; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (16 + rnd() * 40);
    const z = -95 + rnd() * 185;
    eu.set(0, rnd() < 0.5 ? 0 : Math.PI / 2, 0);
    m.compose(
      new THREE.Vector3(x, 0, z),
      q.setFromEuler(eu),
      new THREE.Vector3(4 + rnd() * 5, 6 + rnd() * 22, 4 + rnd() * 5)
    );
    mid.setMatrixAt(i, m);
    const pick = rnd();
    tint.set(pick < 0.6 ? 0x9aa8cc : pick < 0.8 ? 0x36f1cd : 0x7c5cff);
    tint.multiplyScalar(0.55 + rnd() * 0.45);
    mid.setColorAt(i, tint);
  }
  mid.instanceColor.needsUpdate = true;
  scene.add(far, mid);

  /* ---- arrival canyon: tight building rows flanking the entry street ---- */
  const canyon = new THREE.InstancedMesh(
    boxGeo, new THREE.MeshBasicMaterial({ map: windowTexture(2), fog: true }), 26
  );
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? -1 : 1;
    const z = 10 + (i >> 1) * 6.2 + rnd() * 2;
    eu.set(0, rnd() < 0.5 ? 0 : Math.PI / 2, 0);
    m.compose(
      new THREE.Vector3(side * (11.5 + rnd() * 3.5), 0, z),
      q.setFromEuler(eu),
      new THREE.Vector3(4.5 + rnd() * 3, 8 + rnd() * 15, 4.5 + rnd() * 3)
    );
    canyon.setMatrixAt(i, m);
    const pick = rnd();
    tint.set(pick < 0.55 ? 0x9aa8cc : pick < 0.8 ? 0x36f1cd : 0x7c5cff);
    tint.multiplyScalar(0.5 + rnd() * 0.5);
    canyon.setColorAt(i, tint);
  }
  canyon.instanceColor.needsUpdate = true;
  scene.add(canyon);

  /* ---- holographic billboards on the canyon walls ---- */
  const ads = [
    { text: 'SHIPS TO PRODUCTION', sub: 'EVERY WEEK', color: '#a894ff', x: -10.8, y: 12, z: 48 },
    { text: 'HIRE ME →',           sub: 'FREELANCE · FULL-TIME', color: '#36f1cd', x: 10.8, y: 9.5, z: 38 },
    { text: 'AI · AUTOMATION',     sub: 'CLAUDE API', color: '#36f1cd', x: -10.8, y: 8, z: 66 },
    { text: 'END-TO-END',          sub: 'SCOPING → DELIVERY', color: '#ff8a5c', x: 10.8, y: 13, z: 56 },
  ];
  for (const a of ads) {
    const s = makeSign(a.text, { color: a.color, sub: a.sub, height: 1.5 });
    s.position.set(a.x, a.y, a.z);
    s.rotation.y = a.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    if (Math.random() < 0.6) registerFlicker(s.material);
    scene.add(s);
  }

  /* ---- overhead cables with hanging bulbs across the street ---- */
  const bulbCols = [0x36f1cd, 0x7c5cff, 0xdfe6ff];
  [70, 52, 37, 27, 12].forEach((z, ci) => {
    const from = new THREE.Vector3(-7.2, 6.6 + (ci % 2) * 0.5, z);
    const to = new THREE.Vector3(7.2, 6.4 + ((ci + 1) % 2) * 0.5, z);
    const midPt = from.clone().lerp(to, 0.5); midPt.y -= 1.1;
    const curvePts = new THREE.QuadraticBezierCurve3(from, midPt, to).getPoints(16);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
    scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x1a2233, fog: true })));
    for (let bi = 2; bi < 15; bi += 3) {
      const bulb = makeGlow(new THREE.Color(bulbCols[(ci + bi) % 3]), 0.9, 0.75);
      bulb.position.copy(curvePts[bi]);
      bulb.position.y -= 0.18;
      scene.add(bulb);
    }
  });

  /* ---- stars ---- */
  {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 120 + rnd() * 180;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 40 + rnd() * 160;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xaebcdb, size: 1.4, sizeAttenuation: false,
      transparent: true, opacity: 0.65, depthWrite: false, fog: false,
    }));
    scene.add(stars);
  }

  /* ---- drifting dust / light rain ---- */
  const dustN = 380;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = -40 + rnd() * 80;
    dustPos[i * 3 + 1] = rnd() * 42;
    dustPos[i * 3 + 2] = -100 + rnd() * 195;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x9fb4ff, size: 0.07, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  }));
  scene.add(dust);

  /* ---- lazy air traffic ---- */
  const craft = [];
  const craftCols = [PALETTE.teal, PALETTE.ember, PALETTE.purple, 0xdfe6ff];
  for (let i = 0; i < 4; i++) {
    const g = makeGlow(new THREE.Color(craftCols[i]), 1.6, 0.8);
    scene.add(g);
    craft.push({ s: g, r: 40 + i * 14, y: 26 + i * 6, sp: 0.05 + i * 0.016, ph: i * 1.9 });
  }

  function update(t, dt) {
    /* dust falls slowly and wraps */
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < dustN; i++) {
      p[i * 3 + 1] -= dt * 1.1;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 42;
    }
    dustGeo.attributes.position.needsUpdate = true;

    for (const c of craft) {
      const a = t * c.sp + c.ph;
      c.s.position.set(Math.cos(a) * c.r, c.y + Math.sin(t * 0.7 + c.ph) * 1.5, Math.sin(a) * c.r - 10);
      c.s.material.opacity = 0.5 + 0.4 * Math.sin(t * 2.2 + c.ph);
    }
  }

  function setQuality(low) {
    renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 2));
    dust.visible = !low;
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }

  return { renderer, scene, camera, update, resize, setQuality };
}
