// Instanced rendering of idle static objects.
//
// Every placed object used to be its own Mesh (one draw call each, doubled by the shadow pass). Idle static objects
// now live in InstancedMeshes: one per (proto, cast-shadow flag, LOD level). Each group keeps a stable per-object slot
// (matrix + bounding sphere); every frame cull() frustum-tests the members against the camera (and the sun's shadow
// frustum for shadow casters) and packs only the visible ones into the InstancedMesh, so a proto costs one draw call per
// pass however many copies are placed, and off-screen copies cost no GPU work.
//
// An object that needs individual treatment (wobble, fall + fade, occlusion fade) is PROMOTED to a pooled plain Mesh
// (its slot is deactivated) and DEMOTED back once it is plain again. Movers are always plain Meshes. Sway
// (EnvironmentAnimation) rewrites the object's stored matrix in place.
//
// Object fields owned here: o.mesh (plain Mesh or null), o.group (non-null = instanceable static object, o.slot is its
// stable index there), o.batch (= o.group while the object is drawn as an instance, null while promoted),
// o.far (using the proto's geometryFar), o.cast (castShadow flag).
import * as THREE from 'three';
import { objectMaterial, objectDepthMaterial, applyObjectSurfaces } from '../objects/build.js';
import { markSolid } from './Hole.js';
import { IDLE } from './Swallow.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Vector3();
const _vp = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const CULL_MARGIN = 0.5; // world units added to every bounding sphere (sway, wind bend)

/** The object shaders read modelMatrix (uv scale, height, sway phase); with instancing the object transform is modelMatrix * instanceMatrix. */
function instancedCompile(original) {
  return function (shader, renderer) {
    original.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.split('modelMatrix[').join('(modelMatrix * instanceMatrix)[');
  };
}

/** Flattens a Frustum into [nx, ny, nz, constant] x 6. */
function planesOf(frustum, out) {
  for (let i = 0; i < 6; i++) {
    const p = frustum.planes[i];
    out[i * 4] = p.normal.x; out[i * 4 + 1] = p.normal.y; out[i * 4 + 2] = p.normal.z; out[i * 4 + 3] = p.constant;
  }
}

function visibleIn(planes, x, y, z, r) {
  for (let k = 0; k < 24; k += 4) {
    if (planes[k] * x + planes[k + 1] * y + planes[k + 2] * z + planes[k + 3] < -r) return false;
  }
  return true;
}

class Group {
  constructor(mgr, proto, cast, members) {
    const n = members.length;
    this.proto = proto;
    this.cast = cast;
    this.members = members;
    this.store = new Float32Array(n * 16); // resting / swaying transform of every member (stable slots)
    this.bounds = new Float32Array(n * 4); // world-space sphere: x, y, z, radius
    this.active = new Uint8Array(n); // 1 = drawn as an instance, 0 = promoted to its own Mesh
    this.farFlag = new Uint8Array(n);
    const make = (geometry) => {
      const mesh = new THREE.InstancedMesh(geometry, mgr.material, n);
      mesh.count = 0;
      mesh.visible = false;
      mesh.frustumCulled = false; // members are culled individually in cull()
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.customDepthMaterial = mgr.depthMaterial;
      mesh.castShadow = cast;
      mesh.receiveShadow = mgr.game.high;
      mesh.matrixAutoUpdate = false;
      return mesh;
    };
    this.near = make(proto.geometry);
    this.far = proto.geometryFar && !proto.articulation?.length ? make(proto.geometryFar) : null;
    const bs = proto.geometry.boundingSphere;
    members.forEach((o, i) => {
      o.group = this;
      o.batch = this;
      o.slot = i;
      this.active[i] = 1;
      _c.copy(bs.center).multiplyScalar(o.scale).applyAxisAngle(_up, o.yaw);
      this.bounds.set([o.x + _c.x, _c.y, o.z + _c.z, bs.radius * o.scale + CULL_MARGIN], i * 4);
      _p.set(o.x, 0, o.z);
      _q.setFromAxisAngle(_up, o.yaw);
      _s.setScalar(o.scale);
      _m.compose(_p, _q, _s).toArray(this.store, i * 16);
    });
  }

  /** Packs the members visible to the camera (or, for casters, to the sun's shadow camera) into the meshes. */
  cull(camPlanes, lightPlanes) {
    const { members, store, bounds, active, farFlag } = this;
    const near = this.near, far = this.far;
    const nearArr = near.instanceMatrix.array;
    const farArr = far ? far.instanceMatrix.array : null;
    let nn = 0, nf = 0;
    for (let i = 0, n = members.length; i < n; i++) {
      if (!active[i]) continue;
      const b = i * 4;
      const x = bounds[b], y = bounds[b + 1], z = bounds[b + 2], r = bounds[b + 3];
      if (!visibleIn(camPlanes, x, y, z, r) && !(lightPlanes && visibleIn(lightPlanes, x, y, z, r))) continue;
      const src = i * 16;
      if (farFlag[i]) farArr.set(store.subarray(src, src + 16), nf++ * 16);
      else nearArr.set(store.subarray(src, src + 16), nn++ * 16);
    }
    this.apply(near, nn);
    if (far) this.apply(far, nf);
  }

  apply(mesh, count) {
    if (count === 0 && mesh.count === 0) return;
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Instancing {
  constructor(game, enabled = true) {
    this.game = game;
    this.enabled = enabled;
    this.groups = [];
    this.pool = [];
    this.protoIds = new Map();
    this.camPlanes = new Float32Array(24);
    this.lightPlanes = new Float32Array(24);
    // Dedicated materials: a material flips program when it is drawn by both Mesh and InstancedMesh, so instanced
    // groups get their own twins (same shader program family, same stencil / surface setup).
    this.material = applyObjectSurfaces(objectMaterial.clone());
    this.material.onBeforeCompile = instancedCompile(this.material.onBeforeCompile);
    this.material.customProgramCacheKey = ((key) => () => key() + '-instanced')(this.material.customProgramCacheKey);
    markSolid(this.material);
    this.depthMaterial = objectDepthMaterial.clone();
    this.depthMaterial.onBeforeCompile = instancedCompile(objectDepthMaterial.onBeforeCompile);
    this.depthMaterial.customProgramCacheKey = () => 'crown-wind-depth-v1-instanced';
  }

  // ---- individual meshes ----------------------------------------------------

  acquireMesh(o) {
    const p = o.proto;
    let m = this.pool.pop();
    if (!m) {
      m = new THREE.Mesh(p.geometry, objectMaterial);
      m.matrixAutoUpdate = false;
    }
    m.geometry = o.far && p.geometryFar ? p.geometryFar : p.geometry;
    m.material = objectMaterial;
    m.customDepthMaterial = p.windStart != null ? objectDepthMaterial : undefined;
    m.castShadow = o.cast;
    m.receiveShadow = this.game.high;
    return m;
  }

  /** Plain Mesh at the object's rest pose (movers, and every object when instancing is off). */
  createMesh(o) {
    const m = this.acquireMesh(o);
    m.position.set(o.x, 0, o.z);
    m.rotation.set(0, o.yaw, 0);
    m.scale.setScalar(o.scale);
    m.updateMatrix();
    o.mesh = m;
    this.game.scene.add(m);
    return m;
  }

  /** Returns the object's individual Mesh, taking it out of its instance group if needed. */
  promote(o) {
    if (o.mesh) return o.mesh;
    const g = o.group;
    const m = this.acquireMesh(o);
    m.matrix.fromArray(g.store, o.slot * 16);
    m.matrix.decompose(m.position, m.quaternion, m.scale);
    m.matrixWorldNeedsUpdate = true;
    g.active[o.slot] = 0;
    o.batch = null;
    o.mesh = m;
    this.game.scene.add(m);
    return m;
  }

  /** Puts an object back into its instance group when nothing needs its individual Mesh any more. */
  demote(o) {
    const m = o.mesh;
    if (!m || !o.group || o.state !== IDLE || o.fading || o.fallMat || o.animation?.geometry) return false;
    const g = o.group;
    this.game.scene.remove(m);
    this.pool.push(m);
    o.mesh = null;
    g.store.set(m.matrix.elements, o.slot * 16);
    g.farFlag[o.slot] = o.far && g.far ? 1 : 0;
    g.active[o.slot] = 1;
    o.batch = g;
    return true;
  }

  /** The object is gone (swallowed): recycle its Mesh. */
  release(o) {
    const m = o.mesh;
    if (!m) return;
    this.game.scene.remove(m);
    this.pool.push(m);
    o.mesh = null;
  }

  /** Object transform (mesh or instance) into `out`. */
  getMatrix(o, out) {
    return o.mesh ? out.copy(o.mesh.matrix) : out.fromArray(o.group.store, o.slot * 16);
  }

  // ---- instance groups --------------------------------------------------------

  /** Call once after populate(): every static object goes into an instance group. */
  build() {
    const game = this.game;
    const byKind = new Map();
    for (const o of game.objects) {
      if (o.mesh) continue;
      if (!this.enabled) { this.createMesh(o); continue; }
      let id = this.protoIds.get(o.proto);
      if (id === undefined) this.protoIds.set(o.proto, (id = this.protoIds.size));
      const key = id * 2 + (o.cast ? 1 : 0);
      let k = byKind.get(key);
      if (!k) byKind.set(key, (k = { proto: o.proto, cast: o.cast, members: [] }));
      k.members.push(o);
    }
    for (const k of byKind.values()) {
      const g = new Group(this, k.proto, k.cast, k.members);
      this.groups.push(g);
      game.scene.add(g.near);
      if (g.far) game.scene.add(g.far);
    }
  }

  /** Per frame, right before rendering: pack the visible members of every group. */
  cull() {
    if (!this.groups.length) return;
    const game = this.game;
    game.camera.updateMatrixWorld();
    _vp.multiplyMatrices(game.camera.projectionMatrix, game.camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_vp);
    planesOf(_frustum, this.camPlanes);
    let light = null;
    const sun = game.sun;
    if (game.high && game.shadowsOn && sun?.castShadow) {
      // Same camera placement three.js derives for the sun's shadow map.
      const sc = sun.shadow.camera;
      sc.position.copy(sun.position);
      sc.lookAt(sun.target.position);
      sc.updateMatrixWorld();
      _vp.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_vp);
      planesOf(_frustum, this.lightPlanes);
      light = this.lightPlanes;
    }
    for (const g of this.groups) g.cull(this.camPlanes, g.cast ? light : null);
  }

  /** Switch an object between the full and far geometry (ModelLOD). */
  setFar(o, far) {
    if (o.far === far) return;
    o.far = far;
    if (o.mesh) o.mesh.geometry = far ? o.proto.geometryFar : o.proto.geometry;
    else if (o.group?.far) o.group.farFlag[o.slot] = far ? 1 : 0;
  }

  /** Visual-only pose for an instanced object (sway): y offset plus x/z tilt over the rest yaw. */
  setPose(o, y, rx, rz) {
    const g = o.batch;
    if (!g) return;
    _p.set(o.x, y, o.z);
    _q.setFromEuler(_e.set(rx, o.yaw, rz, 'XYZ'));
    _s.setScalar(o.scale);
    _m.compose(_p, _q, _s).toArray(g.store, o.slot * 16);
  }

  dispose() {
    for (const g of this.groups) {
      for (const mesh of [g.near, g.far]) {
        if (!mesh) continue;
        this.game.scene?.remove(mesh);
        mesh.dispose();
      }
    }
    this.groups.length = 0;
    this.pool.length = 0;
    this.material.dispose();
    this.depthMaterial.dispose();
  }
}

/**
 * Swaps objects between full / far geometry by screen size and visibility (static models share both levels).
 * Works on individual meshes and on instance groups alike.
 */
export class InstanceLOD {
  constructor(game) {
    this.game = game;
    this.items = game.objects.filter((o) => o.proto.geometryFar && !o.proto.articulation?.length);
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
      const far = !g.high || !this.frustum.intersectsSphere(this.bounds) || pixels < (o.far ? 60 : 45);
      g.instances.setFar(o, far);
    }
  }

  dispose() { this.items.length = 0; }
}
