/* Neon signage — canvas-drawn textures for signs, glows and windows. */
import * as THREE from 'three';

let glowTex = null;
/** Shared radial-gradient texture for additive glow sprites. */
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Additive glow sprite. */
export function makeGlow(color, scale = 4, opacity = 0.55) {
  const m = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scale);
  return s;
}

function drawNeonText(ctx, text, x, y, font, color, blur) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur * 0.4;
  ctx.fillStyle = '#f6fbff';
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/** Horizontal neon sign texture; returns {texture, aspect}. */
export function neonTexture(text, { color = '#36f1cd', sub = '', px = 92 } = {}) {
  const c = document.createElement('canvas');
  const font = `700 ${px}px 'Space Grotesk', sans-serif`;
  const mctx = c.getContext('2d');
  mctx.font = font;
  const w = Math.ceil(mctx.measureText(text).width);
  c.width = Math.max(64, w + px * 1.6);
  c.height = sub ? px * 2.6 : px * 2;
  const ctx = c.getContext('2d');
  drawNeonText(ctx, text, c.width / 2, sub ? px * 1.0 : c.height / 2, font, color, px * 0.45);
  if (sub) {
    drawNeonText(ctx, sub, c.width / 2, px * 2.05, `500 ${px * 0.38}px 'JetBrains Mono', monospace`, color, px * 0.2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: c.width / c.height };
}

/** Vertical (writing-mode) neon sign texture — Japanese shop-sign style. */
export function verticalNeonTexture(chars, { color = '#36f1cd', px = 96 } = {}) {
  const c = document.createElement('canvas');
  c.width = px * 1.9;
  c.height = px * 1.35 * chars.length + px;
  const ctx = c.getContext('2d');
  /* backing strip */
  ctx.fillStyle = 'rgba(6,8,14,0.88)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.globalAlpha = 1;
  const font = `700 ${px}px 'Space Grotesk', 'Hiragino Sans', 'Yu Gothic', sans-serif`;
  [...chars].forEach((ch, i) => {
    drawNeonText(ctx, ch, c.width / 2, px * 0.95 + i * px * 1.35, font, color, px * 0.4);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: c.width / c.height };
}

/** Sign mesh (transparent plane) + backing glow. height in world units. */
export function makeSign(text, { color = '#36f1cd', sub = '', height = 1.4, glow = 2.6 } = {}) {
  const { texture, aspect } = neonTexture(text, { color, sub });
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  if (glow > 0) {
    const g = makeGlow(new THREE.Color(color), height * glow, 0.35);
    g.position.z = -0.05;
    mesh.add(g);
  }
  return mesh;
}

/** Vertical hanging sign mesh. */
export function makeVerticalSign(chars, { color = '#36f1cd', height = 3 } = {}) {
  const { texture, aspect } = verticalNeonTexture(chars, { color });
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
  });
  return new THREE.Mesh(geo, mat);
}

/** Building-window texture (pixel windows). variant changes the seed feel. */
export function windowTexture(variant = 0) {
  const cols = 6, rows = 14, cell = 10;
  const c = document.createElement('canvas');
  c.width = cols * cell;
  c.height = rows * cell;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, c.width, c.height);
  const tints = ['#8ef5df', '#ab97ff', '#dfe6ff', '#dfe6ff'];
  let seed = 1234 + variant * 977;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rand() < 0.44) {
        ctx.globalAlpha = 0.35 + rand() * 0.6;
        ctx.fillStyle = tints[Math.floor(rand() * tints.length)];
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 5);
      }
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* Rare, subtle flicker for a few chosen sign materials. */
const flickering = [];
export function registerFlicker(material) { flickering.push({ material, next: 2 + Math.random() * 9, until: 0 }); }
export function updateFlicker(t) {
  for (const f of flickering) {
    if (t > f.next) { f.until = t + 0.12 + Math.random() * 0.2; f.next = t + 4 + Math.random() * 10; }
    f.material.opacity = t < f.until ? 0.45 + Math.random() * 0.3 : 1;
  }
}
