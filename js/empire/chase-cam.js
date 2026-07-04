/* Chase camera: smooth follow with look-ahead, speed FOV, mouse parallax. */
import * as THREE from 'three';

const VMAX_REF = 17;

export class ChaseCam {
  constructor(camera) {
    this.camera = camera;
    this.mouse = { x: 0, y: 0, cx: 0, cy: 0 };
    addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._smoothLook = null;
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();

    /* cinematic arrival: start high behind the torii, ease into the chase */
    camera.position.set(0, 10, 104);
  }

  update(car, dt) {
    const sp = Math.min(1, Math.abs(car.v) / VMAX_REF);
    car.dir(this._dir);

    /* desired boom: behind the car, higher + further with speed */
    const dist = 7.4 + sp * 2.6;
    const height = 3.1 + sp * 0.9;
    this._pos.copy(car.pos).addScaledVector(this._dir, -dist);
    this._pos.y += height;

    /* mouse parallax: slide the boom sideways a touch */
    this.mouse.cx += (this.mouse.x - this.mouse.cx) * Math.min(1, dt * 3);
    this.mouse.cy += (this.mouse.y - this.mouse.cy) * Math.min(1, dt * 3);
    this._right.crossVectors(this._dir, this.camera.up).normalize();
    this._pos.addScaledVector(this._right, this.mouse.cx * 1.1);
    this._pos.y += -this.mouse.cy * 0.5;

    const k = 1 - Math.exp(-dt * 3.4);
    this.camera.position.lerp(this._pos, k);

    /* look ahead of the car so turns read early */
    this._look.copy(car.pos).addScaledVector(this._dir, 5.5 + sp * 3);
    this._look.y += 1.7;
    if (!this._smoothLook) this._smoothLook = this._look.clone();
    this._smoothLook.lerp(this._look, 1 - Math.exp(-dt * 4.2));
    this.camera.lookAt(this._smoothLook);

    /* speed sells itself: FOV kick + slight roll with steering */
    const fov = 55 + sp * 9 + (car.boost ? 4 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.rotateZ(-car.steerVis * sp * 0.03);
  }
}
