import * as THREE from 'three';
import { buildProtos } from '../objects/airport.js';
import { holeUniforms } from '../game/Ground.js';
import { applyHoleDiscard } from '../game/Scenery.js';

const RUNWAY = '#45484d';
const TARMAC = '#5f6369';
const WHITE = '#ececec';
const YELLOW = '#f2c230';

// Routes are created in decorate() and used in populate().
const R = {};
const PI = Math.PI;
let LOT_TERM = [];
let LOT_STAFF = [];
const GSE = { fuel: [], stair: [], cater: [], tug: [], cart: [], train: [] };

// Runway / taxiway lights: purely decorative instanced domes (+ soft additive halos). Not swallowable, not in the object
// grid, so they never affect gameplay or the object count. Colours are HDR (> 1) so the map's bloom pass makes them glow.
const LIGHT_COLORS = [[2.6, 2.3, 1.5], [0.5, 1.1, 2.8], [0.5, 2.6, 0.9], [2.8, 0.35, 0.25]]; // white, blue, green, red
const HALO_VERT = `
varying vec3 vCol; varying vec2 vUv; varying vec3 vHW;
void main() {
  vCol = instanceColor; vUv = uv;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vHW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const HALO_FRAG = `
uniform vec3 uHoles[8]; uniform int uHoleCount;
varying vec3 vCol; varying vec2 vUv; varying vec3 vHW;
void main() {
  for (int i = 0; i < 8; i++) {
    if (i >= uHoleCount) break;
    vec2 d = vHW.xz - uHoles[i].xy;
    if (dot(d, d) < uHoles[i].z * uHoles[i].z) discard;
  }
  float r = length(vUv - 0.5) * 2.0;
  float a = exp(-r * r * 4.5) * (1.0 - smoothstep(0.7, 1.0, r));
  gl_FragColor = vec4(vCol * 0.3 * a, 1.0);
  #include <colorspace_fragment>
}`;
function addLights(parent, lights) {
  const n = lights.length;
  const domeGeo = new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = applyHoleDiscard(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), false, true);
  const domes = new THREE.InstancedMesh(domeGeo, domeMat, n);
  const haloGeo = new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2);
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    uniforms: { uHoles: holeUniforms.uHoles, uHoleCount: holeUniforms.uHoleCount },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const halos = new THREE.InstancedMesh(haloGeo, haloMat, n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  lights.forEach(([x, z, kind], i) => {
    m.makeTranslation(x, 0.02, z);
    domes.setMatrixAt(i, m);
    m.makeTranslation(x, 0.3, z);
    halos.setMatrixAt(i, m);
    const k = LIGHT_COLORS[kind];
    c.setRGB(k[0], k[1], k[2]);
    domes.setColorAt(i, c);
    halos.setColorAt(i, c);
  });
  domes.frustumCulled = halos.frustumCulled = false;
  halos.renderOrder = 4;
  parent.add(domes, halos);
}

export default {
  id: 'airport',
  name: 'Airport',
  description: 'Swallow suitcases, baggage carts and even a jumbo jet!',
  cardColor: '#4fb3ee',
  emoji: '✈️',
  size: 130,
  groundColor: '#82c46d',
  skyColor: '#bfe6ff',
  fogColor: '#c8e8fb',
  lightColor: '#fffbe8',
  ambient: 0.65,
  // Crisp, clear morning: low-ish cool-warm sun, long clean shadows.
  lighting: {
    sunDirection: [-55, 52, 35], sunColor: '#fff3dc', sunIntensity: 0.78 * Math.PI,
    hemiSkyColor: '#c4e4ff', hemiGroundColor: '#8aa874', hemiIntensity: 0.6 * Math.PI,
    shadowOpacity: 0.8, shadowRadius: 2.4, environmentIntensity: 0.32, exposure: 1.02,
  },
  postProcessing: { aoRadius: 0.6, aoStrength: 0.16 },
  groundStyle: 'grass',
  sky: { top: '#6db4ee', horizon: '#dbeefc' },
  clouds: true,
  backdrop: [
    { type: 'hills', color: '#7fc46a', color2: '#5aa557' },
    { type: 'mountains', side: 'north', color: '#8797a8', color2: '#f2f6fa' },
    { type: 'city', side: 'south', color: '#b9c3d4', color2: '#82c46d' },
  ],
  edge: 'fence',
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Grass patches
    for (let i = 0; i < 16; i++) {
      addDecal(circle(randRange(-S, S), randRange(-S, S), randRange(6, 14)), i % 2 ? '#78ba64' : '#8ecf78', { style: 'grass' });
    }

    // Hangar / terminal aprons
    addDecal(rect(-10, 12, 170, 110), TARMAC, { style: 'concrete' });
    addDecal(rect(55, 90, 90, 30), TARMAC, { style: 'concrete' });
    addDecal(rect(-85, 92, 50, 30), TARMAC, { style: 'concrete' });
    addDecal(rect(-20, 75, 60, 16), '#7d8086', { style: 'concrete' });
    // pond at the far corner
    addDecal(circle(-112, 112, 9, 24), '#4a9fd8', { style: 'water' });

    // Runways + taxiways
    addDecal(merge([
      rect(0, -100, S * 2, 18), rect(100, 15, 18, 230),
      rect(0, -55, S * 2, 9), rect(-60, -75, 9, 32), rect(20, -75, 9, 32), rect(-40, -49, 9, 12),
    ]), RUNWAY, { style: 'asphalt' });

    // Helipad
    addDecal(circle(-110, -20, 12, 32), '#6b6f75');
    addDecal(circle(-110, -20, 10, 32), YELLOW);
    addDecal(circle(-110, -20, 9.6, 32), '#6b6f75');
    addDecal(merge([rect(-110, -20, 1.4, 8), rect(-107, -20, 1.4, 8), rect(-108.5, -20, 6, 1.4)]), WHITE);

    // Runway markings
    const w = [];
    for (let x = -S + 20; x < S - 20; x += 12) if (Math.abs(x - 100) > 12) w.push(rect(x, -100, 6, 0.6));
    for (let z = -S + 40; z < S - 20; z += 12) if (Math.abs(z + 100) > 12) w.push(rect(100, z, 0.6, 6));
    // edge lines
    w.push(rect(0, -108.5, S * 2, 0.4), rect(0, -91.5, S * 2, 0.4));
    w.push(rect(91.5, 15, 0.4, 230), rect(108.5, 15, 0.4, 230));
    // threshold stripes
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      w.push(rect(-S + 10, -100 + i * 1.9, 8, 0.8), rect(S - 10, -100 + i * 1.9, 8, 0.8));
      w.push(rect(100 + i * 1.9, S - 10, 0.8, 8));
    }
    // aiming-point blocks
    w.push(rect(-S + 45, -103, 10, 2), rect(-S + 45, -97, 10, 2), rect(S - 45, -103, 10, 2), rect(S - 45, -97, 10, 2));
    addDecal(merge(w), WHITE);

    // Yellow taxi lines
    const y = [
      rect(0, -55, S * 2, 0.4), rect(-60, -75, 0.4, 32), rect(20, -75, 0.4, 32), rect(-40, -49, 0.4, 12),
    ];
    for (const gx of [-62, -24, 14, 52]) y.push(rect(gx, -14, 0.4, 24));
    for (const gx of [-62, 20]) y.push(rect(gx, 34, 0.4, 24));
    for (const gz of [-40, 62]) for (let x = -90; x < 70; x += 10) y.push(rect(x, gz, 5, 0.4));
    addDecal(merge(y), YELLOW);

    // Runway edge lights (white along the runways, blue along the taxiway)
    const lw = [], lb = [];
    for (let x = -S + 6; x < S - 4; x += 10) { lw.push(circle(x, -110.5, 0.35, 8), circle(x, -89.5, 0.35, 8)); lb.push(circle(x, -59.8, 0.3, 8), circle(x, -50.2, 0.3, 8)); }
    for (let z = -80; z < S - 4; z += 10) lw.push(circle(89.5, z, 0.35, 8), circle(110.5, z, 0.35, 8));
    const lightBase = addDecal(merge(lw), '#fff3b0');
    addDecal(merge(lb), '#4a8fff');
    // Glowing light domes: edge lights (white runways, blue taxiway edge), green taxiway centerline, threshold bars
    // (green at the approach ends, red at the far ends). Decorative only (see addLights).
    const L = [];
    for (let x = -S + 6; x < S - 4; x += 10) { L.push([x, -110.5, 0], [x, -89.5, 0], [x, -59.8, 1], [x, -50.2, 1]); }
    for (let z = -80; z < S - 4; z += 10) L.push([89.5, z, 0], [110.5, z, 0]);
    for (let x = -S + 8; x < S - 6; x += 6) if (Math.abs(x - 100) > 3) L.push([x, -55, 2]);
    for (let z = -90; z < -58; z += 6) L.push([-60, z, 2], [20, z, 2]);
    for (let z = -54; z < -44; z += 6) L.push([-40, z, 2]);
    for (let i = -4; i <= 4; i++) {
      L.push([-S + 3, -100 + i * 2, 2], [S - 3, -100 + i * 2, 3], [100 + i * 2, S - 3, 2]);
    }
    addLights(lightBase, L);
    // runway numbers as painted blocks
    addDecal(merge([rect(-S + 22, -100, 1.2, 5), rect(-S + 25, -100, 3.4, 1.0), rect(-S + 25, -98, 3.4, 1.0), rect(-S + 25, -102, 3.4, 1.0)]), WHITE);

    // Ground-support parking bays (pad + painted lines) east of the jumbo stands
    addDecal(rect(58, 36, 32, 48), '#6a6e75', { style: 'concrete' });
    const bay = [];
    for (let i = 0; i <= 5; i++) bay.push(rect(44.5 + i * 4.5, 22, 0.25, 11));
    for (let i = 0; i <= 3; i++) bay.push(rect(43.5 + i * 4.5, 36, 0.25, 9));
    for (let i = 0; i <= 8; i++) bay.push(rect(42.5 + i * 3.1, 50, 0.2, 4));
    bay.push(rect(58, 27.5, 32, 0.2), rect(58, 41, 32, 0.2));
    addDecal(merge(bay), WHITE);
    for (let i = 0; i < 6; i++) { const x = 47 + i * 4.5; if (i < 3) GSE.fuel.push({ x, z: 22, rotY: PI / 2 }); }
    for (let i = 0; i < 2; i++) GSE.stair.push({ x: 63 + i * 4.5, z: 22, rotY: PI / 2 });
    for (let i = 0; i < 3; i++) GSE.cater.push({ x: 45.5 + i * 4.5, z: 36, rotY: PI / 2 });
    for (let i = 0; i < 4; i++) GSE.tug.push({ x: 58 + i * 3.4, z: 36, rotY: PI / 2 });
    for (let i = 0; i < 9; i++) GSE.cart.push({ x: 44 + i * 3.1, z: 50, rotY: PI / 2 });
    // baggage trains parked in a line (tug + carts behind) beside the aircraft stands
    for (const x0 of [-30, -2, 26, 54]) GSE.train.push({ x: x0, z: 9 });
    // helicopter pads along the west strip
    addDecal(merge(Array.from({ length: 6 }, (_, i) => circle(-114, 8 + i * 12, 5, 20))), '#6b6f75', { style: 'concrete' });
    addDecal(merge(Array.from({ length: 6 }, (_, i) => circle(-114, 8 + i * 12, 4.3, 20))), YELLOW);
    addDecal(merge(Array.from({ length: 6 }, (_, i) => circle(-114, 8 + i * 12, 4.0, 20))), '#6b6f75');
    addDecal(merge(Array.from({ length: 6 }, (_, i) => [rect(-115, 8 + i * 12, 0.6, 3), rect(-113, 8 + i * 12, 0.6, 3), rect(-114, 8 + i * 12, 2.6, 0.6)]).flat()), WHITE);
    // parking lots: terminal car park + staff lot
    LOT_TERM = ctx.parkingLot(-20, 104, 40, 26, { rotY: 0 });
    LOT_STAFF = ctx.parkingLot(-113, 76, 22, 24, { rotY: 0 });

    // --- Aircraft taxi loop: runway (west to east), down the vertical runway, back along the taxiway
    R.taxi = ctx.addRoute([[-60, -100], [100, -100], [100, -55], [-60, -55]], { loop: true, width: 8, network: 'air' }); // returns via the x=-60 connector taxiway
    // shuttle along the vertical runway
    R.rwy = ctx.addRoute([[100, -40], [100, 120]], { loop: false, width: 8, network: 'air' });
    // apron service road (U shape around the parked airliners; vehicles shuttle, lanes swap at each end)
    const svc = [[76, 52], [76, -38], [-96, -38], [-96, 60]];
    // paint the service road so it is real asphalt where it leaves the apron slab (x=76 and x=-96 lie past its edges)
    addDecal(merge([
      rect(76, 5, 8, 104), rect(-96, 11, 8, 110), rect(-10, -38, 178, 8),
    ]), '#7d8086', { style: 'concrete' });
    R.svc = ctx.addRoute(svc, { loop: false, width: 6 });
    R.svcR = ctx.addRoute(svc.slice().reverse(), { loop: false, width: 6 }); // opposite direction
  },

  populate(ctx) {
    const { randRange, rand, size: S } = ctx;
    // static props stay off the runways / taxiways (rectangles match decorate()); movers may cross them
    const onRoad = (x, z, m) => Math.abs(z + 100) < 9 + m || Math.abs(z + 55) < 4.5 + m || (x > 91 - m && x < 109 + m && z > -100)
      || (z > -91 - m && z < -59 + m && (Math.abs(x + 60) < 4.5 + m || Math.abs(x - 20) < 4.5 + m))
      || (Math.abs(x + 40) < 4.5 + m && z > -55 - m && z < -43 + m);
    const place = (n, x, z, rot, sc = 1, opts) => {
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, (proto ? proto.radius * sc : 0) * 0.6)) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30, opts) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax), opts)) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const APRON = [-92, 72, -40, 65];
    const GRASS_W = [-S + 4, -97, -40, 60];
    const GRASS_E = [78, 90, -45, S - 4];
    const GRASS_N = [-S + 4, S - 4, -S + 4, -112];
    const FIELD = [[-S + 4, S - 4, -50, -8], [-125, -98, -40, 120], [78, 90, -45, 125]];
    const field = (name, n, sMin = 1, sMax = 1) => {
      for (let i = 0; i < n; i++) scatter(name, 1, FIELD[Math.floor(rand() * FIELD.length)], sMin, sMax, 25);
    };
    void GRASS_W; void GRASS_E; void GRASS_N;

    // --- Huge landmarks first
    place('tower', 16, 78, 0, 1);
    place('terminal', -20, 76, PI, 1);
    place('jumbo', -62, 36, PI / 2, 1);
    place('jumbo', 22, 34, PI / 2, 1);
    // hangars face the apron (doors to the north), private jets parked nose-out in front of them
    for (const h of [[40, 96], [70, 96], [-70, 100], [-100, 100]]) place('hangar', h[0], h[1], PI / 2, 1);
    for (const j of [[40, 74], [70, 74], [-70, 78], [-100, 78]]) place('bizjet', j[0], j[1], PI / 2, 1, { move: null });

    // --- Aircraft taxiing slowly (all the same speed so nobody overtakes on the loop)
    const taxi = (name, key, count, speed, offset = 0) =>
      ctx.placeOnRoute(name, R[key], { count, speed, offset });
    taxi('airliner', 'taxi', 1, 4);
    taxi('bizjet', 'taxi', 2, 4);
    taxi('followme', 'taxi', 2, 4);
    taxi('airlinerRed', 'rwy', 1, 3.5);

    // --- Airliners parked at their stands (nose toward the terminal side)
    place('airliner', -62, -14, PI / 2, 1);
    place('airlinerRed', -24, -14, PI / 2, 1);
    place('airliner', 14, -14, PI / 2, 1);
    place('airlinerRed', 52, -12, PI / 2, 1);

    // --- Helicopters on their pads
    place('helicopter', -110, -20, 0, 1, { move: null });
    for (let i = 0; i < 6; i++) if (i !== 2) place('helicopter', -114, 8 + i * 12, 0, 1, { move: null });
    const PROP = { move: { type: 'drive', speed: 3, range: 12, turn: 0.6 } };
    scatter('propplane', 8, [-125, -100, -45, 120], 1, 1, 40, PROP);
    scatter('propplane', 5, [78, 90, -45, 125], 1, 1, 40, PROP);

    // --- Service vehicles: trucks shuttle along the service road, staged rows wait in their bays
    const svc = (name, key, count) => ctx.placeOnRoute(name, R[key], { count, speed: 5, offset: 2.5 });
    svc('fueltruck', 'svc', 2);
    svc('stairtruck', 'svc', 1);
    svc('cateringtruck', 'svcR', 4);
    GSE.fuel.forEach((s) => ctx.placeParked('fueltruck', s, { overlap: 0.35 }));
    GSE.stair.forEach((s) => ctx.placeParked('stairtruck', s, { overlap: 0.4 }));
    GSE.cater.forEach((s) => ctx.placeParked('cateringtruck', s, { overlap: 0.35 }));
    GSE.tug.forEach((s) => ctx.placeParked('tug', s, { move: null }));
    GSE.cart.forEach((s) => ctx.placeParked('cart', s, { overlap: 0.4 }));
    GSE.train.forEach((s) => {
      ctx.placeParked('tug', { x: s.x + 2.2, z: s.z, rotY: 0 }, { move: null });
      for (let i = 0; i < 3; i++) ctx.placeParked('cart', { x: s.x - 1.6 - i * 3.3, z: s.z, rotY: 0 }, { overlap: 0.4 });
    });
    scatter('followme', 2, ALL, 1, 1, 30, { move: { type: 'drive', speed: 4, range: 14 } });
    const TUG = { move: { type: 'drive', speed: 3.5, range: 12 } };
    const CART = { move: { type: 'drive', speed: 2.5, range: 10 } };
    scatter('tug', 10, APRON, 1, 1, 30, TUG);
    scatter('tug', 4, ALL, 1, 1, 30, TUG);
    scatter('cart', 8, APRON, 0.95, 1.1, 30, CART);

    // --- Cars: terminal car park + staff lot
    const cars = ['car', 'carBlue', 'carWhite', 'carSilver', 'taxi'];
    LOT_TERM.forEach((s) => { if (rand() < 0.6) ctx.placeParked(ctx.pick(cars), s); });
    LOT_STAFF.forEach((s) => { if (rand() < 0.55) ctx.placeParked(ctx.pick(cars.slice(0, 4)), s); });

    // --- Starter cluster around the spawn
    const START = [-28, 28, -28, 28];
    const cases = ['suitcase', 'suitcaseBlue', 'suitcaseGreen', 'suitcaseYellow', 'suitcasePurple'];
    for (const c of cases) scatter(c, 3, START, 0.9, 1.1, 12);
    scatter('cone', 8, START, 0.9, 1.1, 12);
    scatter('crew', 5, START, 0.9, 1.1, 12);
    scatter('chock', 6, START, 0.9, 1.1, 12);

    // --- Small stuff: piles of luggage, crew, cones, chocks
    for (const c of cases) {
      scatter(c, 34, APRON, 0.9, 1.1, 12);
      scatter(c, 16, ALL, 0.9, 1.1, 12);
    }
    scatter('crew', 55, APRON, 0.9, 1.1, 12);
    scatter('crew', 45, ALL, 0.9, 1.1, 12);
    scatter('chock', 50, APRON, 0.9, 1.1, 12);
    scatter('chock', 20, ALL, 0.9, 1.1, 12);
    scatter('cone', 55, APRON, 0.9, 1.1, 12);
    scatter('cone', 55, ALL, 0.9, 1.1, 12);
    for (let x = -S + 6; x < S - 6; x += 7) {
      place('cone', x + randRange(-1.5, 1.5), -49 + randRange(-0.4, 0.4), undefined, 1);
      place('cone', x + randRange(-1.5, 1.5), -61 + randRange(-0.4, 0.4), undefined, 1);
    }
    field('suitcase', 10);
    field('cone', 20);
  },
};
