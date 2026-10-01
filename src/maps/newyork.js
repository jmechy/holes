import * as THREE from 'three';
import { buildProtos } from '../objects/newyork.js';

const ASPHALT = '#4a4d52';
const YELLOW = '#f2c230';
const WHITE = '#e9e9e9';

// Avenues run along Z at x = ROADS[i]; streets run along X at z = ROADS[i]. Road width 10.
const ROADS = [-90, -45, 0, 45, 90];
const RW = 10;
// City block intervals between the roads (index 0..5)
const IV = [[-120, -95], [-85, -50], [-40, -5], [5, 40], [50, 85], [95, 120]];
const PARK = { x0: 5, x1: 85, z0: -85, z1: -50 };
const WATER = { x0: -120, x1: -96, z0: 50, z1: 120 };
const ISLAND = { x: -108, z: 106 };
const TS = { x: -22.5, z: -22.5, ang: (48 * Math.PI) / 180 }; // Times Square block centre + angle of Broadway to 7th Ave
// the two bowtie plaza triangles (world coords [[x,z]x3]) between 7th Ave (vertical) and Broadway (diagonal)
function bowtie() {
  const wedge = (u1, u2, h1, h2, L) => {
    const dot = u1[0] * u2[0] + u1[1] * u2[1];
    const nrm = (v) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
    const n1 = nrm([u2[0] - dot * u1[0], u2[1] - dot * u1[1]]), n2 = nrm([u1[0] - dot * u2[0], u1[1] - dot * u2[1]]);
    // intersection of c+n1*h1+t*u1 and c+n2*h2+s*u2
    const bx = n2[0] * h2 - n1[0] * h1, bz = n2[1] * h2 - n1[1] * h1;
    const det = u1[0] * -u2[1] - u1[1] * -u2[0];
    const t = (bx * -u2[1] - bz * -u2[0]) / det;
    const apex = [TS.x + n1[0] * h1 + t * u1[0], TS.z + n1[1] * h1 + t * u1[1]];
    const B = [TS.x + n1[0] * h1 + L * u1[0], TS.z + n1[1] * h1 + L * u1[1]];
    const C = [TS.x + n2[0] * h2 + L * u2[0], TS.z + n2[1] * h2 + L * u2[1]];
    return [apex, B, C];
  };
  const a = TS.ang, d = [-Math.sin(a), -Math.cos(a)];
  return [wedge([0, -1], d, 1.5, 1.4, 12), wedge([0, 1], [-d[0], -d[1]], 1.5, 1.4, 12)];
}

export default {
  id: 'newyork',
  name: 'New York',
  description: 'Taxis, hot dogs and skyscrapers. Swallow the Statue of Liberty!',
  cardColor: '#f7c81e',
  emoji: '🗽',
  size: 120,
  groundColor: '#a4a4aa',
  skyColor: '#a9d4f5',
  fogColor: '#c9e2f5',
  lightColor: '#fff6e0',
  ambient: 0.62,
  groundStyle: 'concrete',
  // Crisp, cool afternoon: low-ish sun for long, sharp canyon shadows and a cool blue sky fill.
  lighting: {
    sunDirection: [-52, 40, 34], sunColor: '#fff3de', sunIntensity: 0.8 * Math.PI,
    hemiSkyColor: '#b9d8f8', hemiGroundColor: '#8b8f9c', hemiIntensity: 0.56 * Math.PI,
    shadowOpacity: 0.82, shadowRadius: 2.0, environmentIntensity: 0.32, exposure: 1.02,
  },
  postProcessing: { aoRadius: 0.6, aoStrength: 0.18 },
  sky: { top: '#5aa8ee', horizon: '#c9e2f5' },
  clouds: true,
  backdrop: [{ type: 'city', color: '#9aa8bb', color2: '#6e7580', oceanSide: 'west', oceanColor: '#3f8fd0', sandColor: '#b7b7bd' }],
  edge: 'barrier',
  buildProtos,

  routes: null,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Block plazas (lighter sidewalk slabs)
    const slabs = [];
    for (const [x0, x1] of IV) for (const [z0, z1] of IV) {
      slabs.push(rect((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1));
    }
    addDecal(merge(slabs), '#b7b7bd', { style: 'concrete' });

    // Roads
    const roads = [];
    for (const r of ROADS) {
      roads.push(rect(r, 0, RW, S * 2));
      roads.push(rect(0, r, S * 2, RW));
    }
    addDecal(merge(roads), ASPHALT, { style: 'asphalt' });

    // Yellow double centre lines (avoid the intersections) and white dashed lane lines
    const yel = [], dash = [];
    for (const r of ROADS) {
      for (let t = -S + 3; t < S; t += 3) {
        if (ROADS.some((q) => Math.abs(t - q) < RW / 2 + 1)) continue;
        yel.push(rect(r - 0.25, t, 0.2, 3), rect(r + 0.25, t, 0.2, 3));
        yel.push(rect(t, r - 0.25, 3, 0.2), rect(t, r + 0.25, 3, 0.2));
      }
      for (let t = -S + 4; t < S; t += 6) {
        if (ROADS.some((q) => Math.abs(t - q) < RW / 2 + 2)) continue;
        for (const o of [-2.5, 2.5]) {
          dash.push(rect(r + o, t, 0.15, 2.5));
          dash.push(rect(t, r + o, 2.5, 0.15));
        }
      }
    }
    addDecal(merge(yel), YELLOW);

    // Crosswalks at every intersection
    for (const a of ROADS) for (const b of ROADS) {
      for (let i = -4; i <= 4; i++) {
        const o = i * 1.05;
        dash.push(rect(a + o, b - 6.2, 0.6, 2.2), rect(a + o, b + 6.2, 0.6, 2.2));
        dash.push(rect(a - 6.2, b + o, 2.2, 0.6), rect(a + 6.2, b + o, 2.2, 0.6));
      }
    }
    addDecal(merge(dash), WHITE);
    // bike lanes (green strips), manhole covers and stop lines
    const bike = [], mh = [], stop = [];
    for (const r of ROADS) for (let t = -S + 2; t < S; t += 1) {
      if (ROADS.some((q) => Math.abs(t - q) < RW / 2 + 1.5)) continue;
      if (Math.abs(r) === 45) { bike.push(rect(r + 3.8, t, 0.9, 1.05), rect(t, r + 3.8, 1.05, 0.9)); }
    }
    for (const a of ROADS) for (const b of ROADS) {
      mh.push(circle(a + 1.2, b + 1.2, 0.5, 10));
      stop.push(rect(a - 2.5, b - 7.2, 5, 0.35), rect(a + 2.5, b + 7.2, 5, 0.35), rect(a - 7.2, b + 2.5, 0.35, 5), rect(a + 7.2, b - 2.5, 0.35, 5));
    }
    addDecal(merge(bike), '#5cae5a');
    addDecal(merge(stop), WHITE);
    addDecal(merge(mh), '#3a3d42');

    // Central Park
    const { x0, x1, z0, z1 } = PARK;
    const pcx = (x0 + x1) / 2, pcz = (z0 + z1) / 2;
    addDecal(rect(pcx, pcz, x1 - x0 - 1, z1 - z0 - 1), '#b7b7bd', { style: 'concrete' }); // stays inside the blocks: never over a road
    addDecal(rect(pcx, pcz, x1 - x0, z1 - z0), '#5cae5a', { style: 'grass' });
    const lawns = [];
    for (let i = 0; i < 12; i++) lawns.push(circle(randRange(x0 + 5, x1 - 5), randRange(z0 + 5, z1 - 5), randRange(3, 6), 20));
    addDecal(merge(lawns), '#6cc068', { style: 'grass' });
    addDecal(circle(28, -67, 7, 28), '#d8c79a', { style: 'sand' });
    addDecal(circle(28, -67, 5.6, 28), '#5ea8d6', { style: 'water' });
    // ball field infield + flower beds
    addDecal(circle(68, -62, 6, 24), '#c9a878', { style: 'dirt' });
    addDecal(merge([rect(68, -62, 0.3, 14, 0.785), rect(68, -62, 0.3, 14, -0.785)]), WHITE);
    const beds = [];
    for (let i = 0; i < 10; i++) beds.push(circle(12 + i * 3.4, -82, 0.9, 10));
    addDecal(merge(beds), '#f08fb0');
    const paths = [
      rect(pcx, pcz, x1 - x0 - 6, 2),
      rect(45, pcz, 2, z1 - z0),
      rect(20, -60, 2, 16, 0.6),
      rect(70, -75, 2, 16, -0.6),
      rect(pcx, z0 + 3, x1 - x0 - 6, 1.6),
      rect(pcx, z1 - 3, x1 - x0 - 6, 1.6),
    ];
    addDecal(merge(paths), '#d8c79a', { style: 'sand' });

    // Harbour (SW corner): open water, a quay along the shore, Liberty Island with its own ferry piers
    addDecal(rect((WATER.x0 + WATER.x1) / 2, (WATER.z0 + WATER.z1) / 2, WATER.x1 - WATER.x0, WATER.z1 - WATER.z0), '#3f8fd0', { style: 'water' });
    addDecal(rect(-95.6, 85, 1.2, 70), '#9a9aa2', { style: 'concrete' }); // quay wall
    const waves = [];
    for (let i = 0; i < 18; i++) waves.push(rect(randRange(-118, -98), randRange(52, 118), randRange(1.5, 3.5), 0.25));
    addDecal(merge(waves), '#8fcaf0', { style: 'water' });
    addDecal(circle(ISLAND.x, ISLAND.z, 9.6, 32), '#e3d9b8', { style: 'sand' });
    addDecal(circle(ISLAND.x, ISLAND.z, 8.2, 32), '#68b862', { style: 'grass' });
    addDecal(circle(ISLAND.x, ISLAND.z, 6.6, 32), '#b7b7bd', { style: 'concrete' });
    // ferry dock on the island's north shore, ferry terminal pier on the Manhattan quay
    addDecal(merge([rect(ISLAND.x, ISLAND.z - 10.6, 5, 4), rect(ISLAND.x - 4.5, ISLAND.z - 11.6, 6, 2.4)]), '#a97b42');
    addDecal(merge([rect(-99, 56, 7, 3.4), rect(-99, 62, 7, 3.4)]), '#a97b42');
    addDecal(rect(-96.5, 59, 2.4, 11), '#a97b42');

    // --- Times Square: asphalt plaza block, bowtie pedestrian triangles between 7th Ave and Broadway
    addDecal(rect(TS.x, TS.z, 34, 34), '#4a4d52', { style: 'asphalt' });
    const tri = ([a, b, c]) => {
      const g = new THREE.BufferGeometry();
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const [q, r] = cross > 0 ? [b, c] : [c, b]; // wind so the face points up (+Y)
      g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], 0, a[1], r[0], 0, r[1], q[0], 0, q[1]], 3));
      return g;
    };
    const wedges = bowtie();
    addDecal(merge(wedges.map(tri)), '#d9cfc0', { style: 'concrete' });
    // street markings on 7th Ave + Broadway, red tint at the north end (TKTS), crosswalk zebra at the apexes
    const dsh = [];
    for (let t = -16; t <= 16; t += 3) if (Math.abs(t) > 4) {
      dsh.push(rect(TS.x, TS.z + t, 0.15, 1.6));
      dsh.push(rect(TS.x - Math.sin(TS.ang) * t, TS.z - Math.cos(TS.ang) * t, 0.15, 1.6, TS.ang));
    }
    addDecal(merge(dsh), '#f2c230');
    addDecal(rect(TS.x - 5, TS.z - 14.5, 8, 4), '#8b1f2b', { style: 'concrete' });

    // Ferry loop in the harbour north of the island (water traffic only)
    const rtW = ctx.addRoute([[-103, 60], [-103, 88], [-113, 88], [-113, 60]], { loop: true, width: 2, network: 'water' });
    // --- Traffic routes (used by populate): every loop runs both ways so each road carries two lanes.
    // Quadrant loops all turn the same way (shared edges = opposite directions); ring A/O add the +-45 and +-90 roads.
    const rt = (this.routes = { quads: [], rings: [], ferry: rtW });
    const loop = (x0, x1, z0, z1, rev) => {
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      return ctx.addRoute(rev ? pts.reverse() : pts, { loop: true, width: 6 });
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      rt.quads.push(loop(0, 90 * sx, 0, 90 * sz, sx * sz < 0));
    }
    for (const half of [45, 90]) {
      for (const rev of [false, true]) rt.rings.push({ half, R: loop(-half, half, -half, half, rev) });
    }

    // --- Parking: three surface lots inside city blocks, plus kerbside spots along the avenues/streets.
    const lotOpts = { stallW: 2.8, stallD: 5, aisle: 6, color: '#54575c', lineColor: '#ececec' };
    this.lots = [
      ctx.parkingLot(-67.5, -67.5, 33, 33, lotOpts),
      ctx.parkingLot(67.5, -22.5, 33, 33, lotOpts),
      ctx.parkingLot(-107.5, 22.5, 33, 23, { ...lotOpts, rotY: Math.PI / 2 }),
    ].flat();
    this.curb = [];
    for (const R of [...rt.quads, ...rt.rings.map((r) => r.R)]) this.curb.push(...ctx.roadsideSpots(R, { side: 'right', spacing: 7, gap: 0.2, carWidth: 1.9 }));
  },

  populate(ctx) {
    const { randRange, rand, size: S } = ctx;
    const pick = ctx.pick;
    const P = Math.PI;
    const LOTS = [[-85, -50, -85, -50], [51, 84, -39, -6], [-119, -96, 5, 40]];
    const inLot = (x, z) => LOTS.some((b) => x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1);
    // harbour: nothing stands (or wanders) in the water; Liberty Island is placed separately
    const inWaterZone = (x, z, r = 0) => x - r < WATER.x1 && z + r > WATER.z0;
    const nearWater = (x, z) => x < WATER.x1 + 12 && z > WATER.z0 - 12;
    // static props never sit on the asphalt (movers may cross it)
    const onRoad = (x, z, m) => ROADS.some((c) => Math.abs(x - c) < RW / 2 + m || Math.abs(z - c) < RW / 2 + m);
    const place = (n, x, z, rot, sc = 1, opts) => {
      if (inLot(x, z)) return false;
      const proto = ctx.protos[n];
      const r = (proto ? proto.radius * sc : 0);
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (inWaterZone(x, z, r * 0.8)) return false;
      if (!isStatic && nearWater(x, z)) return false;
      if (isStatic && onRoad(x, z, r * 0.8)) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const parked = (n, s) => !inWaterZone(s.x, s.z, 2.5) && ctx.placeParked(n, s);
    // buildings face the nearest street (their front is local +Z)
    const facing = (x, z) => {
      let best = 1e9, rot = 0;
      for (const c of ROADS) {
        if (Math.abs(z - c) < best) { best = Math.abs(z - c); rot = z < c ? 0 : Math.PI; }
        if (Math.abs(x - c) < best) { best = Math.abs(x - c); rot = x < c ? Math.PI / 2 : -Math.PI / 2; }
      }
      return rot;
    };
    const inPark = (x, z) => x > PARK.x0 - 6 && x < PARK.x1 + 6 && z > PARK.z0 - 6 && z < PARK.z1 + 6;

    // Blocks: [x0,x1,z0,z1] excluding the park, harbour blocks and the Times Square block
    const blocks = [];
    IV.forEach(([x0, x1], i) => IV.forEach(([z0, z1], j) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (inPark(cx, cz) || (x1 <= WATER.x1 + 1 && z1 > WATER.z0 + 1)) return;
      blocks.push({ x0, x1, z0, z1, cx, cz, i, j, ts: i === 2 && j === 2, downtown: i >= 1 && i <= 4 && j >= 2 && j <= 4 });
    }));
    const SIDES = [{ ax: 'z', side: -1 }, { ax: 'z', side: 1 }, { ax: 'x', side: -1 }, { ax: 'x', side: 1 }];

    // --- Parked cars: nose-in stalls in the lots, parallel along the kerb
    const PARKED = ['taxi', 'car', 'carBlue', 'carGreen', 'taxi', 'van'];
    for (const s of this.lots) rand() < 0.62 && parked(ctx.pick(PARKED), s);
    for (const s of this.curb) rand() < 0.2 && parked(ctx.pick(PARKED), s);

    // --- Landmarks first
    ctx.place('liberty', ISLAND.x, ISLAND.z, 0, 1);       // on its own island in the harbour
    place('empire', -22.5, 22.5, 0, 1);
    place('chrysler', 67.5, 67.5, 0, 1);
    // ferry moored at the island dock + pier bollards on the island and the quay
    ctx.place('ferry', ISLAND.x + 6.6, ISLAND.z - 11.6, 0, 1);
    for (const dx of [-2.2, 2.2]) for (const dz of [-8.6, -12.6]) ctx.place('pierPost', ISLAND.x + dx, ISLAND.z + dz, 0, 1);
    for (const z of [53.8, 57, 60.4, 63.4]) ctx.place('pierPost', -102.6, z, 0, 1);
    for (let z = 52; z < 118; z += 8) ctx.place('streetLamp', -94.8, z, P, 1);

    // --- Times Square (block i=2, j=2): bowtie plaza ringed by screen-clad buildings
    {
      const ca = Math.cos(TS.ang), sa = Math.sin(TS.ang);
      const stat = (n, dx, dz, rot, sc = 1) => ctx.place(n, TS.x + dx, TS.z + dz, rot, sc);
      // buildings along the block edges, fronts toward the plaza
      stat('tsBldB', 5, -13, 0); stat('tsBldA', 13.4, -13, 0);
      stat('tsBldC', 13.4, -3, -P / 2); stat('tsBldB', 13.4, 8, -P / 2);
      // south side kept LOW (3m shops, fronts to the plaza) so the default camera south of the block sees straight into it
      for (const dx of [-12.8, 12.8]) stat('tsShop', dx, 15.6, P);
      stat('tsBldA', -13.4, -4, P / 2); stat('tsBldC', -13.4, 6.5, P / 2); stat('tsBldB', -13.4, -13.4, 0);
      stat('tktsSteps', -5.4, -12.4, 0);
      stat('policeBooth', -2.2, -5.2, 0.5); stat('policeBooth', 2.2, 5.0, -2.6);
      for (const [dx, dz] of [[-3.6, -8], [-7.5, -6.5], [3.6, 6.5]]) stat('parkBench', dx, dz, 0.6);
      for (const [dx, dz] of [[-5.5, -3], [2.5, 3.5], [6, 8], [-7, -9.5]]) stat('streetLamp', dx, dz, 0);
      for (const [dx, dz] of [[-1.5, -8], [3.6, 9], [-6.5, -10]]) stat('trashCan', dx, dz, 0);
      stat('hotdogCart', -7.5, -3.6, 0.4); stat('hotdogCart', 6.5, 4.5, 2.5);
      // yellow cabs queueing along 7th Ave and Broadway
      const dir = [-sa, -ca];
      for (const t of [-14, -9.5, 7.5, 12]) stat('taxi', 0, t, -P / 2);
      for (const t of [-13, -8.5, 8.5, 13.5]) stat('taxi', dir[0] * t, dir[1] * t, Math.atan2(ca, -sa) + (t < 0 ? P : 0));
      // crowds + street performers inside both wedges
      const wedges = bowtie();
      const inTri = (pt, [a, b, c]) => {
        const sgn = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
        const d1 = sgn(pt, a, b), d2 = sgn(pt, b, c), d3 = sgn(pt, c, a);
        return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
      };
      const inWedge = (n, name, tries = 40) => {
        for (let k = 0; k < n; k++) for (let t = 0; t < tries; t++) {
          let u = rand(), v = rand(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
          const [a, b, c] = wedges[k % 2];
          const x = a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]), z = a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
          if (ctx.place(typeof name === 'function' ? name() : name, x, z, undefined, 1)) break;
        }
      };
      inWedge(36, () => pick(['pedestrian', 'pedestrianB', 'pedestrianC']));
      for (const n of ['performerRed', 'performerStatue', 'performerGuitar', 'performerBlue', 'performerRed', 'performerStatue']) inWedge(1, n, 30);
    }

    // --- Block fill: a grid of buildings per block (towers toward the middle), then gaps packed with brownstones
    for (const b of blocks) {
      if (b.ts) continue;
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      const nx = Math.max(2, Math.round((w - 12.6) / 11) + 1), nz = Math.max(2, Math.round((d - 12.6) / 11) + 1);
      const cells = [];
      for (let gi = 0; gi < nx; gi++) for (let gj = 0; gj < nz; gj++) cells.push({ gi, gj, inner: gi > 0 && gi < nx - 1 && gj > 0 && gj < nz - 1 });
      cells.sort((a, c) => c.inner - a.inner); // towers first so they get their room
      for (const { gi, gj, inner } of cells) {
        const x = b.x0 + 6.3 + ((w - 12.6) * gi) / (nx - 1) + randRange(-0.7, 0.7);
        const z = b.z0 + 6.3 + ((d - 12.6) * gj) / (nz - 1) + randRange(-0.7, 0.7);
        let n;
        if (inner) n = b.downtown ? pick(['skyscraperA', 'skyscraperB', 'skyscraperC', 'skyscraperB']) : pick(['apartmentB', 'apartment', 'skyscraperA']);
        else if (b.downtown) n = pick(['apartment', 'waterTower', 'apartmentB', 'apartment', 'skyscraperA']);
        else n = pick(['brownstone', 'brownstoneB', 'waterTower', 'apartment', 'brownstone', 'brownstoneB']);
        if (!place(n, x, z, facing(x, z), 1)) place(pick(['brownstone', 'brownstoneB', 'waterTower']), x, z, facing(x, z), 1);
      }
      for (let k = 0; k < 8; k++) {
        const x = randRange(b.x0 + 4, b.x1 - 4), z = randRange(b.z0 + 4, b.z1 - 4);
        place(pick(['brownstone', 'brownstoneB', 'waterTower']), x, z, facing(x, z), 1);
      }
    }
    // a few extra towers in the open
    for (let k = 0; k < 6; k++) { const x = randRange(-80, 80), z = randRange(5, 80); place('skyscraperC', x, z, facing(x, z), 1); }

    // --- Traffic: taxis, cars, vans and buses circle the avenue/street loops in both directions
    const rt = this.routes;
    const drive = (R, n) => {
      ctx.placeOnRoute('taxi', R, { count: n + 1, speed: 7, offset: 2.5, speedJitter: 0.2 });
      ctx.placeOnRoute(ctx.pick(['car', 'carBlue', 'carGreen']), R, { count: n, speed: 7.5, offset: 2.5, speedJitter: 0.2 });
      ctx.placeOnRoute(ctx.pick(['car', 'carBlue', 'carGreen']), R, { count: Math.ceil(n / 2), speed: 6.5, offset: 2.5, speedJitter: 0.2 });
      ctx.placeOnRoute('van', R, { count: Math.ceil(n / 2), speed: 5.5, offset: 2.5, speedJitter: 0.15 });
      ctx.placeOnRoute('bus', R, { count: Math.ceil(n / 2), speed: 4.5, offset: 2.5, speedJitter: 0.1 });
    };
    rt.quads.forEach((R) => drive(R, 2));
    rt.rings.forEach(({ half, R }) => drive(R, half === 90 ? 3 : 2));
    // two ferries cruising the harbour loop
    ctx.placeOnRoute('ferry', rt.ferry, { count: 2, speed: 3, offset: 0 });

    // --- Central Park: trees, benches, lamps along the paths, hedge edging, a few walkers
    const PX = [PARK.x0 + 3, PARK.x1 - 3, PARK.z0 + 3, PARK.z1 - 3];
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) if (place(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
    };
    scatter('bigTree', 22, PX);
    scatter('tree', 36, PX);
    for (let x = PARK.x0 + 6; x < PARK.x1 - 2; x += 13) { place('bench', x, (PARK.z0 + PARK.z1) / 2 + 2.2, P, 1); place('streetLamp', x + 6, (PARK.z0 + PARK.z1) / 2 - 2.0, 0, 1); place('trashCan', x + 3, (PARK.z0 + PARK.z1) / 2 + 2, 0, 1); }
    for (let z = PARK.z0 + 6; z < PARK.z1 - 2; z += 13) place('bench', 43.4, z, P / 2, 1);
    for (let x = PARK.x0 + 1; x < PARK.x1; x += 3.4) { place('hedge', x, PARK.z0 + 0.5, 0, 1); place('hedge', x, PARK.z1 - 0.5, 0, 1); }
    scatter('pigeon', 12, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);
    scatter('pedestrian', 14, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);
    scatter('bike', 4, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);
    // iron fences along one long side of each surface lot
    for (let x = -83; x < -52; x += 1.9) ctx.place('ironFence', x, -84.6, 0, 1, { move: null });
    for (let z = -38; z < -7; z += 1.9) ctx.place('ironFence', 50.4, z, P / 2, 1, { move: null });
    for (let z = 7; z < 38; z += 1.9) ctx.place('ironFence', -95.4, z, P / 2, 1, { move: null });

    // --- Street furniture, in order: lamps, trees, benches and bins along every block side;
    // a hydrant / mailbox / news box / bin cluster (+ a hot-dog cart now and then) at each corner.
    for (const b of blocks) {
      if (b.ts) continue;
      for (const sd of SIDES) {
        const lo = sd.ax === 'z' ? b.x0 : b.z0, hi = sd.ax === 'z' ? b.x1 : b.z1;
        const edge = sd.ax === 'z' ? (sd.side < 0 ? b.z0 : b.z1) : (sd.side < 0 ? b.x0 : b.x1);
        const fd = sd.side < 0 ? edge + 1.4 : edge - 1.4;
        const at = (a, name, rot, dd = 0) => place(name, sd.ax === 'z' ? a : fd + dd, sd.ax === 'z' ? fd + dd : a, rot, 1);
        const yawAlong = sd.ax === 'z' ? 0 : P / 2;
        const ph = randRange(0, 4);
        for (let a = lo + 7 + ph; a < hi - 5; a += 22) rand() < 0.7 && at(a, 'streetLamp', sd.ax === 'z' ? (sd.side < 0 ? 0 : P) : (sd.side < 0 ? -P / 2 : P / 2));
        for (let a = lo + 3 + ph; a < hi - 3; a += 12) if (rand() < 0.7) at(a, 'planter', yawAlong);
        for (let a = lo + 12 + ph; a < hi - 8; a += 38) rand() < 0.35 && at(a, 'bench', sd.ax === 'z' ? (sd.side < 0 ? P : 0) : (sd.side < 0 ? P / 2 : -P / 2));
        if (rand() < 0.5) at(lo + 10 + ph, 'bike', yawAlong);
      }
    }
    for (const a of ROADS) for (const bz of ROADS) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = a + sx * 6.5, cz = bz + sz * 6.5;
      const kinds = ['hydrant', 'mailbox', 'newsBox', 'trashCan'];
      if ((Math.abs(a) + Math.abs(bz)) % 90 === 0) place('streetLamp', cx, cz, sx > 0 ? P / 2 : -P / 2, 1);
      place(kinds[(Math.abs(a) / 45 + Math.abs(bz) / 45 + (sx > 0 ? 1 : 0) + (sz > 0 ? 2 : 0)) % 4 | 0], cx + sx * 1.6, cz, undefined, 1);
      place(kinds[((Math.abs(a) / 45 + Math.abs(bz) / 45 + (sx > 0 ? 0 : 1) + (sz > 0 ? 1 : 0)) | 0) % 4], cx, cz + sz * 1.6, undefined, 1);
      if (rand() < 0.4) place('hotdogCart', cx + sx * 2.6, cz + sz * 2.6, Math.atan2(sx, sz), 1);
      if (rand() < 0.25) place('subway', cx + sx * 1.0, cz + sz * 4.5, 0, 1);
    }

    // bollard lines guarding the pavement corners round the spawn crossing
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) {
      place('bollard', sx * 5.6, sz * (11 + k * 2.8), 0, 1);
      place('bollard', sx * (11 + k * 2.8), sz * 5.6, 0, 1);
    }

    // --- People: pedestrians walk the pavements; pigeons gather in a few plazas (not in the harbour)
    let np = 0;
    for (let tries = 0; np < 110 && tries < 800; tries++) {
      const b = pick(blocks), sd = pick(SIDES);
      const edge = sd.ax === 'z' ? (sd.side < 0 ? b.z0 : b.z1) : (sd.side < 0 ? b.x0 : b.x1);
      const a = randRange(sd.ax === 'z' ? b.x0 + 2 : b.z0 + 2, sd.ax === 'z' ? b.x1 - 2 : b.z1 - 2);
      const dd = sd.side < 0 ? edge + 2.4 : edge - 2.4;
      if (place(pick(['pedestrian', 'pedestrianB', 'pedestrianC']), sd.ax === 'z' ? a : dd, sd.ax === 'z' ? dd : a, undefined, 1)) np++;
    }
    let ng = 0;
    for (let tries = 0; ng < 18 && tries < 200; tries++) {
      const b = pick(blocks); if (b.ts) continue;
      if (place('pigeon', randRange(b.x0 + 3, b.x1 - 3), randRange(b.z0 + 3, b.z1 - 3), undefined, 1)) ng++;
    }
    // subway entrances at a few corners are placed above; add the remaining ones on block edges
    for (const b of blocks) if (rand() < 0.4 && !b.ts) {
      const x = rand() < 0.5 ? b.x0 + 2.4 : b.x1 - 2.4, z = randRange(b.z0 + 6, b.z1 - 6);
      place('subway', x, z, x < b.cx ? P / 2 : -P / 2, 1);
    }
  },
};
