// Small ambient motion for grounded trees and boats. This is visual only: world coordinates,
// collision data, and mover state remain owned by the simulation.
import * as THREE from 'three';
import { IDLE } from './Swallow.js';

const TAU = Math.PI * 2;
const TREE_TYPES = new Set([
  'umbrellaPine', 'umbrellaPineSmall', 'cypress', // Rome
  'tree', 'tree2', // Paris / New York
  'palmQueen', 'palmQueenB', 'palmMed', 'palmFan', 'palmSmall', 'oak', 'oakSmall', // Santa Barbara
  'tree', 'treeBig', 'treeBlossom', // parks
]);
const BOAT_TYPES = new Set([
  'gondola', 'vaporetto', 'rowingBoat', 'boat', // Venice / Paris
  'sailboat', 'sailboatB', 'sailboatC', 'motorBoat', 'dinghy', // Santa Barbara
]);

function stablePhase(o, i) {
  // Integer mixing of placement data; deliberately independent of Math.random and simulation RNG.
  let n = (Math.imul(Math.round(o.x * 17), 73856093) ^ Math.imul(Math.round(o.z * 17), 19349663) ^ Math.imul(i + 1, 83492791)) | 0;
  n = Math.imul(n ^ (n >>> 16), 2246822519);
  n = Math.imul(n ^ (n >>> 13), 3266489917);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296 * TAU;
}

export class EnvironmentAnimation {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.camera = new THREE.Frustum();
    this.viewProjection = new THREE.Matrix4();
    this.bounds = new THREE.Sphere();
    this.point = new THREE.Vector3();
    for (let i = 0; i < game.objects.length; i++) {
      const o = game.objects[i];
      const name = o.proto?.name;
      // proto.sway ('tree' | 'boat') opts any prototype in; the name sets keep older themes working.
      const sway = o.proto?.sway;
      const tree = sway ? sway === 'tree' : TREE_TYPES.has(name);
      const boat = sway ? sway === 'boat' : BOAT_TYPES.has(name);
      if ((!tree && !boat) || !(o.mesh || o.batch) || o.state !== IDLE) continue;
      // Prototypes with windStart use the material's height-weighted vertex bend. Keep trunks rooted
      // and avoid layering whole-object rocking on top of that foliage animation.
      if (tree && Number.isFinite(o.proto.windStart)) continue;
      this.items.push({
        o, tree, boat, phase: stablePhase(o, i), elapsed: 0,
        baseY: o.mesh ? o.mesh.position.y : 0, baseX: o.mesh ? o.mesh.rotation.x : 0, baseZ: o.mesh ? o.mesh.rotation.z : 0,
        offsetY: 0, offsetX: 0, offsetZ: 0, visible: false,
      });
    }
  }

  update(dt, time) {
    const game = this.game;
    if (!this.items.length || !game.camera || !game.renderer) return;
    this.viewProjection.multiplyMatrices(game.camera.projectionMatrix, game.camera.matrixWorldInverse);
    this.camera.setFromProjectionMatrix(this.viewProjection);
    const step = game.high ? 1 / 30 : 1 / 20;
    for (const item of this.items) {
      const { o } = item;
      if (o.state !== IDLE) {
        // Swallow/fall animation owns transforms once the object leaves IDLE.
        item.applied = false;
        continue;
      }
      item.elapsed += dt;
      if (item.elapsed >= step) {
        item.elapsed %= step;
        this.bounds.center.set(o.x, o.y + o.h / 2, o.z);
        this.bounds.radius = Math.hypot(o.r * Math.SQRT2, o.h / 2) + 0.5;
        item.visible = this.camera.intersectsSphere(this.bounds);
        if (item.visible) {
          const distance = game.camera.position.distanceTo(this.point.set(o.x, item.baseY, o.z));
          const pixels = o.h * game.renderer.domElement.clientHeight /
            Math.max(1, 2 * distance * Math.tan(game.camera.fov * Math.PI / 360));
          item.visible = pixels >= (game.high ? 8 : 14);
        }
        if (item.visible) {
          const wave = Math.sin(time * (item.tree ? 0.72 : 0.9) + item.phase);
          item.offsetY = item.boat ? Math.sin(time * 1.05 + item.phase) * 0.045 : 0;
          item.offsetX = item.boat ? wave * 0.014 : wave * 0.009;
          item.offsetZ = item.boat ? Math.cos(time * 0.83 + item.phase) * 0.016 : Math.cos(time * 0.59 + item.phase) * 0.012;
          // Instanced objects: rewrite the instance matrix in place (only when the pose changes).
          if (!o.mesh) game.instances.setPose(o, item.baseY + item.offsetY, item.baseX + item.offsetX, item.baseZ + item.offsetZ);
        }
      }
      const mesh = o.mesh;
      if (!item.visible || !mesh) continue;
      // Reapply the cached pose each frame: mover commits reset mesh position from simulation y.
      mesh.position.y = item.baseY + item.offsetY;
      mesh.rotation.x = item.baseX + item.offsetX;
      mesh.rotation.z = item.baseZ + item.offsetZ;
      // Movers own heading; restore it after applying the visual-only rocking pose.
      if (item.boat && o.mv) mesh.rotation.y = o.yaw;
      mesh.updateMatrix();
      item.applied = true;
    }
  }

  dispose() {
    for (const item of this.items) {
      if (item.o.state === IDLE) this.resetPose(item);
    }
    this.items.length = 0;
  }

  resetPose(item) {
    const { o } = item;
    if (!o.mesh || !item.applied) return;
    o.mesh.position.y = item.baseY;
    o.mesh.rotation.x = item.baseX;
    o.mesh.rotation.z = item.baseZ;
    if (item.boat && o.mv) o.mesh.rotation.y = o.yaw;
    o.mesh.updateMatrix();
    item.applied = false;
  }
}
