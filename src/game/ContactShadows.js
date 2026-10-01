// Lightweight grounded contact shadows. One instanced quad draw keeps this cheap even in dense scenes.
import * as THREE from 'three';
import { holeUniforms, MAX_HOLES } from './Ground.js';
import { IDLE, WOBBLE } from './Swallow.js';

const BOATS = /gondola|vaporetto|rowing.?boat|boat|sailboat|motor.?boat|dinghy/i;
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

export class ContactShadows {
  constructor(game) {
    this.game = game;
    this.items = [];
    for (const o of game.objects) {
      if (!o.proto || BOATS.test(o.proto.name || '') || o.h < 0.35 || o.r < 0.25 || o.r > 9) continue;
      const box = o.proto.geometry.boundingBox;
      const hx = box ? Math.max(0.12, (box.max.x - box.min.x) * o.scale * 0.5 + 0.28) : o.r + 0.28;
      const hz = box ? Math.max(0.12, (box.max.z - box.min.z) * o.scale * 0.5 + 0.28) : o.r + 0.28;
      this.items.push({ o, hx, hz });
    }

    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
      uniforms: {
        uHoles: holeUniforms.uHoles,
        uHoleCount: holeUniforms.uHoleCount,
        uOpacity: { value: 0.16 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uHoles[${MAX_HOLES}];
        uniform int uHoleCount;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          for (int i = 0; i < ${MAX_HOLES}; i++) {
            if (i >= uHoleCount) break;
            vec2 d = vWorld.xz - uHoles[i].xy;
            if (dot(d, d) < uHoles[i].z * uHoles[i].z) discard;
          }
          vec2 p = (vUv - 0.5) * 2.0;
          float edge = length(p);
          float alpha = (1.0 - smoothstep(0.38, 1.0, edge)) * uOpacity;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(0.035, 0.04, 0.05, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length);
    this.mesh.count = this.items.length;
    this.mesh.frustumCulled = false;
    // Solid meshes write stencil at order 0; draw afterward so the NotEqual test can protect them.
    this.mesh.renderOrder = 0.5;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.updateMatrix();
    this.update();
  }

  update() {
    let changed = false;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { o, hx, hz } = item;
      const visible = o.state === IDLE || o.state === WOBBLE;
      const x = o.x, z = o.z, yaw = o.yaw;
      if (item.lastX === x && item.lastZ === z && item.lastYaw === yaw && item.lastVisible === visible) continue;
      item.lastX = x;
      item.lastZ = z;
      item.lastYaw = yaw;
      item.lastVisible = visible;
      changed = true;
      if (visible) {
        _position.set(o.x, 0.018, o.z);
        // Object Y rotation only; quad stays horizontal. Ground contact position follows mover coordinates.
        _quaternion.setFromAxisAngle(_up, yaw).multiply(_flat);
        _scale.set(hx, hz, 1);
        _matrix.compose(_position, _quaternion, _scale);
        this.mesh.setMatrixAt(i, _matrix);
      } else {
        this.mesh.setMatrixAt(i, _matrix.makeScale(0, 0, 0));
      }
    }
    if (changed) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.items.length = 0;
  }
}
