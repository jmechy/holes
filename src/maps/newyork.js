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
const ISLAND = { x: -108, z: 90 };

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

    // Water + Liberty island
    addDecal(rect((WATER.x0 + WATER.x1) / 2, (WATER.z0 + WATER.z1) / 2, WATER.x1 - WATER.x0, WATER.z1 - WATER.z0), '#3f8fd0', { style: 'water' });
    const waves = [];
    for (let i = 0; i < 18; i++) waves.push(rect(randRange(-118, -98), randRange(52, 118), randRange(1.5, 3.5), 0.25));
    addDecal(merge(waves), '#8fcaf0', { style: 'water' });
    addDecal(circle(ISLAND.x, ISLAND.z, 13, 28), '#e3d9b8', { style: 'sand' });
    addDecal(circle(ISLAND.x, ISLAND.z, 11, 28), '#68b862', { style: 'grass' });
    addDecal(circle(ISLAND.x, ISLAND.z, 8, 28), '#b7b7bd', { style: 'concrete' });
    // pier
    addDecal(rect(-100, 90, 8, 4), '#a97b42');
    // --- Traffic routes (used by populate): every loop runs both ways so each road carries two lanes.
    // Quadrant loops all turn the same way (shared edges = opposite directions); ring A/O add the +-45 and +-90 roads.
    const rt = (this.routes = { quads: [], rings: [] });
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
    const LOTS = [[-85, -50, -85, -50], [51, 84, -39, -6], [-119, -96, 5, 40]];
    const inLot = (x, z) => LOTS.some((b) => x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1);
    // static props never sit on the asphalt (movers may cross it)
    const onRoad = (x, z, m) => ROADS.some((c) => Math.abs(x - c) < RW / 2 + m || Math.abs(z - c) < RW / 2 + m);
    const place = (n, x, z, rot, sc = 1, opts) => {
      if (inLot(x, z)) return false;
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, (proto ? proto.radius * sc : 0) * 0.8)) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    // buildings face the nearest street (their front is local +Z)
    const facing = (x, z) => {
      let best = 1e9, rot = 0;
      for (const c of ROADS) {
        if (Math.abs(z - c) < best) { best = Math.abs(z - c); rot = z < c ? 0 : Math.PI; }
        if (Math.abs(x - c) < best) { best = Math.abs(x - c); rot = x < c ? Math.PI / 2 : -Math.PI / 2; }
      }
      return rot;
    };
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(x0, x1), z = randRange(z0, z1);
          const bld = /^(sky|apartment|waterTower|brownstone)/.test(name);
          if (place(name, x, z, bld ? facing(x, z) : undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const inPark = (x, z) => x > PARK.x0 - 6 && x < PARK.x1 + 6 && z > PARK.z0 - 6 && z < PARK.z1 + 6;
    const inWater = (x, z) => x < WATER.x1 && z > WATER.z0 && Math.hypot(x - ISLAND.x, z - ISLAND.z) > 14;
    const P = Math.PI;

    // Blocks: [x0,x1,z0,z1] excluding park + water blocks
    const blocks = [];
    IV.forEach(([x0, x1], i) => IV.forEach(([z0, z1], j) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (inPark(cx, cz) || (x1 < WATER.x1 + 1 && z1 > WATER.z0 + 1)) return;
      blocks.push({ x0, x1, z0, z1, cx, cz, i, j, downtown: i >= 1 && i <= 4 && j >= 2 && j <= 4 });
    }));
    // sidewalk ring point of a block
    const ring = (b, inset = 2.2) => {
      const t = rand() * 4, u = rand();
      const wx = b.x1 - b.x0 - 2 * inset, wz = b.z1 - b.z0 - 2 * inset;
      if (t < 1) return [b.x0 + inset + u * wx, b.z0 + inset];
      if (t < 2) return [b.x0 + inset + u * wx, b.z1 - inset];
      if (t < 3) return [b.x0 + inset, b.z0 + inset + u * wz];
      return [b.x1 - inset, b.z0 + inset + u * wz];
    };
    const scatterRing = (name, per, sMin = 1, sMax = 1) => {
      for (const b of blocks) {
        const cnt = Math.floor(per) + (rand() < per - Math.floor(per) ? 1 : 0);
        for (let k = 0; k < cnt; k++) {
          for (let t = 0; t < 12; t++) {
            const [x, z] = ring(b);
            if (place(name, x, z, undefined, randRange(sMin, sMax))) break;
          }
        }
      }
    };

    // --- Parked cars: nose-in stalls in the lots, parallel along the kerb
    const PARKED = ['taxi', 'car', 'carBlue', 'carGreen', 'taxi', 'van'];
    for (const s of this.lots) rand() < 0.62 && ctx.placeParked(ctx.pick(PARKED), s);
    for (const s of this.curb) rand() < 0.22 && ctx.placeParked(ctx.pick(PARKED), s);

    // --- Huge landmarks first
    place('liberty', ISLAND.x, ISLAND.z, 0, 1);
    place('empire', -22.5, 22.5, 0, 1);
    place('chrysler', 67.5, 67.5, 0, 1);

    // --- Skyscrapers: downtown blocks
    const towers = ['skyscraperA', 'skyscraperB', 'skyscraperC'];
    blocks.filter((b) => b.downtown).forEach((b) => {
      for (let k = 0; k < 2; k++) {
        const n = towers[Math.floor(rand() * 3)];
        for (let t = 0; t < 12; t++) { const x = randRange(b.x0 + 8, b.x1 - 8), z = randRange(b.z0 + 8, b.z1 - 8); if (place(n, x, z, facing(x, z), 1)) break; }
      }
    });
    scatter('skyscraperC', 2, [-80, 80, 5, 80], 1, 1, 60);

    // --- Mid-rise: apartments and water-tower buildings fill blocks
    for (const b of blocks) {
      const inner = [b.x0 + 4, b.x1 - 4, b.z0 + 4, b.z1 - 4];
      const nA = b.downtown ? 2 : 1, nW = b.downtown ? 1 : (rand() < 0.5 ? 1 : 0);
      scatter('apartmentB', b.downtown ? 1 : 0, inner, 1, 1, 25);
      scatter('apartment', nA, inner, 1, 1, 25);
      scatter('waterTower', nW, inner, 1, 1, 25);
    }

    // --- Brownstone rows along block edges (residential + outskirts)
    for (const b of blocks) {
      const rows = b.downtown ? 0 : 1;
      for (let s = 0; s < rows; s++) {
        for (let x = b.x0 + 4; x < b.x1 - 3; x += 6.4) {
          place(rand() < 0.5 ? 'brownstone' : 'brownstoneB', x, b.z0 + 4.3, P, 1);
          place(rand() < 0.5 ? 'brownstone' : 'brownstoneB', x, b.z1 - 4.3, 0, 1);
        }
      }
    }
    for (const b of blocks) scatter(rand() < 0.5 ? 'brownstone' : 'brownstoneB', b.downtown ? 1 : 2, [b.x0 + 4, b.x1 - 4, b.z0 + 4, b.z1 - 4], 1, 1, 15);

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
    rt.rings.forEach(({ half, R }) => drive(R, half === 90 ? 4 : 2));
    // --- Subway entrances + park trees
    scatterRing('subway', 1);
    scatter('bigTree', 22, [PARK.x0 + 3, PARK.x1 - 3, PARK.z0 + 3, PARK.z1 - 3]);
    scatter('tree', 40, [PARK.x0 + 3, PARK.x1 - 3, PARK.z0 + 3, PARK.z1 - 3]);
    scatter('bench', 14, [PARK.x0 + 3, PARK.x1 - 3, PARK.z0 + 3, PARK.z1 - 3]);
    scatter('pigeon', 30, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);
    scatter('pedestrian', 20, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);
    scatter('bike', 6, [PARK.x0 + 2, PARK.x1 - 2, PARK.z0 + 2, PARK.z1 - 2], 0.9, 1.1, 12);

    // --- Starter cluster near spawn (around the intersection, sidewalks and roads)
    const START = [-28, 28, -28, 28];
    scatter('pedestrian', 8, START, 0.9, 1.1, 12);
    scatter('pedestrianB', 5, START, 0.9, 1.1, 12);
    scatter('pigeon', 12, START, 0.9, 1.1, 12);
    scatter('hydrant', 8, START, 0.9, 1.1, 12);
    scatter('trashCan', 8, START, 0.9, 1.1, 12);
    scatter('newsBox', 5, START, 0.9, 1.1, 12);
    scatter('hotdogCart', 2, START, 0.95, 1.05, 12);
    scatter('mailbox', 4, START, 0.9, 1.1, 12);

    // --- Street furniture on sidewalks
    scatterRing('streetLamp', 1);
    scatterRing('hotdogCart', 1);
    scatterRing('bench', 1);
    scatterRing('bike', 1);
    scatterRing('mailbox', 1);
    scatterRing('newsBox', 1);
    scatterRing('hydrant', 1);
    scatterRing('trashCan', 2);
    scatterRing('tree', 1);

    // --- Small: pedestrians + pigeons everywhere (not in the water)
    const dryScatter = (name, n, sMin, sMax) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < 12; t++) {
          const x = randRange(-S + 3, S - 3), z = randRange(-S + 3, S - 3);
          if (inWater(x, z) || (x < WATER.x1 && z > WATER.z0)) continue;
          const nearWater = x < WATER.x1 + 10 && z > WATER.z0 - 10;
          if (place(name, x, z, undefined, randRange(sMin, sMax), nearWater ? { move: null } : undefined)) break;
        }
      }
    };
    dryScatter('pedestrian', 40, 0.9, 1.1);
    dryScatter('pedestrianB', 40, 0.9, 1.1);
    dryScatter('pedestrianC', 40, 0.9, 1.1);
    dryScatter('pigeon', 50, 0.9, 1.1);
    dryScatter('trashCan', 30, 0.9, 1.1);
    dryScatter('hydrant', 25, 0.9, 1.1);
    dryScatter('newsBox', 15, 0.9, 1.1);
    dryScatter('mailbox', 15, 0.9, 1.1);
  },
};
