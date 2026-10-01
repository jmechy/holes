import * as THREE from 'three';
import { createGround, makeDecalMaterial, holeUniforms, timeUniform, setGroundQuality, MAX_HOLES } from './Ground.js';
import { Scenery, edgeHoleUniform, applyHoleDiscard } from './Scenery.js';
import { Hole, PLAYER_COLOR, markSolid, setHoleTint } from './Hole.js';
import { Effects } from './Effects.js';
import { SpatialGrid, CELL } from './SpatialGrid.js';
import { AI } from './AI.js';
import { swallowNear, updateActive, holeVsHole, disposeFallMaterials, IDLE, FALLING } from './Swallow.js';
import { Movers, createRoute, routePointAt, routeDistance } from './Movers.js';
import { Occlusion } from './Occlusion.js';
import { animateModels, disposeModelAnimation } from './ModelAnimation.js';
import { EnvironmentAnimation } from './EnvironmentAnimation.js';
import { createSkyEnvironment, getLightingConfig } from './Lighting.js';
import { MapPostProcessing } from './RomePostProcessing.js';
import { ContactShadows } from './ContactShadows.js';
import { BoatWakes } from './BoatWakes.js';
import { Instancing, InstanceLOD } from './Instancing.js';
import { AdaptiveQuality } from './AdaptiveQuality.js';
import { objectMaterial, objectMaterialHigh, objectMaterialLow, modelTimeUniform, setObjectQuality } from '../objects/build.js';
import { getSettings } from '../settings.js';
import { audio } from '../audio.js';

export const RESPAWN_TIME = 3;
export const TIME_ATTACK_SECONDS = 60;
export const ARCADE_START_SECONDS = 60;
export const ARCADE_COMBO_WINDOW = 1.2;
const SUN_DIR = new THREE.Vector3(40, 60, 25).normalize();
// Light-space axes of the sun's shadow camera (used to snap the shadow box to texels so shadows don't shimmer).
const SUN_RIGHT = new THREE.Vector3().crossVectors(SUN_DIR.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
const SUN_UP = new THREE.Vector3().crossVectors(SUN_RIGHT, SUN_DIR.clone().negate()).normalize();
const SHADOW_MAP = 2048;
const SHADOW_MIN_H = 0.6; // objects shorter than this don't cast shadows
const arcadeGain = (value) => Math.min(4, Math.max(0.06, 0.06 + value * 0.175));
const SPAWN_CLEAR = 5; // no objects placed within this distance of the player spawn (0,0)
const CAM_ANGLE = (62 * Math.PI) / 180;
const STALL_SECONDS = 45; // 'all items' goal: give up when this long passes with nothing swallowed near the end

const RIVALS = [
  { name: 'Bot Bob', color: '#ff4d4d' },
  { name: 'Bot Sue', color: '#3ddc6b' },
  { name: 'Bot Max', color: '#b06cff' },
  { name: 'Bot Zoe', color: '#ff9a2e' },
];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Game {
  constructor(canvas, { hud, input }) {
    this.canvas = canvas;
    this.hud = hud;
    this.input = input;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed in three r186
    markSolid(objectMaterialHigh);
    markSolid(objectMaterialLow);
    this.high = true;
    this.time = 0;
    this.shadowHalf = 0;
    this.shadowHalf0 = 0;
    this.frameN = 0;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1000);
    this.scene = null;
    this.state = 'idle'; // idle | playing | paused | ending | ended
    this.onFinish = null;
    this.tmp = [];
    this.holes = [];
    this.live = [];
    this.active = [];
    this.objects = [];
    this.last = performance.now();
    this.boardT = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    // Auto-pause when the page is backgrounded / loses focus so coming back doesn't drop you into action.
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    window.addEventListener('blur', () => this.pause());
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Applies the Graphics setting (Auto / High / Low). Called on every game start. Auto builds High and adapts live. */
  applyQuality() {
    const mode = getSettings().graphics;
    const high = (this.high = mode !== 'low');
    const r = this.renderer;
    this.adaptive = mode === 'low' || mode === 'high' ? null : (this.adaptive || new AdaptiveQuality(this));
    const cap = high ? 2 : 1.25;
    this.shadowsOn = high;
    this.postOn = true;
    this.shadowRate = 2; // the sun shadow map re-renders every `shadowRate` frames
    this.shadowSize = SHADOW_MAP;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    r.shadowMap.enabled = high;
    setObjectQuality(high, r);
    this.resize();
  }

  /** Adaptive-quality knobs applied to the live world (see AdaptiveQuality). Safe to call repeatedly. */
  setDynamicQuality({ post, shadowRate, shadowSize, pixelRatio, shadows }) {
    this.postOn = post;
    this.shadowRate = shadowRate;
    const r = this.renderer;
    const pr = Math.min(window.devicePixelRatio || 1, pixelRatio);
    if (r.getPixelRatio() !== pr) { r.setPixelRatio(pr); this.resize(); }
    if (shadowSize !== this.shadowSize) {
      this.shadowSize = shadowSize;
      const sh = this.sun?.shadow;
      if (sh) {
        sh.mapSize.set(shadowSize, shadowSize);
        sh.dispose();
        sh.map = null;
        this.shadowHalf = 0; // recompute texel size / snapping
      }
    }
    if (shadows !== this.shadowsOn) {
      this.shadowsOn = shadows;
      r.shadowMap.enabled = shadows && this.high;
      if (this.sun) this.sun.castShadow = shadows && this.high;
      for (const m of [objectMaterial, this.instances?.material]) if (m) m.needsUpdate = true;
      this.scene?.traverse((o) => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; });
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.postProcessing?.setSize(w, h);
    if (this.scene && this.testView && this.opts.mode === 'test') {
      if (this.testView.overview) this.fitTestView();
      else {
        this.testView.fit = this.testFitDistance();
        this.testView.d = Math.min(this.testView.d, this.testView.fit * 2.5);
        this.updateCamera(0, true);
        this.scenery.update(0, this.camera, this.time);
        this.updateShadow();
      }
    }
  }

  // ---- lifecycle ----------------------------------------------------------

  /** opts: { mode: 'adventure'|'pick'|'time'|'arcade'|'test', goal, rivals, rivalCount } */
  start(map, opts) {
    this.disposeWorld();
    this.map = map;
    this.opts = opts;
    this.applyQuality();
    this.buildWorld();
    this.adaptive?.onWorld();
    this.state = 'playing';
    this.input.setTestMode(opts.mode === 'test', (factor) => this.zoomTestView(factor));
    this.input.setEnabled(true);
    this.hud.show(map, opts.mode);
    this.hud.showPause(false);
    this.hud.showRespawn(false);
    this.updateHud(true);
  }

  restart() {
    this.start(this.map, this.opts);
  }

  stop() {
    this.state = 'idle';
    this.input.setEnabled(false);
    this.input.setTestMode(false);
    this.disposeWorld();
    this.hud.hide();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.hud.showPause(true);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.setEnabled(true);
    this.hud.showPause(false);
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  disposeWorld() {
    this.effects?.dispose();
    this.effects = null;
    this.boatWakes?.dispose();
    this.boatWakes = null;
    this.modelLOD?.dispose();
    this.modelLOD = null;
    this.postProcessing?.dispose();
    this.postProcessing = null;
    this.contactShadows?.dispose();
    this.contactShadows = null;
    this.environmentAnimation?.dispose();
    this.environmentAnimation = null;
    this.environmentMap?.dispose();
    this.environmentMap = null;
    this.sun?.shadow.dispose(); // frees the shadow map render target (was leaking 2 textures per restart)
    this.sun = null;
    this.objects?.forEach(disposeModelAnimation);
    this.instances?.dispose();
    this.instances = null;
    if (this.protos) Object.values(this.protos).forEach((p) => {
      p.geometry.dispose();
      p.geometryFar?.dispose();
    });
    if (this.staticGroup) {
      this.staticGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
        if (o.isInstancedMesh) o.dispose(); // frees the instance matrix / colour buffers
      });
    }
    this.holes.forEach((h) => h.dispose());
    disposeFallMaterials();
    this.occlusion?.dispose();
    this.occlusion = null;
    this.movers = null;
    this.routes = [];
    this.scene = null;
    this.player = null;
    this.testView = null;
    this.scenery = null;
    this.protos = null;
    this.staticGroup = null;
    this.holes = [];
    this.live = [];
    this.active = [];
    this.objects = [];
    this.ais = [];
    holeUniforms.uHoleCount.value = 0;
  }

  // ---- world construction ------------------------------------------------

  buildWorld() {
    const map = this.map;
    const S = (this.size = map.size);
    const scene = (this.scene = new THREE.Scene());
    const high = this.high;
    const lighting = getLightingConfig(map);
    this.renderer.toneMappingExposure = lighting.exposure;
    this.environmentMap = high ? createSkyEnvironment(this.renderer, map) : null;
    scene.environment = this.environmentMap?.texture ?? null;
    scene.environmentIntensity = lighting.environmentIntensity;
    setGroundQuality(high, map.clouds ?? !map.stars, map.water); // before any ground/decal/backdrop material is built
    const sky = new Scenery(map, { high });
    this.scenery = sky;
    scene.background = sky.horizon.clone();
    scene.fog = new THREE.Fog(sky.horizon.clone(), 40, 300);
    scene.add(new THREE.HemisphereLight(lighting.hemiSkyColor, lighting.hemiGroundColor, lighting.hemiIntensity));
    const sun = (this.sun = new THREE.DirectionalLight(lighting.sunColor, lighting.sunIntensity));
    sun.position.copy(SUN_DIR).multiplyScalar(200);
    scene.add(sun, sun.target);
    if (high) {
      sun.castShadow = this.shadowsOn;
      sun.shadow.mapSize.set(this.shadowSize, this.shadowSize);
      sun.shadow.bias = -0.0004;
      sun.shadow.radius = lighting.shadowRadius;
      sun.shadow.intensity = lighting.shadowOpacity;
      sun.shadow.autoUpdate = false; // re-rendered every other frame (see updateShadow)
      this.shadowHalf = 0;
    }

    const staticGroup = (this.staticGroup = new THREE.Group());
    staticGroup.add(sky.group);
    const ground = createGround(map, sky.skirtColor);
    if (ground.children[1]?.material) applyHoleDiscard(ground.children[1].material); // outer skirt (under the backdrop)
    staticGroup.add(ground);
    scene.add(staticGroup);

    this.grid = new SpatialGrid(S, CELL);
    this.movers = new Movers(this);
    this.instances = new Instancing(this, !(import.meta.env?.DEV && /[?&]noinstancing\b/.test(location.search)));
    this.routes = [];
    this.occlusion = this.opts.mode === 'test' ? null : new Occlusion(this, this.high);
    this.maxR = 1;
    const rand = mulberry32(hashSeed(map.id));
    let decalN = 0;
    const protos = (this.protos = map.buildProtos());
    const ctx = {
      scene,
      protos,
      size: S,
      rand,
      randRange: (a, b) => a + rand() * (b - a),
      pick: (arr) => arr[Math.floor(rand() * arr.length)],
      place: (name, x, z, rotY, scale = 1, opts) => this.placeObject(rand, name, x, z, rotY, scale, opts),
      addRoute: (points, opts) => {
        if (this.objects.length) console.warn('addRoute: call it in decorate() before any place(); earlier objects may sit on the route');
        const route = createRoute(points, opts);
        this.routes.push(route);
        return route;
      },
      placeOnRoute: (name, route, opts) => this.placeOnRoute(rand, name, route, opts),
      addDecal: (geometry, color, dopts) => {
        const m = new THREE.Mesh(geometry, makeDecalMaterial(color, dopts?.style));
        m.position.y = 0.01 + decalN++ * 0.002;
        if (this.opts.mode === 'test') {
          // At overview distances the thin decal layers can share a depth value.
          // Preserve their paint order while still testing against solid objects.
          m.renderOrder = decalN * 0.001;
          m.material.depthWrite = false;
        }
        m.receiveShadow = high;
        staticGroup.add(m);
        return m;
      },
      parkingLot: (cx, cz, w, d, o) => this.parkingLot(ctx, cx, cz, w, d, o),
      roadsideSpots: (route, o) => this.roadsideSpots(route, o),
      placeParked: (name, spot, o = {}) => {
        const { scale = 1, ...rest } = o;
        return this.placeObject(rand, name, spot.x, spot.z, spot.rotY, scale, { move: null, tight: true, ...rest });
      },
      // Convenience: flat geometries lying on the ground (y=0), for use with addDecal.
      rect: (x, z, w, d, rotY = 0) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).rotateY(rotY).translate(x, 0, z),
      circle: (x, z, r, segs = 24) => new THREE.CircleGeometry(r, segs).rotateX(-Math.PI / 2).translate(x, 0, z),
      merge: (geos) => mergeFlat(geos),
    };
    map.decorate?.(ctx);
    map.populate(ctx);
    this.instances.build();
    this.environmentAnimation = new EnvironmentAnimation(this);
    this.modelLOD = new InstanceLOD(this);
    this.boatWakes = high && map.water?.wakes ? new BoatWakes(this) : null;
    if (this.boatWakes) scene.add(this.boatWakes.mesh);
    this.contactShadows = high ? new ContactShadows(this) : null;
    if (this.contactShadows) scene.add(this.contactShadows.mesh);
    this.total = this.objects.length;
    this.removed = 0;

    // Holes
    this.holes = [];
    this.ais = [];
    const test = this.opts.mode === 'test';
    if (!test) {
      this.player = new Hole({ name: 'You', color: PLAYER_COLOR, isPlayer: true });
      this.player.reset(0, 0, S);
      this.holes.push(this.player);
      scene.add(this.player.group);
    }
    if (!test && this.opts.rivals) {
      const n = Math.max(0, Math.min(RIVALS.length, this.opts.rivalCount, MAX_HOLES - 1));
      for (let i = 0; i < n; i++) {
        const h = new Hole({ name: RIVALS[i].name, color: RIVALS[i].color });
        const sp = this.findSpawn(h);
        h.reset(sp.x, sp.z, S);
        h.ai = new AI(h);
        this.holes.push(h);
        this.ais.push(h.ai);
        scene.add(h.group);
      }
    }

    // Outlines ignore depth (so decals / ground / edge geometry never hide them) and are masked by object stencil;
    // still keep them above the highest stacked decal so the ordering is right even without that.
    const decalTop = 0.01 + decalN * 0.002;
    setHoleTint(map.groundColor);
    for (const h of this.holes) h.setBaseY(Math.max(h.ring.position.y, decalTop + 0.01));
    this.effects = test ? null : new Effects(this);

    this.timeLeft = test ? null : this.opts.mode === 'arcade' ? ARCADE_START_SECONDS : TIME_ATTACK_SECONDS;
    this.arc = test ? null : { score: 0, combo: 0, comboT: 0, bestCombo: 0, maxLevel: 1, gainPending: 0, gainT: 0, elapsed: 0, lastTick: -1, bonus: 0 };
    this.endT = 0;
    this.lastLevel = 1;
    this.peak = this.player?.targetRadius ?? 0;
    this.sinceSwallow = 0;
    this.stallT = 0;
    this.cam = { x: 0, z: 0, d: 20 };
    if (test) {
      this.testView = { x: 0, z: 0, d: 20, fit: 20, overview: true };
      this.fitTestView();
    } else this.updateCamera(0, true);
    this.camera.updateMatrixWorld();
    this.modelLOD.update(0, true);
    if (high && map.postProcessing) {
      this.postProcessing = new MapPostProcessing(this.renderer, scene, this.camera, map.postProcessing);
      this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }
  }

  placeObject(rand, name, x, z, rotY, scale, opts) {
    const p = this.protos[name];
    if (!p) {
      console.warn(`place: unknown proto "${name}"`);
      return false;
    }
    if (rotY === undefined || rotY === null) rotY = rand() * Math.PI * 2;
    const r = p.radius * scale;
    const S = this.size;
    if (Math.abs(x) > S - r - 1 || Math.abs(z) > S - r - 1) return false;
    if (Math.hypot(x, z) < r + SPAWN_CLEAR) return false;
    const move = opts && 'move' in opts ? opts.move : p.move;
    // opts.tight (placeParked): parallel-parked cars only need their narrow half-width clear of a route corridor,
    // and neighbouring circles may overlap (stalls are narrower than a car's bounding circle).
    const tight = !!(opts && opts.tight);
    const overlap = (opts && opts.overlap) ?? (tight ? 0.5 : 0.92);
    let corridorR = r;
    if (tight) {
      const bb = p.geometry.boundingBox;
      corridorR = Math.min(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 * scale;
    }
    // Static objects keep route corridors clear.
    if (!move) {
      for (let i = 0; i < this.routes.length; i++) {
        const R = this.routes[i];
        if (routeDistance(R, x, z) < corridorR + R.width / 2) return false;
      }
    }
    const out = this.tmp;
    out.length = 0;
    this.grid.query(x, z, r + this.maxR, out);
    for (let i = 0; i < out.length; i++) {
      const o = out[i];
      if (Math.hypot(o.x - x, o.z - z) < (o.r + r) * overlap) return false;
    }
    const o = this.spawnObject(p, x, z, rotY, scale, !!move);
    if (move) this.movers.add(o, move);
    return true;
  }

  /** Vehicles evenly spaced along a route. Returns the number placed. */
  placeOnRoute(rand, name, route, opts = {}) {
    const p = this.protos[name];
    if (!p) {
      console.warn(`placeOnRoute: unknown proto "${name}"`);
      return 0;
    }
    if (!route || !(route.total > 0)) return 0;
    const { count = 1, speed = 6, offset = 0, speedJitter = 0, scale = 1 } = opts;
    const r = p.radius * scale;
    const S = this.size;
    const step = route.total / Math.max(1, count);
    const phase = rand() * step;
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const s = phase + i * step;
      const o = this.spawnObject(p, 0, 0, 0, scale, true);
      this.movers.add(o, { type: 'route', route, s, offset, speed: speed * (1 + (rand() * 2 - 1) * speedJitter) });
      this.movers.evalRoute(o, o.mv, 0);
      let safe = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        if (Math.abs(o.x) <= S - r - 1 && Math.abs(o.z) <= S - r - 1 &&
            Math.hypot(o.x, o.z) >= r + SPAWN_CLEAR && this.movers.traffic.canSpawn(o)) {
          safe = true;
          break;
        }
        o.mv.s = (o.mv.s + o.mv.path.total * 0.61803398875) % o.mv.path.total;
        this.movers.evalRoute(o, o.mv, 0);
      }
      if (!safe) {
        this.discardObject(o);
        continue;
      }
      placed++;
    }
    return placed;
  }

  /** individual: movers get their own Mesh now; static objects are batched into instances by instances.build(). */
  spawnObject(p, x, z, rotY, scale, individual = false) {
    const r = p.radius * scale;
    const o = {
      mesh: null, batch: null, slot: -1, group: null, far: false, cast: this.high && p.height * scale > SHADOW_MIN_H, proto: p, x, z, y: 0, yaw: rotY, scale, r, h: p.height * scale,
      value: p.value * scale * scale * scale,
      state: IDLE, inActive: false, idx: this.live.length, trafficId: this.objects.length, cellKey: -1, mv: null, mvIdx: -1,
    };
    this.live.push(o);
    this.objects.push(o);
    this.grid.insert(o);
    if (r > this.maxR) this.maxR = r;
    if (individual) this.instances.createMesh(o);
    return o;
  }

  /** Undo spawnObject (only valid for the most recently spawned object). */
  discardObject(o) {
    disposeModelAnimation(o);
    this.grid.remove(o);
    this.removeLive(o);
    this.objects.pop();
    if (o.mv) this.movers.remove(o);
    this.instances.release(o);
  }

  removeLive(o) {
    const last = this.live[this.live.length - 1];
    this.live[o.idx] = last;
    last.idx = o.idx;
    this.live.pop();
  }

  /**
   * Asphalt lot with painted stall lines. Returns stall spots [{x, z, rotY}] (rotY: a +X-forward car sits nose-in).
   * Local frame: w along X, d along Z, rotated by rotY like ctx.rect. Double-loaded rows around aisles.
   */
  parkingLot(ctx, cx, cz, w, d, o = {}) {
    const { rotY = 0, stallW = 3, stallD = 5.5, aisle = 7, color = '#54575c', lineColor = '#e8e8e8' } = o;
    const m = 1; // margin
    const c = Math.cos(rotY), sn = Math.sin(rotY);
    const toWorld = (lx, lz) => [cx + lx * c + lz * sn, cz - lx * sn + lz * c];
    const lot = (lw, ld, lx, lz) => new THREE.PlaneGeometry(lw, ld).rotateX(-Math.PI / 2).translate(lx, 0, lz).rotateY(rotY).translate(cx, 0, cz);
    ctx.addDecal(lot(w, d, 0, 0), color, { style: 'asphalt' });
    const nx = Math.max(0, Math.floor((w - 2 * m) / stallW));
    const mod = 2 * stallD + aisle;
    let nMod = Math.floor((d - 2 * m) / mod);
    let singleRow = false;
    if (nMod < 1) { nMod = 1; singleRow = d - 2 * m >= stallD + aisle * 0.6; if (!singleRow) return []; }
    const total = singleRow ? stallD + aisle : nMod * mod;
    const z0 = -total / 2;
    const spots = [];
    const lines = [];
    const x0 = -(nx * stallW) / 2;
    const addRow = (zc, noseSign) => {
      for (let i = 0; i <= nx; i++) lines.push(lot(0.16, stallD * 0.96, x0 + i * stallW, zc));
      const rot = Math.atan2(-(noseSign * c), noseSign * sn);
      for (let i = 0; i < nx; i++) {
        const [wx, wz] = toWorld(x0 + (i + 0.5) * stallW, zc);
        spots.push({ x: wx, z: wz, rotY: rot });
      }
    };
    for (let k = 0; k < nMod; k++) {
      const zA = z0 + k * mod + stallD / 2;
      addRow(zA, -1); // lower-z row: nose towards -Z (the row's back edge)
      if (!(singleRow)) addRow(zA + stallD + aisle, +1);
    }
    if (lines.length) ctx.addDecal(ctx.merge(lines), lineColor, { style: 'asphalt' });
    return spots;
  }

  /** Parallel-parking spots along a route's curb (outside its corridor), aligned with the road; skips corners. */
  roadsideSpots(route, o = {}) {
    const { side = 'right', spacing = 7, gap = 0.6, from = 0, to = 1, carWidth = 2.2, maxTurn = 0.5 } = o;
    const out = [];
    if (!route || !(route.total > 0)) return out;
    const total = route.total;
    const s0 = from * total, s1 = to * total;
    const sign = side === 'left' ? -1 : 1;
    const lat = sign * (route.width / 2 + gap + carWidth / 2);
    const A = { x: 0, z: 0 }, B = { x: 0, z: 0 };
    const heading = (s) => {
      routePointAt(route, s - 0.6, A);
      routePointAt(route, s + 0.6, B);
      return Math.atan2(B.z - A.z, B.x - A.x);
    };
    const W = spacing * 1.2 + route.width * 0.5;
    const S = this.size;
    for (let s = s0 + spacing / 2; s <= s1 - spacing / 2 + 1e-6; s += spacing) {
      let turn = heading(s + W) - heading(s - W);
      turn -= Math.PI * 2 * Math.round(turn / (Math.PI * 2));
      if (Math.abs(turn) > maxTurn) continue;
      routePointAt(route, s - 0.6, A);
      routePointAt(route, s + 0.6, B);
      let fx = B.x - A.x, fz = B.z - A.z;
      const l = Math.hypot(fx, fz) || 1;
      fx /= l; fz /= l;
      const x = (A.x + B.x) / 2 - fz * lat;
      const z = (A.z + B.z) / 2 + fx * lat;
      if (Math.abs(x) > S - 4 || Math.abs(z) > S - 4) continue;
      let blocked = false;
      for (const R of this.routes) {
        if (R !== route && routeDistance(R, x, z) < R.width / 2 + carWidth / 2) { blocked = true; break; }
      }
      if (blocked) continue;
      out.push({ x, z, rotY: Math.atan2(-fz, fx) });
    }
    return out;
  }

  findSpawn(hole) {
    let best = { x: 0, z: 0 }, bestD = -1;
    const lim = this.size * 0.85;
    for (let i = 0; i < 24; i++) {
      const x = (Math.random() * 2 - 1) * lim, z = (Math.random() * 2 - 1) * lim;
      let d = 1e9;
      for (const h of this.holes) if (h !== hole && h.alive) d = Math.min(d, Math.hypot(h.x - x, h.z - z) - h.r);
      if (d > bestD) { bestD = d; best = { x, z }; }
    }
    return best;
  }

  // ---- events ------------------------------------------------------------

  onSwallowed(o) {
    disposeModelAnimation(o);
    const h = o.hole;
    h.addArea(o.value);
    h.count++;
    this.removed++;
    this.sinceSwallow = 0;
    if (h.isPlayer) {
      audio.pop();
      if (this.opts.mode === 'arcade' && this.state === 'playing') this.arcadeSwallow(o);
    }
  }

  // ---- arcade ----------------------------------------------------------------

  arcadeMult() {
    return 1 + Math.min(this.arc.combo - 1, 40) * 0.05;
  }

  addTime(sec) {
    this.timeLeft += sec;
    this.arc.gainPending += sec;
  }

  arcadeSwallow(o) {
    const a = this.arc;
    a.combo = a.comboT > 0 ? a.combo + 1 : 1;
    a.comboT = ARCADE_COMBO_WINDOW;
    if (a.combo > a.bestCombo) a.bestCombo = a.combo;
    let gain = arcadeGain(o.value);
    const c = a.combo;
    const milestone = c === 5 ? 1 : c === 10 ? 2 : c === 20 ? 4 : c >= 30 && c % 10 === 0 ? 5 : 0;
    if (milestone) {
      gain += milestone;
      this.hud.popup(`Combo x${c}! +${milestone}s`, 1200);
      audio.levelUp();
      if (c >= 10) this.effects?.sparkle(this.player, c >= 20 ? 1.6 : 1);
    }
    a.score += Math.round(Math.max(1, o.value * 10) * this.arcadeMult());
    this.addTime(gain);
  }

  /** Per-frame arcade bookkeeping: combo decay, batched "+Xs" popups, low-time ticking. */
  updateArcade(dt) {
    const a = this.arc;
    a.elapsed += dt;
    if (a.comboT > 0) {
      a.comboT -= dt;
      if (a.comboT <= 0) { a.comboT = 0; a.combo = 0; }
    }
    a.gainT -= dt;
    if (a.gainPending > 0.05 && a.gainT <= 0) {
      const g = a.gainPending;
      a.gainPending = 0;
      a.gainT = 0.45;
      this.hud.timeGain(`+${g < 10 ? g.toFixed(1) : Math.round(g)}s`);
    }
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const s = Math.ceil(this.timeLeft);
    if (s !== a.lastTick) {
      a.lastTick = s;
      if (s > 0 && s <= 10) { audio.tick(); this.hud.flashTimer('bad'); }
    }
  }

  onHoleEaten(a, b) {
    b.setAlive(false);
    b.respawnT = RESPAWN_TIME;
    b.vx = b.vz = 0;
    a.addArea(b.area * 0.5);
    // Objects still dropping into the victim's pit now fall (and score) for the attacker.
    for (const o of this.active) if (o.state === FALLING && o.hole === b) o.hole = a;
    if (b.isPlayer) {
      audio.eaten();
      if (this.state === 'playing') this.hud.showRespawn(true);
    } else if (a.isPlayer) {
      audio.levelUp();
      this.hud.popup(`Ate ${b.name}!`);
      if (this.opts.mode === 'arcade' && this.state === 'playing') {
        this.arc.combo = this.arc.comboT > 0 ? this.arc.combo : 1;
        this.arc.comboT = ARCADE_COMBO_WINDOW;
        this.arc.score += Math.round(300 * this.arcadeMult());
        this.addTime(5);
      }
    }
    if (b.isPlayer && this.opts.mode === 'arcade') { this.arc.combo = 0; this.arc.comboT = 0; }
  }

  // ---- per-frame ---------------------------------------------------------

  loop(t) {
    requestAnimationFrame((tt) => this.loop(tt));
    const raw = (t - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = t;
    if (this.adaptive && this.scene && this.state === 'playing') this.adaptive.sample(raw);
    this.time += dt;
    timeUniform.value = this.time;
    modelTimeUniform.value = this.time;
    if (!this.scene || this.state === 'idle') return;
    if (this.state === 'playing' || this.state === 'ending') this.update(dt);
    this.instances?.cull(); // pack the instances visible to the camera / sun shadow before drawing
    if (this.postProcessing && this.postOn) this.postProcessing.render();
    else this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const S = this.size;
    const p = this.player;
    this.input.poll();
    if (this.opts.mode === 'test') {
      const view = this.testView;
      if (this.input.x || this.input.z) {
        const speed = view.d * 0.3;
        view.x = Math.max(-S, Math.min(S, view.x + this.input.x * speed * dt));
        view.z = Math.max(-S, Math.min(S, view.z + this.input.z * speed * dt));
        view.overview = false;
      }
      this.movers.update(dt);
      animateModels(this, dt);
      this.environmentAnimation.update(dt, this.time);
      this.contactShadows?.update();
      holeUniforms.uHoleCount.value = 0;
      this.updateCamera(dt, false);
      this.camera.updateMatrixWorld();
      this.modelLOD.update(dt);
      this.boatWakes?.update(dt, this.time);
      this.scenery.update(dt, this.camera, this.time);
      this.updateShadow();
      return;
    }

    if (p.alive && this.state === 'playing') {
      const ix = this.input.x, iz = this.input.z;
      p.move(ix, iz, dt, 1, S);
    } else if (p.alive) {
      p.move(0, 0, dt, 1, S);
    }
    for (const ai of this.ais) ai.update(dt, this);
    this.movers.update(dt);
    animateModels(this, dt);

    for (const h of this.holes) {
      if (!h.alive) {
        h.respawnT -= dt;
        if (h.respawnT <= 0 && this.state === 'playing') {
          const sp = this.findSpawn(h);
          h.reset(sp.x, sp.z, S);
          if (h.isPlayer) {
            this.hud.showRespawn(false);
            this.lastLevel = Math.floor(h.size / 10); // respawned small: level-ups show again
          }
        }
        continue;
      }
      h.update(dt, S);
      swallowNear(this, h);
    }
    updateActive(this, dt);
    this.environmentAnimation.update(dt, this.time);
    this.contactShadows?.update();
    if (this.state === 'playing') holeVsHole(this); // frozen while 'ending' so nobody gets eaten with no respawn

    // Shader uniforms
    let n = 0;
    for (const h of this.holes) {
      if (!h.alive) continue;
      holeUniforms.uHoles.value[n++].set(h.x, h.z, h.r);
    }
    holeUniforms.uHoleCount.value = n;
    // Backdrop scenery only pays for the hole discard while a hole actually overhangs the map edge.
    let over = 0;
    for (const h of this.holes) if (h.alive && Math.max(Math.abs(h.x), Math.abs(h.z)) + h.r > S - 0.05) over = 1;
    edgeHoleUniform.value = over;
    this.effects.update(dt);

    this.updateCamera(dt, false);
    this.camera.updateMatrixWorld();
    this.modelLOD.update(dt);
    this.boatWakes?.update(dt, this.time);
    this.occlusion.update();
    this.scenery.update(dt, this.camera, this.time);
    this.updateShadow();
    if (p.targetRadius > this.peak) this.peak = p.targetRadius;

    if (this.state === 'playing') {
      if (this.opts.mode === 'arcade') {
        this.updateArcade(dt);
        if (this.timeLeft <= 0) this.finish('time');
        else if (this.total && this.removed >= this.total) this.finish('goal');
      } else if (this.opts.mode === 'time') {
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        if (this.timeLeft <= 0) this.finish('time');
      } else if (this.removed / this.total >= this.opts.goal) {
        this.finish('goal');
      } else if (this.opts.goal >= 1) {
        this.checkStall(dt);
      }
      if (this.state === 'playing' && this.live.length === 0 && this.active.length === 0) this.finish('goal');
    } else if (this.state === 'ending') {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.state = 'ended';
        this.input.setEnabled(false);
        this.hud.hide();
        this.onFinish?.(this.buildResult());
      }
    }

    // level-up popups
    const lvl = Math.floor(p.size / 10);
    if (lvl > this.lastLevel && p.alive) {
      this.lastLevel = lvl;
      this.hud.popup(`Level up! Size ${p.size}`);
      audio.levelUpChime();
      this.effects.levelUp(p);
      if (this.opts.mode === 'arcade' && this.state === 'playing' && lvl > this.arc.maxLevel) {
        this.arc.maxLevel = lvl;
        this.addTime(5 + Math.min(5, (lvl - 2) * 0.5));
        this.arc.score += lvl * 100;
      }
    }
    this.updateHud(false, dt);
  }

  /** 'All items' goal can become impossible (nobody can ever grow enough for the biggest objects). */
  checkStall(dt) {
    this.sinceSwallow += dt;
    this.stallT -= dt;
    if (this.stallT > 0) return;
    this.stallT = 1;
    const left = this.live.length + this.active.length;
    if (left <= this.total * 0.05 && this.sinceSwallow >= STALL_SECONDS) { this.finish('goal'); return; }
    if (this.active.length || !this.live.length) return;
    // Optimistic potential: every alive hole's area pooled into one. The grow-order greedy (sort by radius, eat
    // while potential radius > r*1.1, accumulating values) eats something iff it can eat the smallest object,
    // so "greedy reaches nothing" reduces to this single check.
    let area = 0;
    for (const h of this.holes) if (h.alive) area += h.area;
    let minR = Infinity;
    for (const o of this.live) if (o.r < minR) minR = o.r;
    if (Math.sqrt(area / Math.PI) <= minR * 1.1) this.finish('goal');
  }

  finish(reason) {
    if (this.opts.mode === 'test') return;
    if (this.opts.mode === 'arcade' && reason === 'goal') {
      this.arc.bonus = Math.round(this.timeLeft) * 50; // full clear: remaining time converts to score
      this.arc.score += this.arc.bonus;
    }
    this.state = 'ending';
    this.endReason = reason;
    this.endT = reason === 'time' ? 0.6 : 1.4;
    this.input.setEnabled(false);
    this.hud.showRespawn(false);
    this.hud.popup(reason === 'time' ? "Time's up!" : 'Level complete!', 1400);
    audio.levelComplete();
  }

  buildResult() {
    const sorted = [...this.holes].sort((a, b) => b.area - a.area);
    const p = this.player;
    const a = this.arc;
    const peaked = this.opts.mode === 'time' || this.opts.mode === 'arcade';
    return {
      mapId: this.map.id,
      mapName: this.map.name,
      mode: this.opts.mode,
      reason: this.endReason,
      score: a.score,
      bestCombo: a.bestCombo,
      survived: Math.round(a.elapsed),
      bonus: a.bonus,
      size: peaked ? Math.round(this.peak * 10) : p.size,
      pct: this.total ? Math.round((p.count / this.total) * 100) : 0,
      totalPct: this.total ? Math.round((this.removed / this.total) * 100) : 0,
      rank: sorted.indexOf(p) + 1,
      holes: sorted.length,
    };
  }

  /** Distance that contains the playable square and all placed props at the normal camera tilt. */
  testFitDistance() {
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tanH = tanV * this.camera.aspect;
    // Keep the overview clear of the title, pause button, and viewer controls.
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const side = Math.max(0.25, 1 - 40 / w);
    const top = Math.max(0.25, 1 - 160 / h);
    const bottom = Math.max(0.25, 1 - (w < 600 ? 250 : 220) / h);
    const sin = Math.sin(CAM_ANGLE), cos = Math.cos(CAM_ANGLE);
    let distance = 8;
    const include = (x, y, z) => {
      const depthOffset = y * sin + z * cos;
      const up = y * cos - z * sin;
      distance = Math.max(distance, depthOffset + Math.max(Math.abs(x) / (tanH * side), Math.abs(up) / (tanV * (up >= 0 ? top : bottom))));
    };
    const edge = this.size + 3;
    for (const x of [-edge, edge]) for (const z of [-edge, edge]) include(x, 0, z);
    const corner = new THREE.Vector3();
    const objMatrix = new THREE.Matrix4();
    for (const o of this.objects) {
      const box = o.proto.geometry.boundingBox;
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z).applyMatrix4(this.instances.getMatrix(o, objMatrix));
            include(corner.x, corner.y, corner.z);
          }
        }
      }
    }
    return distance * 1.06;
  }

  /** Public viewer controls; gameplay zoom stays in Input.zoom. */
  fitTestView() {
    if (this.opts?.mode !== 'test' || !this.scene || !this.testView) return;
    const view = this.testView;
    view.x = view.z = 0;
    view.d = view.fit = this.testFitDistance();
    view.overview = true;
    this.updateCamera(0, true);
    this.scenery.update(0, this.camera, this.time);
    this.updateShadow();
  }

  zoomTestView(factor) {
    if (this.opts?.mode !== 'test' || !this.scene || !this.testView || !Number.isFinite(factor) || factor <= 0) return;
    const view = this.testView;
    view.d = Math.max(8, Math.min(view.fit * 2.5, view.d * factor));
    view.overview = false;
    this.updateCamera(0, true);
    this.scenery.update(0, this.camera, this.time);
    this.updateShadow();
  }

  updateCamera(dt, snap) {
    if (this.opts.mode === 'test') {
      const view = this.testView, c = this.cam;
      c.x = view.x; c.z = view.z; c.d = view.d;
      this.camera.position.set(c.x, c.d * Math.sin(CAM_ANGLE), c.z + c.d * Math.cos(CAM_ANGLE));
      this.camera.lookAt(c.x, 0, c.z);
      this.camera.near = Math.max(0.1, c.d * 0.08);
      this.camera.far = c.d * 8 + 300;
      this.camera.updateProjectionMatrix();
      this.scene.fog.near = c.d * 1.8;
      this.scene.fog.far = c.d * 4.5 + 120;
      return;
    }
    const p = this.player;
    const c = this.cam;
    const asp = this.camera.aspect;
    const am = asp < 1.3 ? Math.min(1.7, 1.3 / asp) : 1;
    const fx = this.effects;
    const dist = (9 + p.r * 6.5) * am * this.input.zoom;
    const kp = snap ? 1 : 1 - Math.exp(-dt * 5);
    const kd = snap ? 1 : 1 - Math.exp(-dt * 2.5);
    c.x += (p.x - c.x) * kp;
    c.z += (p.z - c.z) * kp;
    c.d += (dist - c.d) * kd;
    const cd = c.d * (1 + (fx ? fx.zoom : 0)); // level-up zoom bounce
    this.camera.position.set(c.x, cd * Math.sin(CAM_ANGLE), c.z + cd * Math.cos(CAM_ANGLE));
    this.camera.lookAt(c.x, 0, c.z);
    if (fx && fx.shake > 0) this.camera.position.set(this.camera.position.x + fx.offX, this.camera.position.y + fx.offY, this.camera.position.z + fx.offZ);
    this.camera.near = Math.max(0.5, c.d * 0.08);
    this.camera.far = c.d * 8 + 300;
    this.camera.updateProjectionMatrix();
    const fog = this.scene.fog;
    fog.near = c.d * 1.8;
    fog.far = c.d * 4.5 + 120;
  }

  /** Sun shadow box follows the camera focus and scales with the view so shadows stay crisp; snapped to texels. */
  updateShadow() {
    if (!this.high || !this.shadowsOn) return;
    const sun = this.sun, sh = sun.shadow, c = this.cam;
    const half = Math.pow(1.12, Math.ceil(Math.log((c.d * 1.05 + 6) * 1.1) / Math.log(1.12)));
    if (half !== this.shadowHalf) {
      this.shadowHalf = half;
      const cam = sh.camera;
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
      cam.near = 1;
      cam.far = 220 + half * 2.2 + 120;
      cam.updateProjectionMatrix();
      this.shadowTexel = (half * 2) / this.shadowSize;
      sh.normalBias = this.shadowTexel * 2.2;
    }
    sh.needsUpdate = this.frameN++ % this.shadowRate === 0 || half !== this.shadowHalf0 || !sh.map;
    this.shadowHalf0 = half;
    const tx = c.x, tz = c.z, texel = this.shadowTexel;
    const a = tx * SUN_RIGHT.x + tz * SUN_RIGHT.z;
    const b = tx * SUN_UP.x + tz * SUN_UP.z;
    const da = Math.round(a / texel) * texel - a;
    const db = Math.round(b / texel) * texel - b;
    const x = tx + SUN_RIGHT.x * da + SUN_UP.x * db;
    const y = SUN_RIGHT.y * da + SUN_UP.y * db;
    const z = tz + SUN_RIGHT.z * da + SUN_UP.z * db;
    sun.target.position.set(x, y, z);
    const L = 220 + half;
    sun.position.set(x + SUN_DIR.x * L, y + SUN_DIR.y * L, z + SUN_DIR.z * L);
  }

  updateHud(force, dt = 0) {
    if (this.opts.mode === 'test') return;
    const p = this.player;
    const timed = this.opts.mode === 'time';
    const arcade = this.opts.mode === 'arcade';
    this.hud.setSize(p.size);
    this.hud.setLevel(p.levelFrac, p.level);
    this.hud.setProgress(this.total ? this.removed / this.total : 0, timed ? null : arcade ? 1 : this.opts.goal);
    this.hud.setTimer(timed || arcade ? this.timeLeft : null);
    if (arcade) {
      this.hud.setScore(this.arc.score);
      this.hud.setCombo(this.arc.combo, this.arc.comboT / ARCADE_COMBO_WINDOW);
    }
    this.boardT -= dt;
    if (force || this.boardT <= 0) {
      this.boardT = 0.25;
      const rows = [...this.holes]
        .sort((a, b) => b.area - a.area)
        .map((h) => ({ name: h.isPlayer ? 'You' : h.name, size: h.size, color: h.color, me: h.isPlayer, alive: h.alive }));
      this.hud.setBoard(rows);
    }
  }
}

// Merge flat (indexed PlaneGeometry/CircleGeometry) decal geometries into one; keeps only position.
function mergeFlat(geos) {
  const pos = [];
  for (const g of geos) {
    const gi = g.index ? g.toNonIndexed() : g;
    pos.push(...gi.attributes.position.array);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}
