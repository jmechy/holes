import * as THREE from 'three';
import { holeUniforms, MAX_HOLES } from './Ground.js';
import { IDLE } from './Swallow.js';

const BOATS = /gondola|vaporetto|rowing.?boat|sailboat|motor.?boat|dinghy/i;
const MAX_EXCLUSIONS = 8;
const matrix = new THREE.Matrix4();
const rotation = new THREE.Quaternion();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const frustum = new THREE.Frustum();
const projection = new THREE.Matrix4();
const sphere = new THREE.Sphere();

function segmentDistanceSquared(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(dx * dx + dz * dz, 1e-8), 0, 1);
  return (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2;
}

/** One quad per moving water-route boat; stationary boats never acquire a wake. */
export class BoatWakes {
  constructor(game) {
    this.game = game;
    this.items = game.objects.filter(o => BOATS.test(o.proto?.name ?? '') &&
      o.mv?.type === 'route' && o.mv.route?.network === 'water' && o.mv.route.points?.length >= 2)
      .map(o => ({ o, route: o.mv.route, x: o.x, z: o.z, alpha: 0, nearest: [-1, -1, -1], distances: [Infinity, Infinity, Infinity] }));
    this.geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const count = this.items.length;
    const exclusions = (game.map?.water?.wakeExclusions ?? []).filter(rect =>
      rect && [rect.x, rect.z, rect.halfLength, rect.halfWidth].every(Number.isFinite) &&
      rect.halfLength > 0 && rect.halfWidth > 0 && Number.isFinite(rect.angle ?? 0)).slice(0, MAX_EXCLUSIONS);
    const exclusionBounds = Array.from({ length: MAX_EXCLUSIONS }, () => new THREE.Vector4());
    const exclusionAngles = new Float32Array(MAX_EXCLUSIONS);
    exclusions.forEach((rect, i) => {
      exclusionBounds[i].set(rect.x, rect.z, rect.halfLength, rect.halfWidth);
      exclusionAngles[i] = rect.angle ?? 0;
    });
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.info = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
    this.segments = [0, 1, 2].map(() => new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
    this.geometry.setAttribute('wakeAlpha', this.alpha);
    this.geometry.setAttribute('wakeInfo', this.info);
    this.segments.forEach((attribute, i) => this.geometry.setAttribute(`waterSegment${i}`, attribute));
    for (const attribute of [this.alpha, this.info, ...this.segments]) attribute.setUsage(THREE.DynamicDrawUsage);
    this.material = new THREE.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false,
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
      uniforms: {
        uTime: { value: 0 }, uHoles: holeUniforms.uHoles, uHoleCount: holeUniforms.uHoleCount,
        uExclusionBounds: { value: exclusionBounds }, uExclusionAngles: { value: exclusionAngles },
        uExclusionCount: { value: exclusions.length },
      },
      vertexShader: `
        attribute float wakeAlpha;
        attribute vec2 wakeInfo;
        attribute vec4 waterSegment0, waterSegment1, waterSegment2;
        varying vec2 vUv, vInfo;
        varying float vAlpha;
        varying vec3 vWorld;
        varying vec4 vSegment0, vSegment1, vSegment2;
        void main() {
          vUv = uv; vAlpha = wakeAlpha; vInfo = wakeInfo;
          vSegment0 = waterSegment0; vSegment1 = waterSegment1; vSegment2 = waterSegment2;
          vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uHoles[${MAX_HOLES}];
        uniform int uHoleCount;
        uniform vec4 uExclusionBounds[${MAX_EXCLUSIONS}];
        uniform float uExclusionAngles[${MAX_EXCLUSIONS}];
        uniform int uExclusionCount;
        varying vec2 vUv, vInfo;
        varying float vAlpha;
        varying vec3 vWorld;
        varying vec4 vSegment0, vSegment1, vSegment2;
        float corridor(vec4 segment) {
          vec2 d = segment.zw - segment.xy;
          float lengthSquared = dot(d, d);
          if (lengthSquared < 0.0001) return 0.0;
          float t = dot(vWorld.xz - segment.xy, d) / lengthSquared;
          // Conservative rectangles stay inside water, including at route endpoints.
          if (t < 0.0 || t > 1.0) return 0.0;
          float distance = length(vWorld.xz - segment.xy - d * t);
          return 1.0 - smoothstep(max(0.0, vInfo.x - 0.25), vInfo.x, distance);
        }
        void main() {
          if (vAlpha < 0.002) discard;
          float water = max(corridor(vSegment0), max(corridor(vSegment1), corridor(vSegment2)));
          if (water <= 0.0) discard;
          // Flat bridge decals may not write depth or solidity stencil.
          for (int i = 0; i < ${MAX_EXCLUSIONS}; i++) {
            if (i >= uExclusionCount) break;
            vec4 rect = uExclusionBounds[i];
            vec2 d = vWorld.xz - rect.xy;
            float c = cos(uExclusionAngles[i]), s = sin(uExclusionAngles[i]);
            vec2 local = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
            if (abs(local.x) <= rect.z && abs(local.y) <= rect.w) discard;
          }
          for (int i = 0; i < ${MAX_HOLES}; i++) {
            if (i >= uHoleCount) break;
            vec2 d = vWorld.xz - uHoles[i].xy;
            if (dot(d, d) < uHoles[i].z * uHoles[i].z) discard;
          }
          float trail = 1.0 - vUv.x;
          float across = abs(vUv.y - 0.5) * 2.0;
          float envelope = smoothstep(0.0, 0.1, trail) * (1.0 - smoothstep(0.45, 1.0, trail));
          float spread = 0.15 + trail * 0.72;
          float arms = exp(-pow((across - spread) / (0.08 + trail * 0.07), 2.0));
          float broken = smoothstep(-0.45, 0.6, sin(trail * 43.0 - uTime * 2.7 + vInfo.y) + sin(across * 21.0 + trail * 19.0) * 0.45);
          float soft = exp(-across * across / (0.03 + trail * 0.2)) * 0.14;
          float alpha = (arms * broken * 0.55 + soft) * envelope * vAlpha * water;
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(0.76, 0.91, 0.88, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    this.mesh.count = count;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0.6;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, matrix.makeScale(0, 0, 0));
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt, time) {
    const game = this.game;
    this.material.uniforms.uTime.value = time;
    projection.multiplyMatrices(game.camera.projectionMatrix, game.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projection);
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i], o = item.o, route = item.route;
      const distance = Math.hypot(o.x - item.x, o.z - item.z);
      item.x = o.x; item.z = o.z;
      const speed = dt > 0 ? distance / dt : 0;
      const eligible = o.state === IDLE && o.mv?.type === 'route' && o.mv.route === route;
      const moving = eligible && speed > 0.12 && distance < Math.max(2, (o.mv?.speed ?? 1) * dt * 3);
      const target = moving ? THREE.MathUtils.clamp(speed / 3.5, 0.15, 0.8) : 0;
      item.alpha += (target - item.alpha) * (1 - Math.exp(-Math.max(0, dt) * (moving ? 4 : 2.5)));
      const box = o.proto.geometry.boundingBox;
      const hullLength = (box.max.x - box.min.x) * o.scale;
      const hullWidth = (box.max.z - box.min.z) * o.scale;
      const length = Math.min(6, Math.max(1.8, hullLength * 0.65));
      const width = Math.min(Math.max(0.5, route.width * 0.55), Math.max(1.2, hullWidth * 2.4));
      const stern = Math.max(0.4, hullLength * 0.46);
      const forwardX = Math.cos(o.yaw), forwardZ = -Math.sin(o.yaw);
      const x = o.x - forwardX * (stern + length / 2), z = o.z - forwardZ * (stern + length / 2);
      sphere.center.set(x, 0.04, z); sphere.radius = Math.hypot(length, width) / 2;
      const cameraDistance = game.camera.position.distanceTo(sphere.center);
      const pixels = length * game.renderer.domElement.clientHeight /
        Math.max(1, 2 * cameraDistance * Math.tan(game.camera.fov * Math.PI / 360));
      const distanceFade = 1 - THREE.MathUtils.smoothstep(cameraDistance, 70, 130);
      const visible = eligible && item.alpha > 0.004 && pixels >= (game.high ? 5 : 10) && distanceFade > 0 && frustum.intersectsSphere(sphere);
      this.alpha.setX(i, visible ? item.alpha * distanceFade : 0);
      if (!visible) { this.mesh.setMatrixAt(i, matrix.makeScale(0, 0, 0)); continue; }
      // Three nearest centerline segments cover turns without a large shader route loop.
      item.nearest.fill(-1); item.distances.fill(Infinity);
      const points = route.points, segmentCount = route.loop ? points.length : points.length - 1;
      for (let j = 0; j < segmentCount; j++) {
        const d = segmentDistanceSquared(x, z, points[j], points[(j + 1) % points.length]);
        for (let rank = 0; rank < 3; rank++) if (d < item.distances[rank]) {
          for (let k = 2; k > rank; k--) { item.distances[k] = item.distances[k - 1]; item.nearest[k] = item.nearest[k - 1]; }
          item.distances[rank] = d; item.nearest[rank] = j; break;
        }
      }
      for (let rank = 0; rank < 3; rank++) {
        const j = item.nearest[rank], a = j < 0 ? null : points[j], b = j < 0 ? null : points[(j + 1) % points.length];
        this.segments[rank].setXYZW(i, a?.[0] ?? 0, a?.[1] ?? 0, b?.[0] ?? 0, b?.[1] ?? 0);
      }
      this.info.setXY(i, Math.max(0, route.width / 2 - 0.35), i * 1.79);
      position.set(x, game.map?.water?.wakeHeight ?? 0.04, z);
      rotation.setFromAxisAngle(up, o.yaw);
      scale.set(length, 1, width);
      this.mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
    }
    this.alpha.needsUpdate = this.info.needsUpdate = this.mesh.instanceMatrix.needsUpdate = true;
    for (const attribute of this.segments) attribute.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.items.length = 0;
  }
}

export default BoatWakes;
