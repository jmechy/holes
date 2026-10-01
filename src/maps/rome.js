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
  ['romanTemple', 6, 62, 0], ['triumphalArch', 65, 3, 0], ['obelisk', 6, 24, 0],
];
const PLAZAS = [[0, 0, 42, 45], [6, -60, 49, 38], [66, -60, 47, 38], [66, 61, 48, 43], [6, 62, 48, 43], [-99, 5, 28, 54]];

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
    addDecal(merge([rect(-38, 4, 12, 49), rect(-73, 4, 10, 49), rect(6, 62, 45, 40)]), LAWN, { style: 'grass' });
    addDecal(merge(PLAZAS.map(([x, z, w, d]) => rect(x, z, w, d))), STONE, { style: 'concrete' });
    addDecal(merge([rect(6, 62, 39, 33), rect(-99, 5, 22, 45)]), '#e5cfab', { style: 'sand' });
    // Piazza mosaic: spokes and concentric bands leave the spawn centre clear.
    addDecal(circle(0, 0, 17.8, 40), PAVE, { style: 'concrete' });
    addDecal(circle(0, 0, 15.8, 40), STONE, { style: 'concrete' });
    addDecal(circle(0, 0, 5, 32), '#ead1a9', { style: 'concrete' });
    const mosaic = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; mosaic.push(rect(Math.cos(a) * 10.4, Math.sin(a) * 10.4, 10, 0.16, -a)); }
    addDecal(merge(mosaic), '#c4a780');
    // Sidewalks, roads and a few little crosswalks.
    addDecal(merge([...STREETS.map(s => stroke(s, 12)), ...TURNAROUNDS.map(([x, z]) => circle(x, z, 8.2, 24))]), PAVE, { style: 'concrete' });
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
    addDecal(merge([circle(66, 61, 17, 40), rect(6, -48, 19, 10), rect(66, -46, 25, 6), rect(6, 74, 23, 5)]), '#d7bf99', { style: 'concrete' });
    const rugs = [];
    for (const [x, z] of [[-99, -17], [-99, 0], [-99, 18], [64, -13], [79, -13]]) rugs.push(rect(x, z, 8, 5));
    addDecal(merge(rugs), '#e3ac80');
  },

  populate(ctx) {
    const { protos, randRange, rand, pick } = ctx;
    let count = 0;
    // All land footprints stay completely outside the water. Walking ranges also respect its banks.
    const put = (name, x, z, rot, scale = 1, opts, bridge = false) => {
      const p = protos[name], r = p.radius * scale;
      const movement = opts && 'move' in opts ? opts.move : p.move;
      const bb = p.geometry.boundingBox;
      // max-side engine radii do not cover a box's corners after a random yaw.
      const footprint = Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * scale / 2;
      if (!bridge && Math.abs(x - RIVER_X) < RIVER_HALF + footprint + (movement?.range ?? 0)) return false;
      if (!movement && TURNAROUNDS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 6.2 + footprint)) return false;
      const ok = ctx.place(name, x, z, rot, scale, opts);
      if (ok) count++;
      return ok;
    };
    const scatter = (names, target, bounds, lo = 1, hi = 1, options) => {
      let placed = 0;
      for (let t = 0; t < target * 45 && placed < target; t++) {
        const n = Array.isArray(names) ? pick(names) : names;
        if (put(n, randRange(bounds[0], bounds[1]), randRange(bounds[2], bounds[3]), undefined, randRange(lo, hi), options)) placed++;
      }
      return placed;
    };
    // The big silhouettes get guaranteed space before filling their neighborhoods.
    for (const [name, x, z, rot] of LANDMARKS) put(name, x, z, rot);
    put('fountain', -99, 48, 0); put('fountain', 65, -12, 0); put('fountain', 15, 6, 0);
    // Two tiny palazzo lanes west of the Tiber and varied residential blocks around the historic centre.
    const homes = ['palazzoCream', 'palazzoPeach', 'palazzoOchre', 'palazzoPink'];
    for (const [x, z] of [[-99, -68], [-99, -49], [-99, 68], [-38, -104], [-15, -104], [7, -104], [29, -104], [53, -104], [77, -104], [105, -105],
      [109, -66], [109, -47], [109, -13], [109, 9], [109, 59], [-8, -17], [13, -17], [24, -60], [48, -104], [51, -15], [82, -13],
      [51, 15], [81, 17], [7, 103], [28, 104], [52, 104], [77, 104], [106, 105], [-16, 104], [-38, 106], [-73, 106], [-99, 105]]) {
      put(pick(homes), x, z, z < -90 ? 0 : z > 90 ? PI : x > 100 ? PI / 2 : 0, randRange(0.8, 1.06));
    }
    // The Forum has broken columns, statues and scattered architectural fragments.
    for (const [x, z] of [[-10, 48], [21, 48], [-10, 75], [21, 75]]) put('ruinColumn', x, z, 0);
    for (const [x, z] of [[-9, 62], [20, 61], [8, 47], [4, 77]]) put('columnFragment', x, z);
    put('statue', 24, 24, 0); put('statue', 48, 48, 0); put('statue', 84, 76, 0);
    // Bridge furniture uses its own allow-water flag, while remaining outside the road's reserved width.
    for (const z of [-34, 86]) {
      for (const side of [-1, 1]) for (let x = -67; x <= -45; x += 3.4) put('bridgeRail', x, z + side * 7.8, 0, 1, undefined, true);
      for (const x of [-72, -40]) for (const side of [-1, 1]) put('bridgeAngel', x, z + side * 8.8, 0);
    }
    for (const [x, z] of [[-99, -18], [-99, -3], [-99, 14], [79, -14]]) put('marketStall', x, z, 0);
    put('gelatoCart', -12, 18, 0); put('gelatoCart', 22, -47, 0); put('gelatoCart', 82, 44, PI);
    // Pine avenues hug the banks and the southern ruins; small trees bridge the growth gap.
    for (const x of [-72, -40]) for (let z = -108; z < 112; z += 18) put('umbrellaPineSmall', x, z, 0, 0.88);
    scatter('umbrellaPine', 42, [-112, 112, -112, 112], 0.84, 1.12);
    scatter('umbrellaPineSmall', 36, [-112, 112, -112, 112], 0.8, 1.05);
    scatter('cypress', 34, [-112, 112, -112, 112], 0.85, 1.05);
    // A ring of starter treats begins just beyond the five-unit spawn exclusion.
    const starters = ['pizza', 'gelato', 'espresso', 'amphora', 'coin', 'flowerPot', 'breadBasket'];
    for (const [radius, n] of [[6.3, 18], [9, 24], [12, 30], [17, 36]]) for (let i = 0; i < n; i++) {
      const a = i / n * TAU + 0.1;
      put(starters[i % starters.length], Math.cos(a) * radius, Math.sin(a) * radius, -a, 0.9);
    }
    scatter(['chair', 'cafeTable', 'menuBoard', 'flowerPot'], 34, [-19, 26, -25, 26], 0.9, 1);
    // Neighborhood texture progresses from tables, scooters and statues to tall trees and buildings.
    scatter(['bench', 'cafeUmbrella', 'gelatoCart', 'drinkingFountain', 'ruinColumn'], 65, [-113, 113, -113, 113], 0.9, 1.05);
    scatter(['lamp', 'trashCan', 'fruitCrate', 'cafeTable', 'chair', 'menuBoard', 'columnFragment'], 150, [-114, 114, -114, 114], 0.85, 1.1);
    scatter(['tourist', 'local'], 65, [-112, 112, -112, 112], 0.9, 1.05);
    scatter('pigeon', 45, [-112, 112, -112, 112], 0.9, 1.1);
    scatter(['scooter', 'scooterRed'], 30, [-112, 112, -112, 112], 0.85, 1, { move: null });
    // Small souvenirs and food fill the usable land until the actual placement count reaches the target.
    scatter(starters, Math.max(0, 880 - count), [-114, 114, -114, 114], 0.85, 1.1);
    // Route vehicles always face their direction of travel. Both bridge routes cross on their stone decks.
    for (const route of Object.values(this.routes)) {
      count += ctx.placeOnRoute('scooter', route, { count: 5, speed: 6.8, offset: 1.8, speedJitter: 0.18 });
      count += ctx.placeOnRoute('scooterRed', route, { count: 3, speed: 6.3, offset: -1.8, speedJitter: 0.18 });
      count += ctx.placeOnRoute('car', route, { count: 3, speed: 6, offset: 1.6, speedJitter: 0.12 });
      count += ctx.placeOnRoute('carOchre', route, { count: 2, speed: 5.8, offset: -1.6, speedJitter: 0.12 });
    }
    for (const route of [this.routes.east, this.routes.bridgeNorth, this.routes.bridgeSouth]) count += ctx.placeOnRoute('tourBus', route, { count: 2, speed: 4.6, offset: 1.7, speedJitter: 0.08 });
    this.objectCount = count;
  },
};
