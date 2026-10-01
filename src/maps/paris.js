import { buildProtos } from '../objects/paris.js';

const ROAD = '#b5aea0';
const ROAD_EDGE = '#d6ccb2';
const RING_R = 33; // roundabout asphalt radius
const CREAM = '#f4ecd6';
const LAWN = '#79b761';
const LAWN2 = '#6aa856';
const GRAVEL = '#e7d9b4';
const WATER = '#5aa9dd';
const WATER2 = '#7cc0ea';

export default {
  id: 'paris',
  name: 'Paris',
  description: 'Croissants, cafes and the mighty Eiffel Tower await!',
  cardColor: '#e6b3d8',
  emoji: '🗼',
  size: 120,
  groundColor: '#e2d6b8',
  skyColor: '#f6d9e8',
  fogColor: '#f7dcc2',
  lightColor: '#fff0e0',
  ambient: 0.62,
  groundStyle: 'concrete',
  // Warm golden late afternoon: a low amber sun from the west, lavender sky fill, soft long shadows.
  lighting: {
    sunDirection: [-48, 38, 36], sunColor: '#ffbf78', sunIntensity: 0.82 * Math.PI,
    hemiSkyColor: '#c6d2f2', hemiGroundColor: '#b08760', hemiIntensity: 0.58 * Math.PI,
    shadowOpacity: 0.7, shadowRadius: 3.6, environmentIntensity: 0.26, exposure: 1.0,
  },
  postProcessing: { aoRadius: 0.5, aoStrength: 0.17 },
  sky: { top: '#7fc0ee', horizon: '#f7dcc2' },
  clouds: true,
  backdrop: [
    { type: 'city', color: '#eadfc4', color2: '#cfc4a8' },
    { type: 'hills', side: 'north', color: '#88c078', color2: '#a9cfb0' },
  ],
  edge: 'hedge',
  buildProtos,

  routes: null,

  decorate(ctx) {
    const { rect, circle, merge, addDecal } = ctx;
    const S = ctx.size;
    const TAU = Math.PI * 2;
    // rect() rotates so that direction angle a in the (x,z) plane needs rotY = -a
    const road = (a, r0, r1, w) => {
      const m = (r0 + r1) / 2;
      return rect(Math.cos(a) * m, Math.sin(a) * m, r1 - r0, w, -a);
    };
    const riverZ = (x) => 62 + Math.sin(x / 22) * 10;

    // --- Seine (drawn first so bridges/roads pass over it)
    const seg = [];
    const pts = [];
    for (let x = -S - 6; x <= S + 6; x += 10) pts.push([x, riverZ(x)]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const a = Math.atan2(z1 - z0, x1 - x0);
      seg.push(rect((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 1, 15, -a));
      seg.push(circle(x1, z1, 7.5, 12));
    }
    addDecal(merge(seg), WATER, { style: 'water' });
    const glint = [];
    for (let x = -S + 5; x < S; x += 13) glint.push(rect(x, riverZ(x) + Math.sin(x) * 3, 5, 0.4, -0.15));
    addDecal(merge(glint), WATER2, { style: 'water' });
    // stone embankments
    const emb = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const a = Math.atan2(z1 - z0, x1 - x0);
      for (const s of [-1, 1]) {
        emb.push(rect((x0 + x1) / 2 - Math.sin(a) * s * 8, (z0 + z1) / 2 + Math.cos(a) * s * 8, Math.hypot(x1 - x0, z1 - z0) + 1, 1.0, -a));
      }
    }
    addDecal(merge(emb), CREAM, { style: 'concrete' });

    // --- Boulevards radiating from the roundabout
    const roads = [];
    const edges = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      roads.push(road(a, 20, S * 1.45, k % 2 ? 9 : 13));
    }
    // ring road and roundabout
    addDecal(merge(roads), ROAD, { style: 'asphalt' });
    addDecal(circle(0, 0, RING_R, 40), ROAD, { style: 'asphalt' }); // wide enough for the ring lanes incl. the detour round the Arc
    addDecal(circle(0, 0, 19, 40), ROAD_EDGE, { style: 'concrete' });
    addDecal(circle(0, 0, 17.5, 40), LAWN, { style: 'grass' });
    addDecal(circle(0, 0, 8, 32), GRAVEL, { style: 'sand' });
    addDecal(circle(0, 0, 5, 32), LAWN2, { style: 'grass' });
    // roundabout garden: rings of flower beds, a hedge ring and a mosaic star
    const beds = [], beds2 = [], beds3 = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      beds.push(circle(Math.cos(a) * 14, Math.sin(a) * 14, 0.9, 10));
      beds2.push(circle(Math.cos(a + 0.11) * 11.4, Math.sin(a + 0.11) * 11.4, 0.7, 10));
      beds3.push(circle(Math.cos(a) * 16.2, Math.sin(a) * 16.2, 0.55, 8));
    }
    addDecal(merge(beds), '#f28fb1');
    addDecal(merge(beds2), '#ffd21f');
    addDecal(merge(beds3), '#ffffff');
    const star = [];
    for (let i = 0; i < 8; i++) star.push(rect(Math.cos((i / 8) * TAU) * 6.5, Math.sin((i / 8) * TAU) * 6.5, 6, 0.6, -(i / 8) * TAU));
    addDecal(merge(star), '#c9b98f');
    // cream sidewalks along the cardinal boulevards
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * TAU;
      for (const s of [-1, 1]) {
        const off = 7.6 * s;
        edges.push(rect(Math.cos(a) * 69 - Math.sin(a) * off, Math.sin(a) * 69 + Math.cos(a) * off, 66, 1.6, -a)); // starts beyond the ring road
      }
    }
    addDecal(merge(edges), ROAD_EDGE, { style: 'concrete' });
    // sidewalks along the diagonal boulevards too, and zebra crossings where each boulevard meets the roundabout
    const edges2 = [], zebra = [], manholes = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, hw = k % 2 ? 4.5 : 6.5;
      if (k % 2) for (const s of [-1, 1]) {
        const off = (hw + 0.9) * s;
        edges2.push(rect(Math.cos(a) * 75 - Math.sin(a) * off, Math.sin(a) * 75 + Math.cos(a) * off, 80, 1.6, -a));
      }
      for (let t = -hw + 0.8; t <= hw - 0.8; t += 1.3) zebra.push(rect(Math.cos(a) * (RING_R + 2.5) - Math.sin(a) * t, Math.sin(a) * (RING_R + 2.5) + Math.cos(a) * t, 3, 0.7, -a));
      for (let r = 44; r < 118; r += 27) manholes.push(circle(Math.cos(a) * r - Math.sin(a) * 1.5, Math.sin(a) * r + Math.cos(a) * 1.5, 0.55, 10));
    }
    addDecal(merge(edges2), ROAD_EDGE, { style: 'concrete' });
    addDecal(merge(zebra), '#f7f2e4');
    addDecal(merge(manholes), '#6a665c');

    // dashed centre lines
    const dashes = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      for (let r = 30; r < S * 1.4; r += 8) {
        dashes.push(rect(Math.cos(a) * r, Math.sin(a) * r, 3.5, 0.3, -a));
      }
    }
    addDecal(merge(dashes), '#f7f2e4');

    // --- Bridges (flat decals) over the Seine on the boulevards
    const bridges = [], rails = [];
    for (const bx of [-64, 0, 64]) {
      const zc = riverZ(bx);
      bridges.push(rect(bx, zc, 12, 20));
      rails.push(rect(bx - 6.3, zc, 0.7, 21), rect(bx + 6.3, zc, 0.7, 21));
    }
    bridges.push(rect(-32, riverZ(-32), 8, 19), rect(32, riverZ(32), 8, 19));
    addDecal(merge(bridges), '#c9bfa4');
    addDecal(merge(rails), '#8f8670');

    // --- Champ de Mars: big lawn with gravel paths (west), small park (east)
    addDecal(rect(-75, -25, 48, 32), LAWN, { style: 'grass' });
    const mow = [];
    for (let i = 0; i < 8; i++) mow.push(rect(-97 + i * 6, -25, 3, 32));
    addDecal(merge(mow), '#84c26a', { style: 'grass' });
    addDecal(merge([rect(-75, -25, 44, 3), rect(-75, -25, 3, 28), rect(-75, -25, 30, 3, 0.7), rect(-75, -25, 30, 3, -0.7)]), GRAVEL, { style: 'sand' });
    addDecal(circle(-75, -25, 6, 24), GRAVEL, { style: 'sand' });
    const parterre = [], parterre2 = [];
    for (const [dx, dz] of [[-14, -9], [14, -9], [-14, 9], [14, 9]]) {
      parterre.push(circle(-75 + dx, -25 + dz, 2.6, 16));
      parterre2.push(circle(-75 + dx, -25 + dz, 1.5, 12));
    }
    addDecal(merge(parterre), '#f28fb1');
    addDecal(merge(parterre2), '#ffd21f');
    const patches = [];
    for (let i = 0; i < 6; i++) patches.push(rect(-93 + i * 7.2, -36, 3.5, 4), rect(-93 + i * 7.2, -14, 3.5, 4));
    addDecal(merge(patches), LAWN2, { style: 'grass' });
    addDecal(rect(72, -32, 34, 26), LAWN, { style: 'grass' });
    addDecal(merge([rect(72, -32, 30, 2.5), rect(72, -32, 2.5, 22)]), GRAVEL, { style: 'sand' });
    addDecal(circle(72, -32, 5, 20), GRAVEL, { style: 'sand' });
    // pavement plazas by the river (parking lots are added below once the routes exist)
    addDecal(rect(-14, 45, 14, 6), '#eadfc0', { style: 'concrete' }); // clear of the southern boulevard
    // --- Traffic routes (used by populate). Roundabout ring + the 8 boulevards (out and in) + boats on the Seine.
    const rt = (this.routes = {});
    const ringPts = (dir) => {
      const p = [];
      for (let i = 0; i < 48; i++) {
        const a = dir * (i / 48) * TAU;
        // bulge outwards around the Arc de Triomphe (at 0,-15) so it stays clear of the corridor
        const da = ((a - 1.5 * Math.PI) % TAU + 1.5 * TAU) % TAU - Math.PI;
        const R = 23 + 5 * Math.exp(-((da / 0.44) ** 2));
        p.push([Math.cos(a) * R, Math.sin(a) * R]);
      }
      return p;
    };
    rt.ringA = ctx.addRoute(ringPts(1), { loop: true, width: 6 });
    rt.ringB = ctx.addRoute(ringPts(-1), { loop: true, width: 6 });
    rt.blvd = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const d1 = k % 2 ? 148 : 112;
      const out = [[Math.cos(a) * 30, Math.sin(a) * 30], [Math.cos(a) * d1, Math.sin(a) * d1]];
      const w = k % 2 ? 6 : 8;
      rt.blvd.push({
        k, off: k % 2 ? 2.2 : 3.2,
        out: ctx.addRoute(out, { loop: false, width: w }),
        in: ctx.addRoute([out[1], out[0]], { loop: false, width: w }),
      });
    }
    const river = [];
    for (let x = -100; x <= 100; x += 10) river.push([x, riverZ(x)]);
    rt.boatE = ctx.addRoute(river, { loop: false, width: 9, network: 'water' });
    rt.boatW = ctx.addRoute(river.slice().reverse(), { loop: false, width: 9, network: 'water' });

    // --- Parking: two car lots south of the Seine, a coach bay by the Champ de Mars, kerbside parking on the
    // four cardinal boulevards (both sides).
    this.lots = {
      east: ctx.parkingLot(50, 99, 36, 18, { rotY: 0, stallW: 2.9, stallD: 5, aisle: 6, color: '#8d8a84', lineColor: '#f4efe0' }),
      west: ctx.parkingLot(-50, 99, 36, 18, { rotY: 0, stallW: 2.9, stallD: 5, aisle: 6, color: '#8d8a84', lineColor: '#f4efe0' }),
      coach: ctx.parkingLot(-42, -90, 40, 30, { rotY: 0, stallW: 4.6, stallD: 10.5, aisle: 7, color: '#8d8a84', lineColor: '#f4efe0' }),
    };
    this.curb = [];
    for (const b of rt.blvd) if (b.k % 2 === 0) for (const R of [b.out, b.in]) this.curb.push(...ctx.roadsideSpots(R, { side: 'right', spacing: 6.6, from: 0.02, to: 0.98 }));
  },

  populate(ctx) {
    const { randRange, rand, size: S } = ctx;
    const TAU = Math.PI * 2;
    // static props stay off the asphalt (movers may cross it): roundabout ring + the 8 boulevards, as in decorate()
    const onRoad = (x, z, m) => {
      if (Math.hypot(x, z) < RING_R + m && Math.hypot(x, z) > 19) return true;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, c = Math.cos(a), sn = Math.sin(a);
        if (x * c + z * sn > 20 && Math.abs(-x * sn + z * c) < (k % 2 ? 4.5 : 6.5) + m) return true;
      }
      return false;
    };
    const place = (n, x, z, rot, sc = 1, opts) => {
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, Math.min(1, (proto ? proto.radius * sc : 0) * 0.6))) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const riverZ = (x) => 62 + Math.sin(x / 22) * 10;
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(x0, x1), z = randRange(z0, z1);
          if (place(name, x, z, undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    // scatter avoiding the river band
    const dry = (name, n, box, sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(box[0], box[1]), z = randRange(box[2], box[3]);
          if (Math.abs(z - riverZ(x)) < 9.5 || inLot(x, z)) continue;
          if (place(name, x, z, undefined, randRange(sMin, sMax), Math.abs(z - riverZ(x)) < 17 ? { move: null } : undefined)) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    // keep loose props out of the parking lots, and the boulevard houses off the two big lawns
    const LOTS = [[32, 68, 90, 108], [-68, -32, 90, 108], [-62, -22, -105, -75]];
    const inLot = (x, z) => LOTS.some((b) => x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1);
    const inLawn = (x, z) => (x > -101 && x < -49 && z > -43 && z < -7) || (x > 53 && x < 91 && z > -47 && z < -17);
    const along = (a, d, off) => [Math.cos(a) * d - Math.sin(a) * off, Math.sin(a) * d + Math.cos(a) * off];

    // --- Huge landmarks
    place('eiffel', -75, -25, 0, 1);
    place('arc', 0, -15, Math.PI / 2, 1);
    place('cathedral', 42, -72, 0.3, 1);
    place('carousel', 72, -32, 0, 1);
    place('fountain', -37, 14, 0, 1);
    place('fountain', 37, 14, 0, 1);

    // --- Parked cars: nose-in stalls in the lots, parallel along the boulevard kerbs, coaches in the coach bay
    const carNames = ['citroen', 'citroen2', 'citroen3', 'taxi', 'citroen', 'citroen3'];
    for (const s of this.lots.east) rand() < 0.6 && ctx.placeParked(ctx.pick(carNames), s);
    for (const s of this.lots.west) rand() < 0.6 && ctx.placeParked(ctx.pick(carNames), s);
    for (const s of this.lots.coach) rand() < 0.4 && ctx.placeParked('tourBus', s);
    for (const s of this.curb) rand() < 0.5 && ctx.placeParked(ctx.pick(carNames), s);

    // --- Haussmann blocks lining the boulevards
    const houses = ['houseA', 'houseB', 'houseC'];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const half = k % 2 ? 9 : 11;
      for (const s of [-1, 1]) {
        for (let d = 36; d < 112; d += 16) {
          const [x, z] = along(a, d + randRange(-1, 1), s * (half + 6.5));
          if (Math.abs(z - riverZ(x)) < 15 || inLawn(x, z)) continue;
          if (rand() < 0.5) continue;
          place(ctx.pick(houses), x, z, -a + (s > 0 ? Math.PI : 0), 1);
        }
      }
    }
    dry('houseB', 3, ALL);

    // --- Traffic: roundabout, boulevards (both directions), tour buses, scooters, bicycles, boats on the Seine
    const rt = this.routes;
    const cars = ['citroen', 'citroen2', 'citroen3', 'taxi', 'citroen'];
    ctx.placeOnRoute('citroen2', rt.ringA, { count: 3, speed: 6, offset: 2.5, speedJitter: 0.1 });
    ctx.placeOnRoute('taxi', rt.ringB, { count: 3, speed: 6, offset: 2.5, speedJitter: 0.1 });
    ctx.placeOnRoute('tourBus', rt.ringA, { count: 1, speed: 4.5, offset: 2.5 });
    ctx.placeOnRoute('tourBus', rt.ringB, { count: 1, speed: 4.5, offset: 2.5 });
    for (const b of rt.blvd) {
      const even = b.k % 2 === 0;
      for (const R of [b.out, b.in]) {
        ctx.placeOnRoute(ctx.pick(cars), R, { count: even ? 3 : 2, speed: 7, offset: b.off, speedJitter: 0.2 });
        if (even) ctx.placeOnRoute('tourBus', R, { count: 1, speed: 4.5, offset: b.off, speedJitter: 0.1 });
      }
    }
    for (const b of rt.blvd) {
      if (b.k % 2) continue;
      ctx.placeOnRoute('scooter', b.out, { count: 1, speed: 5.5, offset: b.off - 1.4, speedJitter: 0.2 });
      ctx.placeOnRoute('bicycle', b.in, { count: 1, speed: 3.2, offset: b.off + 1.2, speedJitter: 0.2 });
    }
    ctx.placeOnRoute('scooter', rt.ringA, { count: 2, speed: 5.5, offset: 1.2, speedJitter: 0.2 });
    ctx.placeOnRoute('bicycle', rt.ringB, { count: 2, speed: 3.2, offset: 1.2, speedJitter: 0.2 });
    ctx.placeOnRoute('boat', rt.boatE, { count: 5, speed: 2.6, offset: 2.6, speedJitter: 0.25 });
    ctx.placeOnRoute('boat', rt.boatW, { count: 5, speed: 2.6, offset: 2.6, speedJitter: 0.25 });
    dry('newsstand', 12, ALL, 0.95, 1.1);
    dry('umbrellaTable', 26, ALL, 0.95, 1.1);
    dry('tree', 18, [-95, -55, -38, -12]);
    dry('tree', 10, [55, 90, -44, -20]);
    dry('tree2', 30, [-95, 95, -100, 100]);
    dry('tree2', 8, [-95, -55, -38, -12]);
    dry('fountain', 1, ALL);

    // --- Starter cluster around the spawn: lawn island + gravel
    const START = [-26, 26, -26, 26];
    scatter('croissant', 14, START, 0.9, 1.1, 12);
    scatter('flowerPot', 10, START, 0.9, 1.1, 12);
    scatter('baguetteBasket', 8, START, 0.9, 1.1, 12);
    scatter('tourist', 6, START, 0.9, 1.1, 12);
    scatter('bicycle', 4, START, 0.9, 1.1, 12);
    scatter('streetLamp', 6, START, 0.9, 1.1, 12);

    // --- Medium
    dry('bench', 30, ALL, 0.9, 1.1);
    dry('moriceColumn', 20, ALL, 0.9, 1.1);
    dry('cafeTable', 50, ALL, 0.9, 1.1);
    dry('scooter', 22, ALL, 0.9, 1.1);
    dry('bench', 16, [-95, -55, -38, -12]);
    dry('bench', 8, [55, 90, -44, -20]);

    // --- Lamps along the boulevards
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      for (let d = 32; d < 116; d += 14) {
        for (const s of [-1, 1]) {
          const [x, z] = along(a, d, s * (k % 2 ? 5.6 : 7.4));
          if (Math.abs(z - riverZ(x)) < 9) continue;
          place('streetLamp', x, z, undefined, 1);
        }
      }
    }
    // --- Small
    dry('streetLamp', 40, ALL, 0.9, 1.1, 12);
    dry('flowerPot', 60, ALL, 0.9, 1.15, 12);
    dry('croissant', 70, ALL, 0.9, 1.15, 12);
    dry('baguetteBasket', 45, ALL, 0.9, 1.15, 12);
    dry('bicycle', 40, ALL, 0.9, 1.1, 12);
    dry('tourist', 55, ALL, 0.9, 1.15, 12);
    dry('tourist2', 55, ALL, 0.9, 1.15, 12);
    dry('mime', 32, ALL, 0.9, 1.15, 12);
    dry('tourist', 24, [-95, -55, -38, -12], 0.9, 1.1, 12);
    dry('tourist2', 20, [-95, -55, -38, -12], 0.9, 1.1, 12);
    dry('mime', 8, [-30, 30, -30, 30], 0.9, 1.1, 12);
    dry('flowerPot', 30, [-30, 30, -30, 30], 0.9, 1.15, 12);
    dry('croissant', 30, ALL, 0.9, 1.15, 12);
  },
};
