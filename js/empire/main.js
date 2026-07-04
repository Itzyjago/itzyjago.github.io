/* The Neon Empire — bootstrap. */
import * as THREE from 'three';
import { createWorld } from './world.js';
import { buildLandmarks } from './landmarks.js';
import { CameraRig } from './camera-path.js';
import { createLanterns } from './lanterns.js';
import { createOverlay } from './overlay.js';
import { updateFlicker } from './signage.js';
import * as presence from './presence.js';

/* Sign textures are rasterized to canvas at build time — wait (briefly) for
   the display fonts so the neon signs don't bake in a fallback face. */
try {
  await Promise.race([
    Promise.all([
      document.fonts.load("700 92px 'Space Grotesk'"),
      document.fonts.load("500 36px 'JetBrains Mono'"),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
} catch { /* cosmetic only */ }

const canvas = document.getElementById('city');
let world;
try {
  world = createWorld(canvas);
} catch {
  location.replace('lite.html');
  throw new Error('WebGL unavailable');
}

const { group, updaters } = buildLandmarks();
world.scene.add(group);

const rig = new CameraRig(world.camera);
const lanterns = createLanterns(world.scene);
const overlay = createOverlay(rig);

overlay.onStopChange = (id) => presence.setSection(id);
presence.onCount((n) => {
  overlay.setLiveCount(n);
  /* everyone but you — you're holding the camera */
  lanterns.setCount(Math.max(0, n - 1));
});
presence.start();

addEventListener('resize', () => world.resize());
overlay.sync();

/* ---- render loop with adaptive quality ---- */
const clock = new THREE.Clock();
let slowFrames = 0;
let degraded = false;
let running = true;
let rafId = 0;
let rafPending = false;

/* rAF callbacks are paused, not cancelled, in hidden tabs — cancel explicitly
   or every hide/show cycle would stack another permanent render loop. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    cancelAnimationFrame(rafId);
    rafPending = false;
  } else if (!running) {
    running = true;
    clock.getDelta();
    if (!rafPending) loop();
  }
});

let firstFrame = true;
function loop() {
  rafPending = false;
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  rafPending = true;
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  overlay.sync(); /* every frame — the camera eases, panels must follow */
  rig.update(t, dt);
  world.update(t, dt);
  lanterns.update(t, dt);
  updateFlicker(t);
  for (const u of updaters) u(t);

  world.renderer.render(world.scene, world.camera);

  if (firstFrame) {
    firstFrame = false;
    overlay.hideLoader();
  }
  if (!degraded) {
    if (dt > 0.036) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > 70) { degraded = true; world.setQuality(true); }
  }
}
loop();
