import { buildProtos } from '../objects/rome.js';

const PI = Math.PI, TAU = PI * 2;
const RIVER_X = -56, RIVER_HALF = 8;
const STONE = '#ecdcc0', PAVE = '#dcc8a6', ROAD = '#948c7b', LAWN = '#90aa6b';
// Straight stone streets make traffic and bridge crossings legible from above.
const STREETS = [
  [[-24, -86], [94, -86]], [[94, -86], [94, 86]], [[94, 86], [-110, 86]], [[-24, 86], [-24, -86]],
  [[-110, -34], [110, -34]], [[-24, 34], [110, 34]], [[38, -86], [38, 86]],
  [[-110, -86], [-86, -86]], [[-86, -86], [-86, 86]], [[-110, 86], [-110, -86]],
];
// Ping-pong routes need paved turning bulbs for the full length of the tour buses.
const TURNAROUNDS = [[-110, -34], [110, -34], [-110, 86], [94, 86], [-24, 34], [110, 34], [38, -86], [38, 86]];
const ROAD_JOINTS = [...new Map(STREETS.flatMap(s => s).map(p => [p.join(','), p])).values()];
const LANDMARKS = [
  ['colosseum', 66, 61, 0], ['pantheon', 6, -60, 0], ['treviFountain', 66, -60, 0],
  ['romanTemple', 6, 62, 0], ['triumphalArch', 65, 3, 0],
];
const SW = 7; // sidewalk half-width: building fronts sit on this line
const KEEP = [ // landmark piazzas kept free of buildings: [x0, x1, z0, z1]
  [-7, 19, -71, -37], [52, 80, -69, -37], [48, 84, 44, 78], [-9, 21, 51, 69], [56, 76, -16, 17], [-104, -92, -28, 40],
  [-44, -30, -22, 30], [-80, -68, -22, 30], [-17, 31, -16.5, 16.5], [-69, -43, -130, 130],
];
const SPEC = { // footprint w, d, storeys, facing preference
  aptOchre: [9, 10, 5], aptTerra: [9, 10, 4], aptBurnt: [12, 10, 4], aptCream: [12, 10, 5], aptRose: [12, 10.5, 6],
  aptSienna: [15.5, 10.5, 5], aptYellow: [15.5, 10.5, 4], aptSlim: [6.5, 9, 4], aptSlimTall: [6.5, 9, 5], aptSquare: [8, 8, 4], aptTall: [13, 10, 6], palazzoCream: [19, 11, 4], palazzoOchre: [19, 11, 5], palazzoCourt: [22, 18, 4],
};
const BNAMES = Object.keys(SPEC);

export default {
  id: 'rome', name: 'Rome', description: 'Pizza, piazzas and the Colosseum. Take a delicious trip through the Eternal City!',
  cardColor: '#df9c71', emoji: '🏛️', size: 120,
  groundColor: '#d6bd94', groundStyle: 'concrete', skyColor: '#82b9dc', fogColor: '#f4dfbe',
  lightColor: '#fff0d0', ambient: 0.64,
  lighting: {
    sunDirection: [40, 60, 25], sunColor: '#fff0d0', sunIntensity: 0.72 * Math.PI,
    hemiSkyColor: '#c5e2f7', hemiGroundColor: '#907a62', hemiIntensity: 0.61 * Math.PI,
    shadowOpacity: 0.78, shadowRadius: 3.2, environmentIntensity: 0.24, exposure: 1.04,
  },
  postProcessing: { aoRadius: 0.45, aoStrength: 0.16 },
  sky: { top: '#6eaed5', horizon: '#f4dfbe' }, clouds: true,
  backdrop: [{ type: 'city', color: '#dba47f', color2: '#c8b28b' }, { type: 'hills', side: 'north', color: '#91a776', color2: '#b6ba89' }],
  edge: 'curb', buildProtos, routes: null,

  decorate(ctx) {
    const { rect, circle, merge, addRoute } = ctx;
    let decalOrder = 0;
    const addDecal = (...args) => {
      const mesh = ctx.addDecal(...args);
      // Keep overlapping road joints and paving in draw order at distant zooms.
      // Depth testing still hides them behind objects; hole masking is preserved.
      mesh.renderOrder = ++decalOrder * 0.01;
      mesh.material.depthWrite = false;
      return mesh;
    };
    const stroke = ([a, b], width) => rect((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.6, width, -Math.atan2(b[1] - a[1], b[0] - a[0]));
    // Routes exist before any objects, including the two Tiber crossings.
    this.routes = {
      east: addRoute([[-24, -86], [94, -86], [94, 86], [-24, 86]], { loop: true, width: 8 }),
      west: addRoute([[-110, -86], [-86, -86], [-86, 86], [-110, 86]], { loop: true, width: 7 }),
      bridgeNorth: addRoute([[-110, -34], [110, -34]], { loop: false, width: 8 }),
      bridgeSouth: addRoute([[-110, 86], [94, 86]], { loop: false, width: 8 }),
      forum: addRoute([[-24, 34], [110, 34]], { loop: false, width: 8 }),
      corso: addRoute([[38, -86], [38, 86]], { loop: false, width: 8 }),
    };
    addDecal(rect(RIVER_X, 0, 16, 240), '#67b5bf', { style: 'water' });
    const ripples = [];
    for (let z = -114; z <= 114; z += 11) ripples.push(rect(RIVER_X + Math.sin(z * 0.2) * 3, z, 3.2, 0.18, 0.15));
    addDecal(merge(ripples), '#a7d6cd', { style: 'water' });
    addDecal(merge([-1, 1].map(s => rect(RIVER_X + s * 10.3, 0, 4.6, 240))), STONE, { style: 'concrete' });
    // Riverside garden pockets and a warm archeological lawn around the Forum.
    addDecal(merge([rect(-37, 4, 14, 52), rect(-74, 4, 12, 52), rect(6, 60, 30, 18)]), LAWN, { style: 'grass' });
    addDecal(merge([rect(7, 0, 48, 33), rect(6, -54, 26, 34), rect(66, -55, 28, 36), rect(66, 61, 36, 34), rect(66, 0, 26, 34), rect(-98, 6, 12, 66)]), STONE, { style: 'concrete' });
    addDecal(rect(6, 60, 26, 14), '#e5cfab', { style: 'sand' });
    // Piazza mosaic: spokes and concentric bands leave the spawn centre clear.
    addDecal(circle(0, 0, 15.2, 40), PAVE, { style: 'concrete' });
    addDecal(circle(0, 0, 13.6, 40), STONE, { style: 'concrete' });
    addDecal(circle(0, 0, 5, 32), '#ead1a9', { style: 'concrete' });
    const mosaic = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; mosaic.push(rect(Math.cos(a) * 9.4, Math.sin(a) * 9.4, 8, 0.16, -a)); }
    addDecal(merge(mosaic), '#c4a780');
    // Sidewalks, roads and a few little crosswalks.
    addDecal(merge([...STREETS.map(s => stroke(s, 14)), ...TURNAROUNDS.map(([x, z]) => circle(x, z, 8.6, 24))]), PAVE, { style: 'concrete' });
    addDecal(merge([...STREETS.map(s => stroke(s, 8)), ...ROAD_JOINTS.map(([x, z]) => circle(x, z, 4.1, 24)), ...TURNAROUNDS.map(([x, z]) => circle(x, z, 6.2, 24))]), ROAD, { style: 'asphalt' });
    const dashes = [], crossings = [];
    for (const [a, b] of STREETS) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
      for (let t = 8; t < length - 4; t += 10) dashes.push(rect(a[0] + dx * t, a[1] + dz * t, 2.6, 0.16, -Math.atan2(dz, dx)));
    }
    for (const [x, z] of [[-24, -34], [38, -34], [94, -34], [-24, 34], [38, 34], [94, 34]]) {
      for (let i = -3; i <= 3; i++) crossings.push(rect(x + i, z + 6, 0.55, 2.2), rect(x + 6, z + i, 2.2, 0.55));
    }
    addDecal(merge(dashes), '#e9d8b7'); addDecal(merge(crossings), '#fff0d4');
    // Stone bridge decks cover the river; swallowable rail segments stand beside the traffic corridors.
    for (const z of [-34, 86]) {
      addDecal(rect(RIVER_X, z, 29, 18), '#e7d1a9', { style: 'concrete' });
      addDecal(rect(RIVER_X, z, 29, 8), '#b5a387', { style: 'concrete' });
      addDecal(merge([rect(RIVER_X, z - 5.1, 29, 0.2), rect(RIVER_X, z + 5.1, 29, 0.2)]), '#c5ab80');
    }
    // Landmark forecourts and market rugs.
    addDecal(merge([circle(66, 61, 17, 40), rect(6, -47, 19, 8), rect(66, -44, 25, 5)]), '#d7bf99', { style: 'concrete' });
    const rugs = [];
    for (const [x, z] of [[-98, -17], [-98, 0], [-98, 18]]) rugs.push(rect(x, z, 8, 5));
    addDecal(merge(rugs), '#e3ac80');
  },

  populate(ctx) {
    const { protos, randRange, rand, pick } = ctx;
    let count = 0;
    const circles = [], rects = [], bld = [];
    const NB = n => /Sienna|Yellow|palazzoCream|palazzoOchre/.test(n) ? 5 : n === 'palazzoCourt' ? 7 : 3;
    const footprint = (p, scale) => { const bb = p.geometry.boundingBox; return Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * scale / 2; };
    const hitRect = (R, x0, x1, z0, z1, m = 0) => x1 > R[0] - m && x0 < R[1] + m && z1 > R[2] - m && z0 < R[3] + m;
    // Small props: kept out of the river, turnaround bulbs, building footprints and each other.
    const put = (name, x, z, rot, scale = 1, opts = {}) => {
      const p = protos[name], r = p.radius * scale, fp = footprint(p, scale);
      const movement = 'move' in opts ? opts.move : p.move, rr = Math.min(r, fp);
      if (!opts.bridge && Math.abs(x - RIVER_X) < RIVER_HALF + fp + (movement?.range ?? 0)) return false;
      if (!movement && TURNAROUNDS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 6.2 + fp)) return false;
      if (rects.some(R => hitRect(R, x - rr, x + rr, z - rr, z + rr, 0.1))) return false;
      if (!movement && !opts.over && circles.some(o => Math.hypot(o.x - x, o.z - z) < (o.r + r) * 0.85)) return false;
      const { bridge, over, ...rest } = opts;
      if (!ctx.place(name, x, z, rot, scale, { overlap: 0.02, ...rest })) return false;
      count++;
      if (!movement) circles.push({ x, z, r });
      return true;
    };
    const stat = (name, x, z, rot = 0, opts) => put(name, x, z, rot, 1, { move: null, ...opts });
    // The big silhouettes first.
    for (const [name, x, z, rot] of LANDMARKS) { if (put(name, x, z, rot, 1, { bridge: true, move: null })) circles[circles.length - 1].r *= 0.9; }
    put('fountain', 65, -12, 0); put('fountain', -10, 4, 0); put('fountain', -98, 6, 0); put('obelisk', 14, -3, 0);

    // ---- Buildings: rows along the street fronts, 4-6 storeys, shopfronts at street level. ----
    const bandHit = (x0, x1, z0, z1) => STREETS.some(([a, b]) => hitRect([Math.min(a[0], b[0]) - SW + 0.1, Math.max(a[0], b[0]) + SW - 0.1, Math.min(a[1], b[1]) - SW + 0.1, Math.max(a[1], b[1]) + SW - 0.1], x0, x1, z0, z1))
      || TURNAROUNDS.some(([tx, tz]) => hitRect([tx - 8.5, tx + 8.5, tz - 8.5, tz + 8.5], x0, x1, z0, z1));
    let innerFill = false; // block-interior pass: dense back rows without street-front dressing
    const tryBuilding = (name, axis, front, dir, c) => {
      const [w, d] = SPEC[name];
      let x0, x1, z0, z1, cx, cz, rot, fx = 0, fz = 0;
      if (axis === 'x') { cx = c; cz = front - dir * d / 2; x0 = cx - w / 2; x1 = cx + w / 2; z0 = cz - d / 2; z1 = cz + d / 2; rot = dir > 0 ? 0 : PI; fz = dir; }
      else { cz = c; cx = front - dir * d / 2; z0 = cz - w / 2; z1 = cz + w / 2; x0 = cx - d / 2; x1 = cx + d / 2; rot = dir > 0 ? PI / 2 : -PI / 2; fx = dir; }
      if (KEEP.some(K => hitRect(K, x0, x1, z0, z1)) || rects.some(R => hitRect(R, x0, x1, z0, z1, 0.25)) || bandHit(x0, x1, z0, z1)) return false;
      if (!ctx.place(name, cx, cz, rot, 1, { overlap: 0.02, move: null })) return false;
      count++; rects.push([x0, x1, z0, z1]);
      if (!innerFill) bld.push({ name, cx, cz, fx, fz, tx: fz === 0 ? 0 : 1, tz: fz === 0 ? 1 : 0, w, d, nb: NB(name) });
      return true;
    };
    const row = (axis, front, dir, from, to) => {
      let cur = from, prev = '';
      const lowOnly = axis === 'x' && dir < 0; // buildings south of an east-west street stay lower for the camera
      while (cur < to - 8) {
        const cand = BNAMES.filter(n => n !== prev && (!lowOnly || SPEC[n][2] <= 4)).sort(() => rand() - 0.5);
        let ok = false;
        for (const n of cand) {
          if (cur + SPEC[n][0] > to + 1) continue;
          if (n === 'palazzoCourt' && rand() < 0.5) continue;
          if (innerFill && rand() < 0.2) continue; // leave the odd courtyard open
          if (tryBuilding(n, axis, front, dir, cur + SPEC[n][0] / 2)) { cur += SPEC[n][0] + 0.2; prev = n; ok = true; break; }
        }
        if (!ok) cur += 2;
      }
    };
    const F = SW, ZN = -86, ZS = 86;
    // inside blocks (x: -24..38 | 38..94; z: -86..-34 | -34..34 | 34..86)
    for (const [x0, x1] of [[-24, 38], [38, 94]]) for (const [z0, z1] of [[-86, -34], [-34, 34], [34, 86]]) {
      row('x', z0 + F, -1, x0 + F, x1 - F);            // south of the north street, faces -Z
      row('x', z1 - F, 1, x0 + F, x1 - F);             // north of the south street, faces +Z
      row('z', x0 + F, -1, z0 + F, z1 - F);            // east of the west street, faces -X
      row('z', x1 - F, 1, z0 + F, z1 - F);             // west of the east street, faces +X
    }
    row('z', -86 + F, -1, -86 + F, 86 - F);            // west block (market side stays open via KEEP)
    row('z', -86 - F, 1, -86 + F, 86 - F);
    row('z', -24 - F, 1, -86 + F, 86 - F);             // river-block east row facing +X
    row('z', -86 + F, -1, -86 + F, 86 - F);
    row('x', ZN - F, 1, -117, 117);                    // outer north strip
    row('x', ZS + F, -1, -117, 117);                   // outer south strip
    row('z', 94 + F, -1, -86 + F, 86 - F);             // outer east strip
    // Block interiors: further rows behind the street frontages (back to back, fronts onto the courtyards).
    innerFill = true;
    for (const [x0, x1] of [[-24, 38], [38, 94]]) for (const [z0, z1] of [[-86, -34], [-34, 34], [34, 86]]) {
      for (const off of [11, 22]) {
        row('x', z0 + F + off, -1, x0 + F, x1 - F);
        row('x', z1 - F - off, 1, x0 + F, x1 - F);
        row('z', x0 + F + off, -1, z0 + F, z1 - F);
        row('z', x1 - F - off, 1, z0 + F, z1 - F);
      }
    }
    // Gap pass: slot palazzi into whatever pockets are still open (random facing), biggest first.
    const BY_AREA = [...BNAMES].sort((a, b) => SPEC[b][0] * SPEC[b][1] - SPEC[a][0] * SPEC[a][1]);
    for (let gz = -79; gz <= 79; gz += 2) for (let gx = -103; gx <= 87; gx += 2) {
      for (const n of BY_AREA) {
        if (n === 'palazzoCourt') continue;
        const [w, d] = SPEC[n], rot = pick([0, PI / 2, PI, -PI / 2]), sw = rot === 0 || rot === PI;
        const hw = (sw ? w : d) / 2, hd = (sw ? d : w) / 2, x0 = gx - hw, x1 = gx + hw, z0 = gz - hd, z1 = gz + hd;
        if (KEEP.some(K => hitRect(K, x0, x1, z0, z1)) || rects.some(R => hitRect(R, x0, x1, z0, z1, 0.25)) || bandHit(x0, x1, z0, z1)) continue;
        if (ctx.place(n, gx, gz, rot, 1, { overlap: 0.02, move: null })) { count++; rects.push([x0, x1, z0, z1]); break; }
      }
    }
    innerFill = false;
    // ---- Landmark dressing ----
    for (const [x, z] of [[-5, 55], [17, 55], [-5, 66], [17, 66]]) put('ruinColumn', x, z, 0);
    for (const [x, z] of [[-7, 60], [19, 60], [6, 53], [4, 68]]) put('columnFragment', x, z);
    for (const [x, z] of [[-14, 13], [28, -13], [28, 13], [60, 12], [71, -8]]) put('statue', x, z, 0);
    const line = (name, x0, z0, x1, z1, step, rot, scale = 1, opts) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
      for (let i = 0; i <= n; i++) put(name, x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, rot ?? -Math.atan2(z1 - z0, x1 - x0), scale, opts);
    };
    // Bridge furniture
    for (const z of [-34, 86]) {
      for (const side of [-1, 1]) for (let x = -67; x <= -45; x += 3.4) put('bridgeRail', x, z + side * 7.8, 0, 1, { bridge: true });
      for (const x of [-72, -40]) for (const side of [-1, 1]) put('bridgeAngel', x, z + side * 8.8, 0);
    }
    // Piazza della Rotonda: chain bollards, cafe clusters, cypress pairs.
    line('bollard', -6, -39.5, 18, -39.5, 2.4, 0);
    for (const z of [-46, -52, -58]) { put('cypress', -5.5, z, 0); put('cypress', 17.5, z, 0); }
    // Trevi: railing in front of the basin, benches, cafes.
    line('ironFence', 55, -45.5, 77, -45.5, 1.9, 0);
    put('bench', 54, -41, 0); put('bench', 78, -41, 0); put('nasone', 58, -42, 0); put('nasone', 74, -42, 0);
    for (const x of [58, 74]) put('lamp', x, -39, 0);
    // Colosseum forecourt: bollards and cypress, benches facing the arena.
    line('bollard', 52, 42.5, 80, 42.5, 2.6, 0);
    for (const [x, z] of [[49, 45], [83, 45], [49, 78], [83, 78]]) put('umbrellaPineSmall', x, z, 0);
    put('bench', 57, 44.5, 0); put('bench', 75, 44.5, 0);
    // Forum: iron railings north/south, cypress along the sides.
    line('ironFence', -8, 50.5, 20, 50.5, 1.9, 0); line('ironFence', -8, 69.5, 20, 69.5, 1.9, 0);
    for (const z of [53, 58, 63, 67]) { put('cypress', -8.5, z, 0); put('cypress', 20.5, z, 0); }
    for (const [x, z] of [[-1, 54], [13, 54], [-1, 67], [13, 67]]) put('umbrellaPineSmall', x, z, 0);
    // Arch piazza: pine rows, benches.
    for (let z = -12; z <= 14; z += 5) { put('cypress', 57.5, z, 0); put('cypress', 72.5, z, 0); }
    put('umbrellaPineSmall', 76, -13, 0); put('umbrellaPineSmall', 76, 13, 0); put('umbrellaPineSmall', 55, 14, 0);
    for (const [x, z, r] of [[65, -6, 0], [58, 3, PI / 2], [72, 3, -PI / 2]]) put('bench', x, z, r);
    // River gardens: hedge borders, benches, cypress and pines, railing along both banks.
    for (const [gx0, gx1] of [[-44, -30], [-80, -68]]) {
      line('hedge', gx0 + 0.9, -21, gx1 - 0.9, -21, 1.9, 0); line('hedge', gx0 + 0.9, 29, gx1 - 0.9, 29, 1.9, 0);
      const cx = (gx0 + gx1) / 2;
      for (let z = -15; z <= 24; z += 6.5) { put('cypress', cx, z, 0); }
      for (const z of [-9, 3, 15]) { put('bench', cx - 3.6, z, PI / 2); put('bench', cx + 3.6, z, -PI / 2); }
      for (const z of [-2, 10, 22]) put('umbrellaPineSmall', cx, z + 3, 0);
    }
    line('ironFence', -65.2, -22, -65.2, 30, 1.9, PI / 2); line('ironFence', -46.8, -22, -46.8, 30, 1.9, PI / 2);
    // West market square.
    for (const z of [-18, -3, 14]) { stat('marketStall', -98, z, 0); put('fruitCrate', -94.5, z + 1.3, 0); put('breadBasket', -101.8, z + 1.5, 0); put('fruitCrate', -94.5, z - 1.3, 0.5); put('amphora', -101.6, z - 1.4); }
    put('bench', -94, 24, 0); put('bench', -94, -26, 0); put('bench', -102, 24, 0);
    // ---- Central piazza (spawn): designed beds, benches, bollards, cafes, lamps. ----
    const bed = (cx, cz, w, d) => {
      line('hedge', cx - w / 2, cz - d / 2, cx + w / 2, cz - d / 2, 1.9, 0); line('hedge', cx - w / 2, cz + d / 2, cx + w / 2, cz + d / 2, 1.9, 0);
      line('hedge', cx - w / 2, cz - d / 2 + 1.9, cx - w / 2, cz + d / 2 - 1.9, 1.9, PI / 2); line('hedge', cx + w / 2, cz - d / 2 + 1.9, cx + w / 2, cz + d / 2 - 1.9, 1.9, PI / 2);
      put('planterBox', cx - w / 4, cz, 0); put('planterBox', cx + w / 4, cz, 0); put('topiary', cx, cz - 0.6, 0); put('topiary', cx, cz + 0.6, 0);
    };
    bed(-10, -10, 11, 4); bed(-10, 10, 11, 4); bed(22, -10, 11, 4); bed(22, 10, 11, 4);
    line('bollard', -15.5, -15.6, 29.5, -15.6, 2.3, 0); line('bollard', -15.5, 15.6, 29.5, 15.6, 2.3, 0);
    for (const x of [-12, 4, 20, 28]) { put('bench', x, -14, 0); put('bench', x, 14, PI); }
    put('bench', -15, -3, PI / 2); put('bench', -15, 4, PI / 2); put('bench', 29.5, 1, -PI / 2);
    for (const [x, z] of [[-16, -14], [30, -14], [-16, 14], [30, 14], [7, -14], [7, 14], [-16, 0], [30, 0]]) put('lamp', x, z, 0);
    const cluster = (x, z, umbrella = true) => {
      put('cafeTable', x, z, 0);
      if (umbrella) put('cafeUmbrella', x, z, 0, 1, { over: true });
      for (const [dx, dz] of [[1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) put('chair', x + dx, z + dz, Math.atan2(-dx, -dz));
    };
    for (const [x, z] of [[19, 0], [24, 2], [22, -3], [-8, 0], [-12, 3]]) cluster(x, z);
    cluster(4, -41); cluster(12, -43); cluster(58, -40); cluster(74, -40); cluster(-3, -43);
    put('gelatoCart', -12, -6, 0); put('gelatoCart', 27, 4, PI); put('gelatoCart', 62, -41, 0);
    put('nasone', -14, 7, 0); put('nasone', 28, -9, 0); put('nasone', 3, -37.5, 0);
    // ---- Street furniture along every street. ----
    STREETS.forEach(([a, b], si) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len, nx = -tz, nz = tx;
      const rotAlong = -Math.atan2(tz, tx), at = (s, o) => [a[0] + tx * s + nx * o, a[1] + tz * s + nz * o];
      for (let s = 9, k = 0; s < len - 8; s += 19, k++) { const [x, z] = at(s, (k % 2 ? 1 : -1) * 4.7); put('lamp', x, z, 0); }
      for (let s = 16, k = 0; s < len - 8; s += 38, k++) { const [x, z] = at(s, (k % 2 ? -1 : 1) * 5); put('trashCan', x, z, 0); }
      for (let s = 30, k = 0; s < len - 8; s += 57, k++) { const [x, z] = at(s, (k % 2 ? 1 : -1) * 4.9); put('nasone', x, z, 0); }
      for (let s = 20, k = 0; s < len - 8; s += 44, k++) {
        const side = k % 2 ? 1 : -1, name = ['scooter', 'scooterRed', 'scooterCream', 'scooterBlue', 'scooterYellow'];
        for (let m = 0; m < 2 + (k % 2); m++) { const [x, z] = at(s + m * 1.8, side * 4.6); put(pick(name), x, z, rotAlong + (rand() < 0.5 ? 0 : PI), 1, { move: null, tight: true }); }
      }
    });
    // ---- Building fronts: flower pots at the doors, trattoria tables, shop goods. ----
    bld.forEach((B, i) => {
      const at = (f, t) => [B.cx + B.fx * (B.d / 2 + f) + B.tx * t, B.cz + B.fz * (B.d / 2 + f) + B.tz * t];
      const face = (dx, dz) => Math.atan2(dx, dz);
      if (rand() < 0.8) for (const s of [-1, 1]) { const [x, z] = at(0.7, s * 1.7); put(rand() < 0.5 ? 'flowerPot' : 'topiary', x, z, 0); }
      const bw = B.w / B.nb, mid = (B.nb - 1) / 2, off = (rand() < 0.5 ? -1 : 1) * mid * bw;
      if (rand() < 0.55) {
        const [x, z] = at(1.5, off);
        put('cafeTable', x, z, 0);
        for (const s of [-1, 1]) put('chair', x + B.tx * s * 1.25, z + B.tz * s * 1.25, face(-B.tx * s, -B.tz * s));
        if (rand() < 0.6) { const [mx, mz] = at(0.9, off + (off > 0 ? -1.7 : 1.7)); put('menuBoard', mx, mz, face(B.fx, B.fz)); }
      } else if (rand() < 0.45) {
        const [x, z] = at(1.0, off); put(rand() < 0.5 ? 'fruitCrate' : 'breadBasket', x, z, face(B.fx, B.fz));
      }
    });
    // ---- Pedestrians, pigeons, trees. ----
    const spots = [[7, 0, 48, 30], [6, -52, 22, 25], [66, -52, 26, 20], [66, 0, 22, 28], [66, 61, 34, 30], [-98, 6, 8, 50], [-37, 4, 10, 48], [-74, 4, 8, 48]];
    const inSpot = ([cx, cz, hw, hd]) => [cx + randRange(-hw, hw), cz + randRange(-hd, hd)];
    for (let i = 0; i < 70; i++) { const [x, z] = inSpot(pick(spots)); put(pick(['tourist', 'local']), x, z, undefined, 1, { move: { type: 'walk', speed: 1.2, range: 2.5 } }); }
    for (let i = 0; i < 26; i++) { const [x, z] = inSpot(pick(spots)); put('pigeon', x, z); }
    for (let i = 0; i < 40; i++) { const [x, z] = inSpot(pick(spots)); put(pick(['cypress', 'umbrellaPineSmall']), x, z, 0, randRange(0.85, 1.05)); }
    // Route vehicles always face their direction of travel. Both bridge routes cross on their stone decks.
    for (const route of Object.values(this.routes)) {
      // The west loop and the north bridge share the crowded riverside roads (x -87.6 / -108): 3 fewer vehicles there.
      const lean = route === this.routes.west ? 1 : 0;
      count += ctx.placeOnRoute('scooter', route, { count: 4 - lean, speed: 6.8, offset: 1.8, speedJitter: 0.18 });
      count += ctx.placeOnRoute('scooterRed', route, { count: 3 - lean, speed: 6.3, offset: -1.8, speedJitter: 0.18 });
      count += ctx.placeOnRoute('car', route, { count: 3 - lean, speed: 6, offset: 1.6, speedJitter: 0.12 });
      count += ctx.placeOnRoute('carOchre', route, { count: 2, speed: 5.8, offset: -1.6, speedJitter: 0.12 });
    }
    for (const route of [this.routes.east, this.routes.bridgeNorth, this.routes.bridgeSouth]) count += ctx.placeOnRoute('tourBus', route, { count: 2, speed: 4.6, offset: 1.7, speedJitter: 0.08 });
    this.objectCount = count;
  },
};
