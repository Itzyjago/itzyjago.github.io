/* Scroll-driven camera flight: spline through the district with dwell
   plateaus at each stop. */
import * as THREE from 'three';
import { STOPS, WAYPOINTS } from './landmarks.js';

/* timeline fractions — travels between stops, dwells at them */
const DWELL = [0.10, 0.12, 0.12, 0.16, 0.12, 0.08];
const TRAVEL = 0.06;

function smoothstep(x) { return x * x * (3 - 2 * x); }

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.p = 0;
    this.targetP = 0;
    this.mouse = { x: 0, y: 0, cx: 0, cy: 0 };

    /* control points: stop, waypoint, stop, waypoint, ... */
    const pts = [];
    STOPS.forEach((s, i) => {
      pts.push(new THREE.Vector3(...s.cam));
      if (i < WAYPOINTS.length) pts.push(new THREE.Vector3(...WAYPOINTS[i]));
    });
    this.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    this.stopU = STOPS.map((_, i) => (2 * i) / (pts.length - 1));
    this.looks = STOPS.map((s) => new THREE.Vector3(...s.look));

    /* build timeline segments: [{stop dwell} travel]... */
    this.segments = [];
    let at = 0;
    for (let i = 0; i < STOPS.length; i++) {
      this.segments.push({ type: 'dwell', i, p0: at, p1: at + DWELL[i] });
      at += DWELL[i];
      if (i < STOPS.length - 1) {
        this.segments.push({ type: 'travel', i, p0: at, p1: at + TRAVEL });
        at += TRAVEL;
      }
    }
    /* normalize to exactly 1 */
    const total = at;
    this.segments.forEach((s) => { s.p0 /= total; s.p1 /= total; });

    addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
  }

  setProgress(p) { this.targetP = Math.min(1, Math.max(0, p)); }

  segmentAt(p) {
    for (const s of this.segments) if (p <= s.p1) return s;
    return this.segments[this.segments.length - 1];
  }

  /** index of the stop whose dwell midpoint is nearest to p */
  stopIndexAt(p) {
    const seg = this.segmentAt(p);
    if (seg.type === 'dwell') return seg.i;
    const mid = (seg.p0 + seg.p1) / 2;
    return p < mid ? seg.i : seg.i + 1;
  }

  /** scroll fraction that centers stop i's dwell */
  progressForStop(i) {
    const seg = this.segments.find((s) => s.type === 'dwell' && s.i === i);
    return (seg.p0 + seg.p1) / 2;
  }

  /** how "settled" we are at stop i (1 = fully dwelling) for panel fades */
  dwellAmount(p, i) {
    const seg = this.segments.find((s) => s.type === 'dwell' && s.i === i);
    const fadeIn = i === 0 ? 0 : TRAVEL * 0.55;
    const fadeOut = i === STOPS.length - 1 ? 0.0001 : TRAVEL * 0.55;
    if (p < seg.p0 - fadeIn || p > seg.p1 + fadeOut) return 0;
    if (p < seg.p0) return smoothstep((p - (seg.p0 - fadeIn)) / fadeIn);
    if (p > seg.p1) return 1 - smoothstep((p - seg.p1) / fadeOut);
    return 1;
  }

  update(t, dt) {
    /* ease scroll for a buttery flight */
    this.p += (this.targetP - this.p) * Math.min(1, dt * 4.5);
    const p = this.p;
    const seg = this.segmentAt(p);

    let travelK = 0; /* 0 at rest, peaks mid-flight */
    let bank = 0;
    const idleX = (i) => Math.sin(t * 0.33 + i) * 0.06;
    const idleY = (i) => Math.sin(t * 0.5 + i * 2.1) * 0.09;
    if (seg.type === 'dwell') {
      const i = seg.i;
      this._pos.copy(this.curve.getPoint(this.stopU[i]));
      this._look.copy(this.looks[i]);
      /* idle drift */
      this._pos.x += idleX(i);
      this._pos.y += idleY(i);
    } else {
      const i = seg.i;
      const k = smoothstep((p - seg.p0) / (seg.p1 - seg.p0));
      const u = this.stopU[i] + (this.stopU[i + 1] - this.stopU[i]) * k;
      this._pos.copy(this.curve.getPoint(u));
      this._look.lerpVectors(this.looks[i], this.looks[i + 1], k);
      travelK = Math.sin(k * Math.PI);
      /* keep the idle drift continuous across dwell↔travel edges: blend the
         two stops' drift phases and fade it out only mid-flight */
      const fade = 1 - travelK;
      this._pos.x += (idleX(i) + (idleX(i + 1) - idleX(i)) * k) * fade;
      this._pos.y += (idleY(i) + (idleY(i + 1) - idleY(i)) * k) * fade;
      /* bank into lateral motion */
      const ahead = this.curve.getPoint(Math.min(1, u + 0.008));
      bank = THREE.MathUtils.clamp((ahead.x - this._pos.x) * -0.55, -0.055, 0.055) * travelK;
    }

    /* FOV kick: slight zoom-out mid-flight sells the speed */
    const fov = 55 + travelK * 7;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    /* mouse parallax */
    this.mouse.cx += (this.mouse.x - this.mouse.cx) * Math.min(1, dt * 3);
    this.mouse.cy += (this.mouse.y - this.mouse.cy) * Math.min(1, dt * 3);
    this._dir.subVectors(this._look, this._pos).normalize();
    this._right.crossVectors(this._dir, this.camera.up).normalize();
    this._pos.addScaledVector(this._right, this.mouse.cx * 0.45);
    this._pos.y += -this.mouse.cy * 0.3;

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
    if (bank) this.camera.rotateZ(bank);
  }
}
