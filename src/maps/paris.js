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

    // 4-wide pavements along both sides of every boulevard (shopfronts, cafe terraces, trees and lamps sit on them)
    const walks = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, hw = k % 2 ? 4.5 : 6.5;
      for (const sg of [-1, 1]) {
        const off = (hw + 2) * sg;
        walks.push(rect(Math.cos(a) * 76 - Math.sin(a) * off, Math.sin(a) * 76 + Math.cos(a) * off, 84, 4, -a));
      }
    }
    addDecal(merge(walks), ROAD_EDGE, { style: 'concrete' });

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
    const TAU = Math.PI * 2, PI = Math.PI;
    const riverZ = (x) => 62 + Math.sin(x / 22) * 10;
    const HW = (k) => (k % 2 ? 4.5 : 6.5);
    // static props stay off the asphalt (movers may cross it): roundabout ring + the 8 boulevards, as in decorate()
    const onRoad = (x, z, m) => {
      if (Math.hypot(x, z) < RING_R + m && Math.hypot(x, z) > 19) return true;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, c = Math.cos(a), sn = Math.sin(a);
        if (x * c + z * sn > 20 && Math.abs(-x * sn + z * c) < HW(k) + m) return true;
      }
      return false;
    };
    const place = (n, x, z, rot, sc = 1, opts) => {
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, Math.min(1, (proto ? proto.radius * sc : 0) * 0.6))) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const along = (a, d, off) => [Math.cos(a) * d - Math.sin(a) * off, Math.sin(a) * d + Math.cos(a) * off];
    // keep-clear zones (landmark open spaces, lots, river) shared by buildings and loose props
    const RECTS = [[-101.5, -48.5, -43.5, -6.5], [52.5, 91.5, -47.5, -16.5], [30, 70, 88, 110], [-70, -30, 88, 110], [-64, -20, -107, -73], [-24, -4, 40, 50]];
    const CIRCS = [[42, -72, 15.5], [-37, 14, 5.5], [37, 14, 5.5], [-75, -25, 12]];
    const keepClear = (x, z, m = 0) => {
      if (Math.abs(z - riverZ(x)) < 9.5 + m) return true;
      for (const b of RECTS) if (x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m) return true;
      for (const c of CIRCS) if (Math.hypot(x - c[0], z - c[1]) < c[2] + m) return true;
      return false;
    };
    const quay = (x, z) => Math.abs(z - riverZ(x)) < 17;
    const loose = (name, x, z, rot, sc = 1, opts) => !keepClear(x, z) && place(name, x, z, rot, sc, quay(x, z) ? { move: null, ...opts } : opts);
    const randIn = (box) => [randRange(box[0], box[1]), randRange(box[2], box[3])];
    const scatter = (name, n, box, sMin = 1, sMax = 1, tries = 30) => {
      let c = 0;
      for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) {
        const [x, z] = randIn(box);
        if (loose(name, x, z, undefined, randRange(sMin, sMax))) { c++; break; }
      }
      return c;
    };

    // --- Huge landmarks (open spaces kept clear around them)
    place('eiffel', -75, -25, 0, 1);
    place('arc', 0, -15, PI / 2, 1);
    place('cathedral', 42, -72, 0.3, 1);
    place('carousel', 72, -32, 0, 1);
    place('fountain', -37, 14, 0, 1);
    place('fountain', 37, 14, 0, 1);

    // --- Parked cars: nose-in stalls in the lots, parallel along the boulevard kerbs, coaches in the coach bay
    const carNames = ['citroen', 'citroen2', 'citroen3', 'taxi', 'citroen', 'citroen3'];
    for (const s of this.lots.east) rand() < 0.5 && ctx.placeParked(ctx.pick(carNames), s);
    for (const s of this.lots.west) rand() < 0.5 && ctx.placeParked(ctx.pick(carNames), s);
    for (const s of this.lots.coach) rand() < 0.35 && ctx.placeParked('tourBus', s);
    for (const s of this.curb) rand() < 0.2 && ctx.placeParked(ctx.pick(carNames), s);

    // --- Boulevard pavements: lamps, plane trees in rows, bins, bollards, Morris columns and kiosks
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, hw = HW(k);
      for (const sg of [-1, 1]) {
        const rot = k % 2 ? 0 : 0;
        for (let d = 35, i = 0; d < 119; d += 7, i++) {
          const [lx, lz] = along(a, d, sg * (hw + 0.9));
          const [tx, tz] = along(a, d + 3.5, sg * (hw + 1.7));
          if (quay(lx, lz) && Math.abs(lz - riverZ(lx)) < 11.5) continue;
          if (i % 4 === 0) place('streetLamp', lx, lz, -a);
          else if (i % 2 === 1) place('planeTree', tx, tz, undefined, 0.85, { move: null });
          if (i % 8 === 1) place('trashCan', ...along(a, d, sg * (hw + 1.0)), 0);
          if (i % 16 === 3) { place('bollard', ...along(a, d + 1, sg * (hw + 0.5)), 0); place('bollard', ...along(a, d + 2.2, sg * (hw + 0.5)), 0); }
        }
        // Morris columns and kiosks at the corners where the lanes meet the boulevard
        place('moriceColumn', ...along(a, 38.5, sg * (hw + 1.5)), 0);
        place('newsstand', ...along(a, 52, sg * (hw + 2.0)), -a + (sg > 0 ? PI : 0), 1);
        place('moriceColumn', ...along(a, 91, sg * (hw + 1.5)), 0);
        if (k % 2 === 0) place('newsstand', ...along(a, 103, sg * (hw + 2.0)), -a + (sg > 0 ? PI : 0), 1);
      }
    }

    // --- Haussmann perimeter blocks: rows parallel to each boulevard, back-to-back pairs around a courtyard strip,
    // a lane between pairs. Exact footprint packing so facades run continuous.
    const SPEC = { houseA: 9, houseB: 7, houseC: 10, houseD: 6, houseE: 8, houseF: 9, houseG: 6 };
    const DEP = { houseG: 5.5 };
    const NAMES = ['houseA', 'houseC', 'houseF', 'houseE', 'houseB', 'houseD', 'houseA', 'houseC', 'houseE'];
    const DEPTH = 7;
    const boxes = [];
    const overlaps = (A, B) => {
      for (const ax of [[A.ux, A.uz], [A.vx, A.vz], [B.ux, B.uz], [B.vx, B.vz]]) {
        const proj = (X) => Math.abs(ax[0] * X.ux + ax[1] * X.uz) * X.hw + Math.abs(ax[0] * X.vx + ax[1] * X.vz) * X.hd;
        if (Math.abs((B.x - A.x) * ax[0] + (B.z - A.z) * ax[1]) >= proj(A) + proj(B) - 0.05) return false;
      }
      return true;
    };
    const blocked = (B) => {
      const pts = [[0, 0]];
      for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) if (sx || sz) pts.push([sx, sz]);
      for (const [sx, sz] of pts) {
        const x = B.x + B.ux * sx * B.hw + B.vx * sz * B.hd, z = B.z + B.uz * sx * B.hw + B.vz * sz * B.hd;
        if (Math.abs(x) > S - 1.5 || Math.abs(z) > S - 1.5) return true;
        if (Math.hypot(x, z) < RING_R + 2) return true;
        if (keepClear(x, z, 0.5)) return true;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU, c = Math.cos(a), sn = Math.sin(a);
          if (x * c + z * sn > 20 && Math.abs(-x * sn + z * c) < HW(k) + 3.7) return true;
        }
      }
      for (const O of boxes) if (Math.hypot(O.x - B.x, O.z - B.z) < 14 && overlaps(B, O)) return true;
      return false;
    };
    const tables = [];
    const tryBuild = (name, x, z, rot, front) => {
      const w = SPEC[name];
      const B = { x, z, ux: Math.cos(rot), uz: -Math.sin(rot), vx: Math.sin(rot), vz: Math.cos(rot), hw: w / 2 + 0.1, hd: (DEP[name] ?? DEPTH) / 2 + 0.1 };
      if (blocked(B)) return false;
      if (!ctx.place(name, x, z, rot, 1, { move: null, tight: true, overlap: 0 })) return false;
      boxes.push(B);
      if (front && w >= 8) tables.push({ x: x + B.vx * (DEPTH / 2 + 1.7), z: z + B.vz * (DEPTH / 2 + 1.7), ux: B.ux, uz: B.uz, w });
      return true;
    };
    const L0 = (k) => HW(k) + 4 + DEPTH / 2;
    const rowL = [0, 10.6, 22.3, 32.9, 44.6, 55.2, 66.9, 77.5];
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 8; k++) for (const sg of [-1, 1]) {
        const a = (k / 8) * TAU, L = L0(k) + rowL[j];
        const toward = Math.atan2(sg * Math.sin(a), -sg * Math.cos(a));
        const rot = j % 2 === 0 ? toward : toward + PI;
        let d = 28;
        while (d < 175) {
          const name = NAMES[Math.floor(rand() * NAMES.length)], w = SPEC[name];
          const dc = d + w / 2;
          const [x, z] = along(a, dc, sg * L);
          if (Math.abs(Math.atan2(L, dc)) > PI / 8 + 0.14) { d += dc < 60 ? 2 : 6; if (Math.atan2(L, dc) > PI / 8 + 0.14 && dc > 60) break; continue; }
          if (tryBuild(name, x, z, rot, true)) d += w + 0.2; else d += 2;
        }
      }
    }
    // fill remaining pockets with buildings facing the nearest boulevard
    const order = [];
    for (let x = -S + 4; x < S - 3; x += 2) for (let z = -S + 4; z < S - 3; z += 2) order.push([x, z]);
    order.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
    for (const [x, z] of order) {
      if (Math.hypot(x, z) < RING_R + 4) continue;
      const k0 = Math.atan2(z, x) / (PI / 4);
      let done = false;
      for (const k1 of [Math.round(k0), k0 > Math.round(k0) ? Math.round(k0) + 1 : Math.round(k0) - 1]) {
        const k = ((k1 % 8) + 8) % 8, a = (k1 / 8) * TAU;
        const lat = -x * Math.sin(a) + z * Math.cos(a), sg = lat >= 0 ? 1 : -1;
        const rot = Math.atan2(sg * Math.sin(a), -sg * Math.cos(a));
        for (const name of ['houseC', 'houseF', 'houseA', 'houseE', 'houseB', 'houseD', 'houseG']) if (tryBuild(name, x, z, rot, true)) { done = true; break; }
        if (done) break;
      }
    }
    // cafe terraces in front of the shops
    for (const t of tables) {
      if (rand() < 0.4) continue;
      for (const sx of [-1, 1]) {
        if (rand() < 0.5) continue;
        const off = sx * (t.w / 2 - 2.2);
        loose('cafeTable', t.x + t.ux * off, t.z + t.uz * off, Math.atan2(-t.uz, t.ux) + (rand() < 0.5 ? 0 : PI), 1);
      }
      if (rand() < 0.3) loose('flowerPot', t.x + t.ux * 0.0, t.z + t.uz * 0.0, undefined, 1);
    }

    // --- Courtyard strips and lanes between building pairs: planters, hedges, bushes, bins, racks, benches, lamps
    const COURT = ['hedge', 'bush', 'planterBox', 'hedge', 'bikeRack', 'bush', 'planterBox', 'hedge', 'bench'];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      for (const sg of [-1, 1]) {
        const base = L0(k);
        for (const [dl, kind] of [[5.3, 'court'], [27.6, 'court'], [49.9, 'court'], [72.2, 'court'], [16.45, 'lane'], [38.75, 'lane'], [61.0, 'lane']]) {
          const L = base + dl;
          for (let d = 32, i = 0; d < 170; d += kind === 'court' ? 9 : 21, i++) {
            if (Math.abs(Math.atan2(L, d)) > PI / 8 + 0.2) continue;
            const [x, z] = along(a, d, sg * L);
            if (kind === 'court') {
              const n = COURT[(i * 7 + k) % COURT.length];
              place(n, x, z, n === 'hedge' || n === 'planterBox' || n === 'bench' ? -a : undefined, 1);
            } else if (i % 2 === 0) place('streetLamp', x, z, -a);
            else place('bench', x, z, -a + PI / 2);
          }
        }
      }
    }

    // --- Quays along the Seine: lamps, plane trees, benches, bins
    for (let x = -S + 8, i = 0; x < S - 6; x += 7, i++) {
      for (const sg of [-1, 1]) {
        const z = riverZ(x) + sg * 10.4;
        if (i % 3 === 0) ctx.place('streetLamp', x, z, 0, 1, { move: null });
        else if (i % 3 === 1) ctx.place('planeTree', x, riverZ(x) + sg * 11.3, undefined, 0.85, { move: null });
        else ctx.place(sg > 0 ? 'bench' : 'trashCan', x, z, sg > 0 ? 0 : 0, 1, { move: null });
      }
    }

    // --- Landmark open spaces: hedged lawns, fences, park trees
    const edgeRun = (name, x0, z0, x1, z1, step, rot) => {
      const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / step);
      for (let i = 0; i <= n; i++) ctx.place(name, x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, rot, 1, { move: null });
    };
    edgeRun('hedge', -100.6, -42, -50.6, -42, 3.6, 0); edgeRun('hedge', -100.6, -8, -50.6, -8, 3.6, 0);
    edgeRun('ironFence', 54.5, -46.5, 89, -46.5, 2.2, 0); edgeRun('ironFence', 54.5, -17.5, 89, -17.5, 2.2, 0);
    edgeRun('ironFence', 54, -45, 54, -19, 2.2, PI / 2); edgeRun('ironFence', 90, -45, 90, -19, 2.2, PI / 2);
    scatter('tree', 12, [-97, -55, -39, -12]);
    scatter('tree', 8, [57, 87, -43, -21]);
    scatter('bench', 10, [-97, -55, -39, -12]);
    scatter('bench', 8, [57, 87, -43, -21]);
    scatter('flowerPot', 12, [57, 87, -43, -21]);
    scatter('tourist', 14, [-97, -55, -39, -12], 1, 1, 12);
    scatter('tourist2', 10, [-97, -55, -39, -12], 1, 1, 12);
    scatter('tourist2', 8, [57, 87, -43, -21], 1, 1, 12);
    // cathedral parvis
    for (let i = 0; i < 10; i++) { const a = 1.6 + i * 0.35; ctx.place(i % 2 ? 'planterBox' : 'bush', 42 + Math.cos(a) * 12.5, -72 + Math.sin(a) * 12.5, a + PI / 2, 1, { move: null }); }
    // car park edges and fountain plazas
    for (const [cx, cz] of [[-37, 14], [37, 14]]) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; place('bench', cx + Math.cos(a) * 4.6, cz + Math.sin(a) * 4.6, -a + PI / 2, 1); }
    // trees and hedges lining the ring road
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU + 0.07, R = RING_R + 1.9;
      if (i % 2) place('planeTree', Math.cos(a) * R, Math.sin(a) * R, undefined, 0.8, { move: null });
      else place('streetLamp', Math.cos(a) * (RING_R + 1.0), Math.sin(a) * (RING_R + 1.0), -a);
    }

    // --- Roundabout garden (spawn): parterre hedges flanking the eight paths, benches, lamps, planters, strollers
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      for (const sg of [-1, 1]) {
        for (const r of [11.4, 14.4]) { ctx.place('hedge', ...along(a, r, sg * 1.5), -a, 1, { move: null }); }
        ctx.place('flowerPot', ...along(a, 8.6, sg * 1.2), 0, 1, { move: null });
      }
      ctx.place('streetLamp', ...along(a, 9.6, 0), 0, 1, { move: null });
      ctx.place('bench', ...along(a, 16.6, 0), -a + PI / 2, 1, { move: null });
      ctx.place('bush', ...along(a + TAU / 16, 13, 0), undefined, 1, { move: null });
      ctx.place('planterBox', ...along(a + TAU / 16, 16.2, 0), -a - TAU / 16, 1, { move: null });
      ctx.place('bush', ...along(a + TAU / 16, 8, 0), undefined, 1, { move: null });
    }
    for (let i = 0; i < 9; i++) {
      const [x, z] = [randRange(-16, 16), randRange(-17, 17)];
      if (Math.hypot(x, z) < 17) ctx.place(i % 3 === 0 ? 'mime' : i % 2 ? 'tourist' : 'tourist2', x, z, undefined, 1, undefined);
    }

    // --- People: strollers, tourists and mimes wandering the pavements, lawns and courtyards
    const ALL = [-S + 5, S - 5, -S + 5, S - 5];
    scatter('tourist', 22, ALL, 1, 1, 80); scatter('tourist2', 22, ALL, 1, 1, 80); scatter('mime', 10, ALL, 1, 1, 80);

    // --- Edge of the map: hedged verge
    for (let i = -S + 6; i < S - 4; i += 18) {
      for (const [x, z] of [[i, -S + 2.2], [i, S - 2.2], [-S + 2.2, i], [S - 2.2, i]]) loose('hedge', x, z, undefined, 1);
    }

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
  },
};
