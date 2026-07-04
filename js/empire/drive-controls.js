/* Driving input: WASD/arrows, tap/click-to-drive, and nav fast travel. */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { CAR_R } from './car.js';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ARRIVE_R = 1.9;      /* close enough — stop */
const SLOW_R = 9;          /* start easing off */

export function createControls(car, camera, canvas, scene) {
  const keys = new Set();
  let target = null;        /* Vector3 the car is self-driving to */
  let boost = false;

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      const t = e.target;
      if (t instanceof Element && t.matches('input, textarea, select')) return;
      if (k.startsWith('arrow')) {
        /* a visitor reading an open, scrollable panel is scrolling, not
           driving — let the browser's native scroll have the arrow keys */
        const sc = t instanceof Element && t.closest('.panel.visible');
        if (sc && sc.scrollHeight > sc.clientHeight + 1) return;
        e.preventDefault();
      }
      keys.add(k);
      clearTarget(); /* grabbing the wheel cancels autopilot */
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  /* ---- tap / click to drive ---- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.95, 40),
    new THREE.MeshBasicMaterial({
      color: PALETTE.teal, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.05;
  marker.visible = false;
  scene.add(marker);

  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const [dx, dy] = [e.clientX - downAt[0], e.clientY - downAt[1]];
    downAt = null;
    if (dx * dx + dy * dy > 100) return; /* a drag, not a tap */
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(GROUND, hit)) {
      /* clamp inside the drivable land */
      hit.x = Math.min(64, Math.max(-64, hit.x));
      hit.z = Math.min(94, Math.max(-94, hit.z));
      setTarget(hit.x, hit.z, false);
    }
  });

  function setTarget(x, z, fast) {
    /* a tap on a building's face raycasts the ground BEHIND it — if that
       lands inside a collider's footprint the car could never close within
       ARRIVE_R (physically blocked), so pull the target out to the collider's
       edge instead of leaving an unreachable destination */
    for (const c of car.colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      const need = c.r + CAR_R + ARRIVE_R;
      const d = Math.hypot(dx, dz);
      if (d < need) {
        const k = d > 1e-4 ? need / d : 1;
        x = c.x + (d > 1e-4 ? dx * k : need);
        z = c.z + (d > 1e-4 ? dz * k : 0);
      }
    }
    target = new THREE.Vector3(x, 0, z);
    boost = !!fast;
    marker.position.set(x, 0.05, z);
    marker.visible = true;
    car.moved = true;
    recoverLeft = 0; /* a fresh destination shouldn't inherit a stale back-out window */
  }
  function clearTarget() {
    target = null;
    boost = false;
    car.boost = false;
    marker.visible = false;
    reversing = false;
    recoverLeft = 0;
  }

  /** nav fast travel: the car drives itself there, quickly */
  function fastTravelTo(x, z) { setTarget(x, z, true); }

  /* steering push away from colliders blocking the path ahead;
     positive steer turns left (heading +) for dir=(sinθ,cosθ) */
  function avoidance() {
    let out = 0;
    const sin = Math.sin(car.heading);
    const cos = Math.cos(car.heading);
    for (const c of car.colliders) {
      const rx = c.x - car.pos.x;
      const rz = c.z - car.pos.z;
      const fwdD = rx * sin + rz * cos;              /* distance ahead */
      if (fwdD < 0.5 || fwdD > 13) continue;
      const lat = -rx * cos + rz * sin;              /* + = collider to the right */
      const need = c.r + 2.4;
      if (Math.abs(lat) < need) {
        const push = (1 - Math.abs(lat) / need) * (1 - fwdD / 13);
        const away = (lat > 0 ? 1 : -1) * push;      /* steer left of right-side obstacles */
        if (Math.abs(away) > Math.abs(out)) out = away;
      }
    }
    return out;
  }

  let stuckFor = 0;
  let recoverLeft = 0; /* physics-time (dt) countdown, not wall-clock — stays
    a full 1s of simulated back-out even on a device rendering slower than 1fps */
  let recoverSteer = 1;
  let reversing = false; /* committed to a reverse-turn until the nose comes around */

  function update(t, dt) {
    let throttle = 0;
    let steer = 0;

    const up = keys.has('w') || keys.has('arrowup');
    const dn = keys.has('s') || keys.has('arrowdown');
    const lf = keys.has('a') || keys.has('arrowleft');
    const rt = keys.has('d') || keys.has('arrowright');
    if (up) throttle += 1;
    if (dn) throttle -= 1;
    if (lf) steer += 1;
    if (rt) steer -= 1;

    if (target && throttle === 0 && steer === 0) {
      const dx = target.x - car.pos.x;
      const dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < ARRIVE_R) {
        clearTarget();
      } else if (recoverLeft > 0) {
        /* wedged against something: back out on an arc, then retry */
        throttle = -0.75;
        steer = recoverSteer;
        recoverLeft -= dt;
      } else {
        const desired = Math.atan2(dx, dz);
        let diff = desired - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        /* hysteresis: start a reverse-turn when the target is behind, and
           COMMIT to it until the nose is mostly around — bouncing between
           modes at one threshold never converges (steering needs speed) */
        if (!reversing && Math.abs(diff) > 2.4) reversing = true;
        if (reversing && Math.abs(diff) < 1.2) reversing = false;

        if (reversing) {
          throttle = -0.7;
          steer = diff > 0 ? -1 : 1; /* v < 0 flips the rotation sign */
        } else {
          steer = Math.min(1, Math.max(-1, diff * 2.2));
          /* ease off when off-axis or arriving; brake when nearly there */
          const align = Math.max(0.35, 1 - Math.abs(diff) / 1.9);
          const arrive = Math.min(1, dist / SLOW_R);
          throttle = align * arrive;
          car.boost = boost && dist > 22;

          /* obstacle avoidance bends the path around buildings */
          const av = avoidance();
          if (av) steer = Math.min(1, Math.max(-1, steer + av * 2.6));
        }

        /* stuck detection: commanding motion but not moving */
        if (Math.abs(throttle) > 0.12 && Math.abs(car.v) < 0.9) stuckFor += dt; else stuckFor = 0;
        if (stuckFor > 1.1) {
          if (dist < 7) {
            clearTarget(); /* close enough — the wall is the destination's porch */
          } else {
            recoverLeft = 1.0;
            recoverSteer = steer >= 0 ? -1 : 1;
          }
          stuckFor = 0;
        }
      }
    } else if (throttle !== 0 || steer !== 0) {
      car.boost = false;
    }

    car.update(dt, throttle, steer);

    if (marker.visible) {
      const s = 1 + 0.18 * Math.sin(t * 5);
      marker.scale.setScalar(s);
      marker.material.opacity = 0.55 + 0.3 * Math.sin(t * 5);
    }
  }

  return { update, fastTravelTo, clearTarget, get hasTarget() { return !!target; } };
}
