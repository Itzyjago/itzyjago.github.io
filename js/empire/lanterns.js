/* The signature: every live visitor is a warm paper lantern drifting
   through the cold neon city. */
import * as THREE from 'three';
import { makeGlow } from './signage.js';

const MAX_LANTERNS = 24;

function lanternTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#ffb047');
  g.addColorStop(0.5, '#ff8a5c');
  g.addColorStop(1, '#c94f35');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  /* ribs */
  ctx.strokeStyle = 'rgba(60,15,10,0.5)';
  ctx.lineWidth = 2;
  for (let y = 8; y < 64; y += 12) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export function createLanterns(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const bodyGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.55, 10, 1, true);
  const capGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.08, 8);
  const capMat = new THREE.MeshBasicMaterial({ color: 0x140a08, fog: true });
  const tex = lanternTexture();

  const rnd = seededRand(11072026);
  const lanterns = [];
  for (let i = 0; i < MAX_LANTERNS; i++) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshBasicMaterial({
      map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0, fog: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const top = new THREE.Mesh(capGeo, capMat.clone());
    top.material.transparent = true; top.material.opacity = 0;
    top.position.y = 0.31;
    const bottom = top.clone();
    bottom.rotation.x = Math.PI;
    bottom.position.y = -0.31;
    const glow = makeGlow(new THREE.Color(0xff9a62), 2.2, 0);
    g.add(body, top, bottom, glow);

    /* scatter along the street, above head height */
    g.position.set(
      -4.5 + rnd() * 9,
      4 + rnd() * 6,
      78 - (i / MAX_LANTERNS) * 165 + rnd() * 5
    );
    g.visible = false;
    group.add(g);
    lanterns.push({
      g, glow, mats: [bodyMat, top.material, bottom.material],
      phase: rnd() * Math.PI * 2, drift: 0.15 + rnd() * 0.25,
      target: 0, alpha: 0, baseY: g.position.y,
    });
  }

  let want = 0;
  function setCount(n) {
    want = Math.min(MAX_LANTERNS, Math.max(0, n));
    lanterns.forEach((l, i) => { l.target = i < want ? 1 : 0; });
  }

  function update(t, dt) {
    for (const l of lanterns) {
      if (l.alpha === 0 && l.target === 0) { l.g.visible = false; continue; }
      l.g.visible = true;
      l.alpha += (l.target - l.alpha) * Math.min(1, dt * 1.4);
      if (l.alpha < 0.005 && l.target === 0) l.alpha = 0;
      for (const m of l.mats) m.opacity = l.alpha * 0.95;
      l.glow.material.opacity = l.alpha * (0.5 + 0.18 * Math.sin(t * 2 + l.phase));
      l.g.position.y = l.baseY + Math.sin(t * 0.8 + l.phase) * 0.35;
      l.g.position.x += Math.sin(t * l.drift + l.phase) * dt * 0.12;
      l.g.rotation.y = t * 0.2 + l.phase;
    }
  }

  return { setCount, update };
}
