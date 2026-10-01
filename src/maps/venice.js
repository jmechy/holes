import { buildProtos } from '../objects/venice.js';

const PI = Math.PI;
const WATER = '#49bdbb';
const CREAM = '#f4e8cb';
// A broad S through the city, with smaller winding rii branching between islands.
// Water is a ground decal: holes can cross every canal freely.
const CANALS = [
  { name: 'grand', width: 18, points: [[-110, 78], [-86, 62], [-66, 35], [-55, 9], [-51, -21], [-30, -42], [1, -52], [36, -45], [62, -18], [73, 14], [90, 33], [110, 39]], traffic: true },
  { name: 'cannaregio', width: 10, points: [[-55, -10], [-83, -12], [-92, -48], [-110, -61]], traffic: true },
  { name: 'sanMarco', width: 11, points: [[68, 0], [44, 6], [37, 29], [12, 39], [-10, 59], [-22, 92], [-21, 110]], traffic: true },
  // No traffic here; Rialto's stone arcade can sit across this canal without blocking a route.
  { name: 'rialto', width: 10, points: [[-35, -39], [-17, -17], [-19, 10], [-43, 18]], traffic: false },
  { name: 'dorsoduro', width: 8, points: [[-78, 52], [-105, 27], [-110, -7]], traffic: false },
];

const segmentDistance = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
const onLand = (x, z, radius, margin = 0.4) => CANALS.every(c => c.points.every((p, i) => i === 0 || segmentDistance(x, z, c.points[i - 1], p) >= c.width / 2 + radius + margin));

export default {
  id: 'venice',
  name: 'Venice',
  description: 'Glide over turquoise canals, scoop up carnival masks and feast on the floating city!',
  cardColor: '#55c3be',
  emoji: '🛶',
  size: 120,
  groundColor: '#e7d6b7',
  groundStyle: 'concrete',
  skyColor: '#8bd2ee',
  fogColor: '#d6ede9',
  lightColor: '#fff0d6',
  ambient: 0.66,
  lighting: {
    sunDirection: [40, 60, 25], sunColor: '#fff0d6', sunIntensity: 0.72 * Math.PI,
    hemiSkyColor: '#c5e5f8', hemiGroundColor: '#83b8b3', hemiIntensity: 0.63 * Math.PI,
    shadowOpacity: 0.76, shadowRadius: 3.2, environmentIntensity: 0.23, exposure: 1.04,
  },
  postProcessing: { aoRadius: 0.45, aoStrength: 0.14 },
  water: { roughness: 0.23, metalness: 0.06, normalStrength: 1.7, waveScale: 1.15, contrast: 0.82, wakes: true, wakeHeight: 0.10 },
  sky: { top: '#7fc9eb', horizon: '#d6ede9' },
  clouds: true,
  backdrop: [
    { type: 'city', color: '#e7b7a3', color2: '#eee0c5' },
    { type: 'ocean', side: 'south', color: '#55babc', color2: '#ebd8b6' },
    { type: 'ocean', side: 'east', color: '#55babc', color2: '#ebd8b6' },
  ],
  edge: 'none',
  buildProtos,
  routes: null,

  decorate(ctx) {
    const { rect, circle, merge, addRoute } = ctx;
    let decalOrder = 0;
    const addDecal = (...args) => {
      const mesh = ctx.addDecal(...args);
      // The merged canal strips overlap at their bends. Draw map layers in order
      // without writing depth so bank triangles cannot punch through the water
      // when the camera is far away. Keep depth testing and the hole shader intact.
      // Stay before the hole outlines (renderOrder 1 and 2).
      mesh.renderOrder = ++decalOrder * 0.01;
      mesh.material.depthWrite = false;
      return mesh;
    };
    this.routes = {};
    const pieces = (canal, extra = 0) => {
      const out = [], w = canal.width + extra;
      canal.points.forEach((p, i) => {
        out.push(circle(p[0], p[1], w / 2, 18));
        if (!i) return;
        const a = canal.points[i - 1], angle = Math.atan2(p[1] - a[1], p[0] - a[0]);
        out.push(rect((a[0] + p[0]) / 2, (a[1] + p[1]) / 2, Math.hypot(p[0] - a[0], p[1] - a[1]), w, -angle));
      });
      return out;
    };
    // Cream paving traces every quay, then the animated water covers the middle.
    addDecal(merge(CANALS.flatMap(c => pieces(c, 6))), CREAM, { style: 'concrete' });
    addDecal(merge(CANALS.flatMap(c => pieces(c))), WATER, { style: 'water' });
    for (const c of CANALS) if (c.traffic) this.routes[c.name] = addRoute(c.points, { loop: false, width: c.width, network: 'water' });

    // Spacious campi, connected by narrow paving lanes across the dry islands.
    const plazas = [[6, 0, 32, 24], [62, 72, 65, 56], [-58, -78, 41, 30], [88, -73, 36, 30], [-66, 91, 32, 27]];
    addDecal(merge(plazas.map(([x, z, w, d]) => rect(x, z, w, d))), CREAM, { style: 'concrete' });
    const trim = [], diamonds = [];
    for (const [x, z, w, d] of plazas) {
      trim.push(rect(x, z - d / 2 + 1.2, w - 2.4, 0.35), rect(x, z + d / 2 - 1.2, w - 2.4, 0.35), rect(x - w / 2 + 1.2, z, 0.35, d - 2.4), rect(x + w / 2 - 1.2, z, 0.35, d - 2.4));
      for (let dx = -w / 2 + 5; dx < w / 2 - 2; dx += 5) for (let dz = -d / 2 + 5; dz < d / 2 - 2; dz += 5) diamonds.push(rect(x + dx, z + dz, 0.55, 0.55, PI / 4));
    }
    addDecal(merge(trim), '#d6bb93');
    addDecal(merge(diamonds), '#d9c3a1');

    // Flat pedestrian crossings are purely decorative, so traffic stays unobstructed.
    const crossings = [[-63, 28, -0.4, 23], [13, -49.6, 1.37, 24], [49, -31.5, 0.77, 24], [24, 34.2, -1.19, 16], [-17, 79, -0.35, 14]];
    this.water.wakeExclusions = crossings.map(([x, z, angle, length]) => ({ x, z, angle, halfLength: length / 2, halfWidth: 1.65 }));
    const decks = [], steps = [];
    for (const [x, z, a, length] of crossings) {
      decks.push(rect(x, z, length, 3.1, a));
      for (let t = -length / 2 + 1; t < length / 2; t += 1) steps.push(rect(x + Math.cos(a) * t, z - Math.sin(a) * t, 0.08, 3.1, a));
    }
    addDecal(merge(decks), '#f8edda', { style: 'concrete' });
    addDecal(merge(steps), '#d2bca1');
    // Rialto's quiet branch has its own paving approaches and a little landing.
    addDecal(merge([rect(-31, -4, 8, 7), rect(-5, -4, 8, 7)]), CREAM, { style: 'concrete' });
  },

  populate(ctx) {
    const { protos, place, rand, randRange, pick, placeOnRoute } = ctx;
    const land = (name, x, z, rotation, scale = 1) => {
      const bb = protos[name].geometry.boundingBox;
      // The engine's radius uses the larger side. A corner can extend farther, so
      // use the full diagonal here to keep rotated buildings entirely out of water.
      const footprint = Math.hypot(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * scale / 2;
      return onLand(x, z, footprint) && place(name, x, z, rotation, scale, { move: null });
    };

    // Landmarks first. The bridge is the only structure deliberately spanning water.
    land('basilica', 70, 70, 0, 1);
    land('campanile', 45, 69, 0, 1);
    land('dogePalace', 93, 78, PI, 1);
    place('rialto', -18, -4, -0.074, 1);
    land('canalPalace', -74, -80, 0);
    land('canalPalace', 93, -74, 0);

    const houses = ['palazzoPink', 'palazzoYellow', 'palazzoBlue', 'palazzoPeach'];
    const variedHouse = (name, x, z) => (Math.abs(Math.floor(x / 12) + Math.floor(z / 12)) % 2 ? name + 'B' : name);
    // Waterfront facades face the canal; whole footprints stay behind the quays.
    for (const c of CANALS) for (let i = 1; i < c.points.length; i++) {
      const a = c.points[i - 1], b = c.points[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      const nx = -dz / len, nz = dx / len;
      for (let t = 7; t < len - 3; t += 12) for (const s of [-1, 1]) {
        const name = pick(houses), scale = randRange(0.9, 1.08), r = protos[name].radius * scale;
        const x = a[0] + dx * t / len + nx * s * (c.width / 2 + r + 3);
        const z = a[1] + dz * t / len + nz * s * (c.width / 2 + r + 3);
        // Leave the spawn campo and St Mark's square open for their small props.
        if (Math.hypot(x, z) < 29 || (x > 26 && x < 111 && z > 45 && z < 100)) continue;
        land(variedHouse(name, x, z), x, z, Math.atan2(-nx * s, -nz * s), scale);
      }
    }
    // The back streets fill out the compact city without consuming the central squares.
    for (let z = -104; z <= 104; z += 21) for (let x = -103; x <= 103; x += 21) {
      if (Math.hypot(x, z) < 32 || (x > 26 && z > 44 && z < 102) || rand() < 0.25) continue;
      land(variedHouse(pick(houses), x, z), x + randRange(-2, 2), z + randRange(-2, 2), pick([0, PI / 2, PI, -PI / 2]), randRange(0.82, 0.96));
    }

    // Striped mooring poles and lanterns sit safely on dry quay edges.
    for (const c of CANALS) for (let i = 1; i < c.points.length; i++) {
      const a = c.points[i - 1], b = c.points[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      for (let t = 3; t < len; t += 7) for (const s of [-1, 1]) {
        const off = c.width / 2 + 1.05;
        land('mooringPole', a[0] + dx * t / len - dz / len * off * s, a[1] + dz * t / len + dx / len * off * s, 0);
      }
      for (let t = 10; t < len; t += 19) for (const s of [-1, 1]) {
        const off = c.width / 2 + 2.2;
        land('lantern', a[0] + dx * t / len - dz / len * off * s, a[1] + dz * t / len + dx / len * off * s, 0);
      }
    }

    // Market and cafe clusters make each campo feel lived in.
    for (const [x, z] of [[-9, 14], [13, 12], [49, 88], [66, 91], [-48, -78], [82, -89], [-60, 100]]) {
      land('marketStall', x, z, 0);
      land('cafeUmbrella', x + 5, z - 3, 0);
      land('cafeTable', x + 5, z + 1, 0);
      land('cafeChair', x + 3.7, z + 1, -PI / 2);
      land('cafeChair', x + 6.3, z + 1, PI / 2);
      land('orangeCrate', x - 2.8, z + 0.4, 0);
      land('flowerPot', x + 2.6, z - 0.5, 0);
      land('bench', x, z - 5, 0);
    }

    // A generous starter ring. Every item here fits the initial 1.2 radius hole.
    const tiny = ['pigeon', 'maskGold', 'maskPink', 'maskBlue', 'gelato', 'bottle', 'flowerPot', 'orangeCrate', 'bollard'];
    for (const radius of [7, 10, 13, 17, 21, 25]) {
      const count = Math.round(radius * 2.2);
      for (let i = 0; i < count; i++) {
        const a = i / count * PI * 2 + randRange(-0.04, 0.04);
        land(pick(tiny), Math.cos(a) * radius, Math.sin(a) * radius, randRange(0, PI * 2));
      }
    }
    // Static tourists and pigeons never stray into a canal. Count successful placements
    // rather than attempts so the map remains populated even where buildings reject props.
    let placed = 0;
    const props = ['tourist', 'gondolier', 'pigeon', 'pigeon', 'maskGold', 'maskPink', 'maskBlue', 'flowerPot', 'orangeCrate', 'bottle', 'gelato', 'bollard', 'cafeChair', 'cafeTable', 'bench'];
    for (let attempt = 0; attempt < 9000 && placed < 580; attempt++) {
      const name = pick(props), x = randRange(-113, 113), z = randRange(-113, 113);
      if (land(name, x, z, randRange(0, PI * 2))) placed++;
    }

    placeOnRoute('vaporetto', this.routes.grand, { count: 5, speed: 5.2, speedJitter: 0.12, offset: 2.6 });
    placeOnRoute('gondola', this.routes.grand, { count: 9, speed: 2.5, speedJitter: 0.12, offset: -2.3 });
    placeOnRoute('gondola', this.routes.cannaregio, { count: 4, speed: 2.2, offset: 1.2 });
    placeOnRoute('gondola', this.routes.sanMarco, { count: 6, speed: 2.1, offset: 1.3 });
  },
};
