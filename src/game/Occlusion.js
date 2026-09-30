// Fades objects that stand between the camera and the player's hole (tall city buildings).
// Occluders swap to ONE shared translucent material and back to the shared opaque one when clear.
import * as THREE from 'three';
import { objectMaterial, objectMaterialHigh } from '../objects/build.js';

export class Occlusion {
  constructor(game, high = true) {
    this.game = game;
    this.frame = 0;
    this.receive = high;
    this.faded = [];
    // Shared translucent twin of the object material (same class as the opaque one so lighting matches).
    const fade = { vertexColors: true, transparent: true, opacity: 0.25, depthWrite: false };
    this.material = high
      ? new THREE.MeshStandardMaterial({ ...fade, roughness: objectMaterialHigh.roughness, metalness: objectMaterialHigh.metalness })
      : new THREE.MeshLambertMaterial(fade);
  }

  update() {
    const g = this.game;
    const p = g.player;
    const frame = ++this.frame;
    if (p.alive) {
      const cam = g.camera.position;
      const ax = p.x, az = p.z;
      const dx = cam.x - ax, dz = cam.z - az;
      const len2 = dx * dx + dz * dz;
      if (len2 > 1e-6) {
        const len = Math.sqrt(len2);
        const out = g.tmp;
        out.length = 0;
        g.grid.query(ax + dx / 2, az + dz / 2, Math.max(Math.abs(dx), Math.abs(dz)) / 2 + g.maxR + p.r, out);
        const minH = p.r * 1.5;
        // Rays from the camera to the hole centre and to two points 2r either side of it, so buildings that
        // only hide part of the hole (or its rings) fade too.
        const nx = -dz / len, nz = dx / len;
        const side = p.r * 2;
        for (let i = 0; i < out.length; i++) {
          const o = out[i];
          if (o.h <= minH) continue;
          if (((o.x - ax) * dx + (o.z - az) * dz) / len2 <= -0.15) continue; // well behind the hole
          let hit = false;
          for (let k = -1; k <= 1 && !hit; k++) {
            const tx = ax + nx * side * k, tz = az + nz * side * k;
            const t = ((o.x - tx) * dx + (o.z - tz) * dz) / len2;
            const px = tx + dx * t - o.x, pz = tz + dz * t - o.z;
            const d2 = px * px + pz * pz;
            if (d2 >= o.r * o.r) continue;
            // The ray is lowest where it enters the object's footprint circle.
            const half = Math.sqrt(o.r * o.r - d2) / len;
            if (t + half <= 0) continue;
            const te = Math.max(0, t - half);
            if (te >= 1) continue;
            if (o.h > te * cam.y - p.r * 0.3) hit = true;
          }
          if (!hit) continue;
          o.occF = frame;
          if (o.mesh.material !== this.material) {
            o.mesh.material = this.material;
            o.mesh.receiveShadow = false; // translucent + self-shadowing looks like stripes
            this.faded.push(o);
          }
        }
      }
    }
    const f = this.faded;
    for (let i = f.length - 1; i >= 0; i--) {
      const o = f[i];
      if (o.occF === frame) continue;
      o.mesh.material = objectMaterial;
      o.mesh.receiveShadow = this.receive;
      f[i] = f[f.length - 1];
      f.pop();
    }
  }

  dispose() {
    this.material.dispose();
    this.faded.length = 0;
  }
}
