/* The car — procedural low-poly neon runner + arcade physics. */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { makeGlow } from './signage.js';

/* tuning */
const ACCEL = 15;
const BRAKE = 26;
const DRAG = 1.15;        /* per-second velocity decay */
const VMAX = 17;
const VMAX_BOOST = 34;    /* autopilot / fast travel */
const VREV = 6.5;
const STEER = 2.3;        /* rad/s at reference speed */
export const CAR_R = 1.4; /* collision radius */
const BOUNDS = { x: 66, zMin: -96, zMax: 96 };

function buildCarMesh() {
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x0b0e18, fog: true });
  const shell = new THREE.MeshBasicMaterial({ color: 0x141a2e, fog: true });
  const glass = new THREE.MeshBasicMaterial({ color: 0x0a1220, fog: true });
  const tealM = new THREE.MeshBasicMaterial({ color: PALETTE.teal, fog: true });
  const emberM = new THREE.MeshBasicMaterial({ color: PALETTE.ember, fog: true });

  /* body: low wedge + cabin */
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 3.5), shell);
  body.position.y = 0.55;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.9), shell);
  nose.position.set(0, 0.46, 1.95);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.44, 1.7), glass);
  cabin.position.set(0, 1.0, -0.25);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.4), dark);
  spoiler.position.set(0, 0.98, -1.8);
  g.add(body, nose, cabin, spoiler);

  /* neon trim lines along the sides */
  for (const sx of [-0.87, 0.87]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 3.4), tealM);
    trim.position.set(sx, 0.42, 0);
    g.add(trim);
  }

  /* wheels */
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  const front = [];
  for (const [x, z, isFront] of [[-0.82, 1.15, true], [0.82, 1.15, true], [-0.82, -1.15, false], [0.82, -1.15, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.34, z);
    const w = new THREE.Mesh(wheelGeo, dark);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 8).rotateZ(Math.PI / 2), tealM);
    pivot.add(w, hub);
    g.add(pivot);
    wheels.push({ pivot, spin: w, hub });
    if (isFront) front.push(pivot);
  }

  /* headlights + tail lights */
  for (const sx of [-0.5, 0.5]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, fog: true }));
    head.position.set(sx, 0.56, 2.41);
    g.add(head);
    const hGlow = makeGlow(new THREE.Color(0xcfe8ff), 0.55, 0.3);
    hGlow.position.set(sx, 0.56, 2.62);
    g.add(hGlow);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), emberM);
    tail.position.set(sx, 0.62, -1.76);
    g.add(tail);
    const tGlow = makeGlow(new THREE.Color(PALETTE.ember), 0.9, 0.55);
    tGlow.position.set(sx, 0.62, -1.9);
    g.add(tGlow);
  }

  /* headlight pool on the road ahead */
  const poolTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(190,225,255,0.5)');
    grad.addColorStop(1, 'rgba(190,225,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 8.5),
    new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.03, 6.2);
  g.add(pool);

  /* teal underglow */
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 4.6),
    new THREE.MeshBasicMaterial({
      map: poolTex, color: PALETTE.teal, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })
  );
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.02;
  g.add(under);

  return { group: g, wheels, front };
}

export class Car {
  constructor(scene, colliders) {
    const { group, wheels, front } = buildCarMesh();
    this.mesh = group;
    this.wheels = wheels;
    this.frontPivots = front;
    scene.add(group);

    this.colliders = colliders;
    this.pos = new THREE.Vector3(0, 0, 88);
    this.heading = Math.PI; /* facing -z, into the city */
    this.v = 0;
    this.steerVis = 0;
    this.boost = false;
    this.moved = false; /* has the visitor ever driven? (for the hint) */

    this._dir = new THREE.Vector3();
  }

  /** unit forward vector for the current heading */
  dir(out = this._dir) {
    return out.set(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  place(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.v = 0;
    this._apply();
  }

  /** throttle/steer ∈ [-1,1] */
  update(dt, throttle, steer) {
    const vmax = this.boost ? VMAX_BOOST : VMAX;

    if (throttle > 0) this.v += (this.boost ? ACCEL * 2.2 : ACCEL) * throttle * dt;
    else if (throttle < 0) this.v += (this.v > 0 ? BRAKE : ACCEL * 0.7) * throttle * dt;
    this.v *= Math.max(0, 1 - DRAG * dt);
    if (this.v > vmax) {
      /* boost ending mid-drive shrinks vmax under the current speed — ease
         down at the brake rate instead of an instant one-frame clamp */
      this.v = Math.max(vmax, this.v - BRAKE * dt);
    } else {
      this.v = Math.max(-VREV, this.v);
    }
    if (Math.abs(this.v) < 0.02 && throttle === 0) this.v = 0;
    if (Math.abs(this.v) > 0.4) this.moved = true;

    /* speed-scaled steering; sign of v flips reverse steering naturally */
    this.heading += steer * STEER * dt * Math.min(1, Math.max(-1, this.v / 8));

    this.dir();
    this.pos.addScaledVector(this._dir, this.v * dt);

    /* soft circular colliders: push out + scrub speed, heading untouched = slide */
    for (const c of this.colliders) {
      const dx = this.pos.x - c.x;
      const dz = this.pos.z - c.z;
      const R = c.r + CAR_R;
      const d2 = dx * dx + dz * dz;
      if (d2 < R * R && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        this.pos.x = c.x + (dx / d) * R;
        this.pos.z = c.z + (dz / d) * R;
        this.v *= 0.86;
      }
    }
    if (Math.abs(this.pos.x) > BOUNDS.x) { this.pos.x = Math.sign(this.pos.x) * BOUNDS.x; this.v *= 0.8; }
    if (this.pos.z < BOUNDS.zMin) { this.pos.z = BOUNDS.zMin; this.v *= 0.8; }
    if (this.pos.z > BOUNDS.zMax) { this.pos.z = BOUNDS.zMax; this.v *= 0.8; }

    /* visuals */
    this.steerVis += (steer - this.steerVis) * Math.min(1, dt * 8);
    for (const p of this.frontPivots) p.rotation.y = this.steerVis * 0.42;
    for (const w of this.wheels) w.spin.rotation.x += (this.v * dt) / 0.34;
    this.mesh.rotation.z = -this.steerVis * Math.min(1, Math.abs(this.v) / VMAX) * 0.05;

    this._apply();
  }

  _apply() {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
  }
}
