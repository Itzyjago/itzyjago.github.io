/* The Neon Empire — drive-mode bootstrap. */
import * as THREE from 'three';
import { createWorld } from './world.js';
import { buildLandmarks } from './landmarks.js';
import { Car } from './car.js';
import { createControls } from './drive-controls.js';
import { ChaseCam } from './chase-cam.js';
import { createDistricts, DISTRICTS } from './districts.js';
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

const { group, updaters, colliders } = buildLandmarks();
world.scene.add(group);

const car = new Car(world.scene, [...world.colliders, ...colliders]);
const controls = createControls(car, world.camera, canvas, world.scene);
const chase = new ChaseCam(world.camera);
const lanterns = createLanterns(world.scene);

const overlay = createOverlay({
  onFastTravel(id) {
    const d = DISTRICTS.find((x) => x.id === id);
    if (d) controls.fastTravelTo(d.x, d.z);
  },
});

/* deep links spawn you in that district */
if (overlay.initialDistrict && overlay.initialDistrict !== 'hero') {
  const d = DISTRICTS.find((x) => x.id === overlay.initialDistrict);
  if (d) car.place(d.x, d.z, d.heading);
}

const districts = createDistricts((id) => overlay.showDistrict(id));
overlay.onDistrictChange = (id) => presence.setSection(id || 'hero');

presence.onCount((n) => {
  overlay.setLiveCount(n);
  /* everyone but you — you're holding the wheel */
  lanterns.setCount(Math.max(0, n - 1));
});
presence.start();

addEventListener('resize', () => world.resize());

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

  controls.update(t, dt);
  if (car.moved) overlay.hideHint();
  districts.update(car.pos);
  chase.update(car, dt);
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
