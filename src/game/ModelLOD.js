import * as THREE from 'three';
import { IDLE } from './Swallow.js';

/** Static models share both geometry levels; collision and swallowing keep prototype bounds. */
export class ModelLOD {
  constructor(game) {
    this.game = game;
    this.items = game.objects.filter(o => o.proto.geometryFar && !o.proto.articulation?.length);
    this.elapsed = 0;
    this.bounds = new THREE.Sphere();
    this.frustum = new THREE.Frustum();
    this.matrix = new THREE.Matrix4();
  }
  update(dt, force = false) {
    this.elapsed += dt;
    if (!force && this.elapsed < 0.2) return;
    this.elapsed = 0;
    const g = this.game;
    this.matrix.multiplyMatrices(g.camera.projectionMatrix, g.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.matrix);
    const pixelScale = g.renderer.domElement.clientHeight / (2 * Math.tan(g.camera.fov * Math.PI / 360));
    for (const o of this.items) {
      if (o.state !== IDLE || o.animation?.geometry) continue;
      this.bounds.center.set(o.x, o.h / 2, o.z);
      this.bounds.radius = Math.hypot(o.r, o.h / 2);
      const pixels = o.h * pixelScale / Math.max(1, g.camera.position.distanceTo(this.bounds.center));
      const wasFar = o.mesh.geometry === o.proto.geometryFar;
      const far = !g.high || !this.frustum.intersectsSphere(this.bounds) || pixels < (wasFar ? 60 : 45);
      o.mesh.geometry = far ? o.proto.geometryFar : o.proto.geometry;
    }
  }
  dispose() { this.items.length = 0; }
}
