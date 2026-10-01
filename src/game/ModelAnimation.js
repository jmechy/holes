import * as THREE from 'three';
import { IDLE } from './Swallow.js';

const TAU = Math.PI * 2;
const frustum = new THREE.Frustum();
const viewProjection = new THREE.Matrix4();
const bounds = new THREE.Sphere();

/** Rigid limb deformation keeps the original single mesh, including its shadow and fall material. */
export function animateModels(game, dt) {
  viewProjection.multiplyMatrices(game.camera.projectionMatrix, game.camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(viewProjection);
  for (const o of game.movers.list) {
    const parts = o.proto.articulation;
    if (!parts?.length) continue;
    const a = o.animation ??= {
      x: o.x, z: o.z, yaw: o.yaw, travel: 0, gait: 0,
      blend: 0, steer: 0, elapsed: 0, geometry: null, wag: 0,
    };
    const dx = o.x - a.x, dz = o.z - a.z;
    // Route placement and teleports must not advance a whole walk cycle at once.
    const distance = Math.min(Math.hypot(dx, dz), (o.mv.speed ?? 1.5) * dt * 2);
    const moving = o.state === IDLE && distance > 0.0001;
    let turn = o.yaw - a.yaw;
    turn -= TAU * Math.round(turn / TAU);
    a.x = o.x; a.z = o.z; a.yaw = o.yaw;
    a.travel += distance / o.scale;
    a.gait = (a.gait + distance / o.scale * 7) % TAU;
    const target = moving ? Math.min(1, distance / Math.max(dt, 0.001)) : 0;
    a.blend += (target - a.blend) * Math.min(1, dt * 10);
    const steering = moving ? Math.max(-0.38, Math.min(0.38, turn / Math.max(distance, 0.05) * 1.4)) : 0;
    a.wag = (a.wag + dt * (5 + a.blend * 5)) % TAU;
    a.steer += (steering - a.steer) * Math.min(1, dt * 8);
    a.elapsed += dt;
    if (o.state !== IDLE || a.elapsed < (game.high ? 1 / 30 : 1 / 15)) continue;
    // Small or offscreen models keep their last pose; motion phase still follows distance.
    bounds.center.set(o.x, o.h / 2, o.z);
    bounds.radius = Math.hypot(o.r * Math.SQRT2, o.h / 2) + 0.5 * o.scale;
    if (!frustum.intersectsSphere(bounds)) continue;
    const cameraDistance = game.camera.position.distanceTo(o.mesh.position);
    const pixelHeight = o.h * game.renderer.domElement.clientHeight /
      Math.max(1, 2 * cameraDistance * Math.tan(game.camera.fov * Math.PI / 360));
    if (pixelHeight < (game.high ? 10 : 18)) continue;
    if (!a.geometry && !moving) continue; // parked vehicles keep shared geometry
    a.elapsed = 0;
    if (!a.geometry) {
      a.geometry = o.proto.geometry.clone();
      a.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
      a.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      // Animation can extend limbs beyond the rest pose. Bounds affect rendering only.
      a.geometry.boundingSphere.radius += 0.5;
      o.mesh.geometry = a.geometry;
    }
    const geometry = a.geometry;
    const position = geometry.attributes.position.array;
    const normal = geometry.attributes.normal.array;
    const restPosition = o.proto.geometry.attributes.position.array;
    const restNormal = o.proto.geometry.attributes.normal.array;
    position.set(restPosition);
    let lowestFoot = Infinity;
    for (const part of parts) {
      if (part.kind === 'tail') {
        // Gentle side-to-side wag about the vertical axis through the tail root.
        const wag = Math.sin(a.wag) * (0.3 + a.blend * 0.3) * (part.amp ?? 1);
        const tc = Math.cos(wag), ts = Math.sin(wag);
        const [tx, , tz] = part.pivot;
        const tEnd = (part.start + part.count) * 3;
        for (let i = part.start * 3; i < tEnd; i += 3) {
          const x = restPosition[i] - tx, z = restPosition[i + 2] - tz;
          position[i] = tx + x * tc + z * ts;
          position[i + 2] = tz - x * ts + z * tc;
          normal[i] = restNormal[i] * tc + restNormal[i + 2] * ts;
          normal[i + 2] = -restNormal[i] * ts + restNormal[i + 2] * tc;
        }
        continue;
      }
      // Quadruped gait: `phase` (0|1) replaces `side`; diagonal pairs share a phase (FL+BR = 0, FR+BL = 1).
      const swing = part.phase === undefined ? (part.side ?? 1) * Math.sin(a.gait) : Math.sin(a.gait + part.phase * Math.PI);
      const knee = part.phase === undefined ? (part.side ?? 1) * Math.cos(a.gait) : Math.cos(a.gait + part.phase * Math.PI);
      const wheel = part.kind === 'wheel';
      const angle = wheel ? -a.travel / (part.radius || 0.4)
        : swing * a.blend * (part.kind === 'arm' ? -0.36 : 0.48);
      const c = Math.cos(angle), s = Math.sin(angle);
      const steer = wheel && part.front ? a.steer : 0;
      const cy = Math.cos(steer), sy = Math.sin(steer);
      const shin = part.kind === 'shin' && part.hip;
      const kneeAngle = shin ? -(Math.max(0, knee) ** 2) * a.blend * 0.9 : 0;
      const kc = Math.cos(kneeAngle), ks = Math.sin(kneeAngle);
      const [px, py, pz] = shin ? part.hip : part.pivot;
      const end = (part.start + part.count) * 3;
      for (let i = part.start * 3; i < end; i += 3) {
        let x = restPosition[i] - px, y = restPosition[i + 1] - py;
        const z = restPosition[i + 2] - pz;
        let normalX = restNormal[i], normalY = restNormal[i + 1];
        if (shin) {
          // Flex at the knee first, then carry the lower leg with its thigh about the hip.
          const kx = part.pivot[0] - px, ky = part.pivot[1] - py;
          const dx = x - kx, dy = y - ky;
          x = kx + dx * kc - dy * ks;
          y = ky + dx * ks + dy * kc;
          normalX = restNormal[i] * kc - restNormal[i + 1] * ks;
          normalY = restNormal[i] * ks + restNormal[i + 1] * kc;
        }
        const rx = x * c - y * s, ry = x * s + y * c;
        position[i] = px + rx * cy + z * sy;
        position[i + 1] = py + ry;
        position[i + 2] = pz - rx * sy + z * cy;
        if (shin) lowestFoot = Math.min(lowestFoot, position[i + 1]);
        const nx = normalX * c - normalY * s;
        normal[i] = nx * cy + restNormal[i + 2] * sy;
        normal[i + 1] = normalX * s + normalY * c;
        normal[i + 2] = -nx * sy + restNormal[i + 2] * cy;
      }
    }
    if (o.mv.type === 'walk' && parts.some(p => p.kind === 'leg')) {
      // Keep forward shoe tips clear at peak stride, including the short Paris legs.
      const lift = Math.max(a.blend * (0.045 + Math.cos(a.gait * 2) * 0.015), -lowestFoot);
      for (let i = 1; i < position.length; i += 3) position[i] += lift;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  }
}

export function disposeModelAnimation(o) {
  if (!o.animation?.geometry) return;
  o.animation.geometry.dispose();
  o.animation.geometry = null;
  if (o.mesh) o.mesh.geometry = o.proto.geometry;
}
