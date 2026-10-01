import { buildProtos } from '../objects/moon.js';

let routeList = [];
let CRATERS = [];
let BAY1 = [], BAY2 = [];
const BAYS = [{ cx: 92, cz: -84, w: 30, d: 17 }, { cx: -86, cz: -50, w: 24, d: 17 }];
const inBay = (x, z) => BAYS.some((b) => Math.abs(x - b.cx) < b.w / 2 + 3 && Math.abs(z - b.cz) < b.d / 2 + 3);

export default {
  id: 'moon',
  name: 'The Moon',
  description: 'One small hole for a hole... swallow rocks, rovers and a giant rocket!',
  cardColor: '#6a5acd',
  emoji: '🌙',
  size: 120,
  groundColor: '#b4b4bc',
  skyColor: '#070b1f',
  fogColor: '#0a0f26',
  lightColor: '#f2f4ff',
  ambient: 0.55,
  // Stark low sun: long crisp shadows, cool sky-tinted fill, but bright enough to stay kid-friendly.
  lighting: {
    sunDirection: [-62, 34, 30], sunColor: '#fff3de', sunIntensity: 0.84 * Math.PI,
    hemiSkyColor: '#7b8fd6', hemiGroundColor: '#4a4a66', hemiIntensity: 0.4 * Math.PI,
    shadowOpacity: 0.93, shadowRadius: 1.3, environmentIntensity: 0.3, exposure: 0.94,
  },
  postProcessing: { aoRadius: 0.55, aoStrength: 0.22 },
  groundStyle: 'regolith',
  stars: true,
  sky: { top: '#010208', horizon: '#0b1030' },
  backdrop: { type: 'space' },
  edge: 'rocks',
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Big craters: dark floor, light rim
    const craters = [];
    for (let i = 0; i < 26; i++) {
      craters.push({ x: randRange(-S, S), z: randRange(-S, S), r: randRange(5, 16) });
    }
    craters.push({ x: -70, z: -60, r: 22 }, { x: 65, z: 55, r: 18 });
    CRATERS = craters;
    // ejecta rays radiating from the larger craters
    const rays = [];
    craters.filter((c) => c.r > 9).forEach((c, k) => {
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + k; const d = c.r * (1.5 + (i % 3) * 0.35); rays.push(rect(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, c.r * 0.9, 0.5 + (i % 2) * 0.4, -a)); }
    });
    addDecal(merge(rays), '#bdbdc6', { style: 'regolith' });
    craters.forEach((c) => addDecal(circle(c.x, c.z, c.r * 1.18, 32), '#c6c6ce', { style: 'regolith' }));
    craters.forEach((c) => addDecal(circle(c.x, c.z, c.r, 32), '#9a9aa4', { style: 'regolith' }));
    craters.forEach((c) => addDecal(circle(c.x, c.z, c.r * 0.72, 28), '#8b8b96'));
    craters.forEach((c) => addDecal(circle(c.x, c.z, c.r * 0.4, 24), '#7d7d89'));

    // Small pockmarks
    const small = [];
    for (let i = 0; i < 90; i++) small.push(circle(randRange(-S, S), randRange(-S, S), randRange(0.8, 2.6), 14));
    addDecal(merge(small), '#a3a3ad', { style: 'regolith' });
    const smallIn = [];
    for (let i = 0; i < 60; i++) smallIn.push(circle(randRange(-S, S), randRange(-S, S), randRange(0.5, 1.3), 12));
    addDecal(merge(smallIn), '#8e8e99');

    // Launch pad blast-scorch
    addDecal(circle(-70, 50, 15, 32), '#6d6d78');
    addDecal(circle(-70, 50, 10, 32), '#4f4f5a');

    // Rover tracks: pairs of dashed lines along curvy paths
    const tracks = [];
    const path = (x0, z0, x1, z1, wob, route) => {
      const pts = [];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 1.2);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      const nx = Math.cos(ang), nz = -Math.sin(ang);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const off = Math.sin(t * 9) * wob;
        const cx = x0 + (x1 - x0) * t + nx * off;
        const cz = z0 + (z1 - z0) * t + nz * off;
        pts.push([cx, cz]);
        for (const s of [-0.9, 0.9]) {
          tracks.push(rect(cx + nx * s, cz + nz * s, 0.35, 0.8, ang));
        }
      }
      if (route) {
        // supply-rover route follows the painted tracks (trimmed so it stays clear of landmarks)
        const a = Math.floor(pts.length * route[0]), b = Math.ceil(pts.length * route[1]);
        routes.push(ctx.addRoute(pts.slice(a, b).filter((_, i) => i % 4 === 0), { loop: false, width: 3.5 }));
      }
    };
    const routes = [];
    path(-100, 20, 100, -10, 4, [0.03, 0.88]);
    path(-60, -100, 50, 100, 5, [0.03, 0.97]);
    path(-70, 50, 20, 20, 2, [0.25, 1]);
    path(30, -100, 100, 60, 3, [0.03, 0.97]);
    routeList = routes;
    addDecal(merge(tracks), '#8d8d97');

    // Rover bays next to the habitats: marked parking pads for neat rows of rovers
    BAY1 = ctx.parkingLot(BAYS[0].cx, BAYS[0].cz, BAYS[0].w, BAYS[0].d, { stallW: 3.2, stallD: 5.2, aisle: 6, color: '#6d6d78', lineColor: '#e8b73a' });
    BAY2 = ctx.parkingLot(BAYS[1].cx, BAYS[1].cz, BAYS[1].w, BAYS[1].d, { stallW: 3.2, stallD: 5.2, aisle: 6, color: '#6d6d78', lineColor: '#e8b73a' });
    // walkways of boot prints from the bays to the landing pad
    const boots = [];
    for (let i = 0; i < 20; i++) boots.push(rect(92 - i * 1.5 + (i % 2 ? 0.3 : -0.3), -73 + i * 0.75, 0.4, 0.7, 0.4));
    addDecal(merge(boots), '#8d8d97');

    // Landing pad rings + base area
    addDecal(circle(60, -60, 14, 32), '#a9a9b4', { style: 'concrete' });
    addDecal(circle(60, -60, 11, 32), '#c9c9d2');
    addDecal(circle(60, -60, 7, 28), '#a9a9b4');
    addDecal(merge([rect(60, -60, 20, 1), rect(60, -60, 1, 20)]), '#e8b73a');
  },

  populate(ctx) {
    const { place, randRange, size: S } = ctx;
    const PI2 = Math.PI / 2;
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          const x = randRange(x0, x1), z = randRange(z0, z1);
          if (!inBay(x, z) && place(name, x, z, undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const BASE = [35, 105, -100, -20];
    const place0 = place;
    void place0;
    const RIG = [-110, -30, -110, -40];

    // --- Huge landmark: giant rocket on launch pad
    place('launchPad', -70, 50, 0, 1);

    // --- Huge / large
    scatter('boulder', 8, ALL, 0.9, 1.3, 60);
    place('habitatBig', 62, -30, 0, 1);
    place('habitatBig', -90, -80, 0.6, 1);
    place('miningRig', -55, -75, 0.4, 1);
    place('miningRig', 80, 70, 2, 1);
    place('miningRig', -20, 90, 1, 1);
    place('bigDish', 20, 65, 0, 1);
    place('bigDish', 100, -8, 0, 1);
    place('bigDish', -95, 10, 0, 1);
    // landing zone with landers
    place('lander', 60, -60, 0, 1);
    place('lander', 46, -76, 1, 1);
    place('lander', 78, -48, 2, 1);
    scatter('lander', 4, ALL, 0.95, 1.1, 60);
    scatter('shuttle', 6, ALL, 0.95, 1.1, 60);
    place('shuttle', 30, 20, 0.3, 1);
    place('shuttle', -40, 10, 1.2, 1);
    // habitats flanking the rover bays (airlocks face the bays)
    place('habitat', 68, -88, 0, 1); place('habitat', 92, -106, PI2, 1); place('habitat', -108, -50, 0, 1); place('habitat', -86, -32, PI2, 1);
    BAY1.forEach((sp) => ctx.rand() < 0.85 && ctx.placeParked('rover', sp));
    BAY2.forEach((sp) => ctx.rand() < 0.85 && ctx.placeParked('rover', sp));
    scatter('habitat', 6, BASE, 0.95, 1.1, 50);
    scatter('habitat', 5, ALL, 0.95, 1.1, 50);
    scatter('fuelSphere', 6, BASE);
    scatter('fuelSphere', 4, ALL);
    scatter('antenna', 10, ALL);
    scatter('solarFarm', 8, BASE);
    scatter('solarFarm', 6, ALL);
    scatter('rockL', 10, ALL, 0.9, 1.25, 40);

    // --- Medium
    scatter('fuelTank', 16, BASE);
    scatter('fuelTank', 10, ALL);
    scatter('dish', 16, ALL);
    // supply rovers shuttle along the painted tracks (2 per track, staggered)
    routeList.forEach((r) => ctx.placeOnRoute('rover', r, { count: 2, speed: 4, offset: 1.25, speedJitter: 0.1 }));
    scatter('rover', 3, [-100, 100, -20, 30], 0.95, 1.05);
    scatter('solarPanel', 26, BASE);
    scatter('solarPanel', 18, ALL);
    scatter('rockM', 30, ALL, 0.85, 1.2);

    // --- Crater rims and ejecta: boulder fields + rock clusters of every size (the bulk of the terrain detail)
    const rimRock = (c, ang, dist) => {
      const x = c.x + Math.cos(ang) * dist, z = c.z + Math.sin(ang) * dist, k = randRange(0, 1);
      if (inBay(x, z)) return;
      if (k < 0.07 && c.r > 8) { place('boulder', x, z, undefined, randRange(0.45, 1.0)); return; }
      if (k < 0.22) { place('rockL', x, z, undefined, randRange(0.7, 1.15)); return; }
      if (k < 0.5) { place('rockM', x, z, undefined, randRange(0.8, 1.2)); return; }
      if (k < 0.8) { place('rockS', x, z, undefined, randRange(0.9, 1.2)); return; }
      place('pebble', x, z, undefined, randRange(0.9, 1.3));
    };
    for (const c of CRATERS) {
      const n = Math.round(c.r * 1.5);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + randRange(-0.15, 0.15), dist = c.r * randRange(1.0, 1.3);
        rimRock(c, ang, dist);
      }
      // ejecta: tight little clusters fanning out along the rays
      for (let k = 0; k < Math.round(c.r / 4); k++) {
        const ang = randRange(0, Math.PI * 2), dist = c.r * randRange(1.4, 2.3), cx = c.x + Math.cos(ang) * dist, cz = c.z + Math.sin(ang) * dist;
        for (let j = 0; j < 4; j++) rimRock({ x: cx, z: cz, r: 3 }, randRange(0, 6.28), randRange(0.8, 2.6));
      }
    }
    scatter('boulder', 14, ALL, 0.5, 1.0, 60);
    scatter('rockL', 14, ALL, 0.8, 1.2, 40);

    // --- Orderly base items: antenna rows, solar arrays, equipment racks, flags at the landing site
    const grid = (name, x0, z0, nx, nz, dx, dz, rot = 0) => { for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) place(name, x0 + i * dx, z0 + j * dz, rot, 1); };
    // spawn-side outpost: antenna row, solar array and equipment racks (a designed block, not scattered litter)
    for (let i = 0; i < 11; i++) place('antennaS', -22 + i * 4.4, 13, 0, 1);
    for (let i = 0; i < 9; i++) place('antennaS', -20 + i * 4.4, -16, 0, 1);
    grid('solarPanel', 10, -24, 6, 2, 4.2, 4.6, PI2);
    grid('sampleBox', -20, 8, 10, 2, 2.2, 1.6, 0);
    grid('tool', -20, -9.5, 8, 1, 2.6, 1.6, 0);
    for (let i = 0; i < 8; i++) place('astronaut', -16 + i * 4.5, 6, undefined, 1);
    // main base
    for (let i = 0; i < 12; i++) place('antennaS', 38 + i * 5.2, -100 + 4, 0, 1);
    grid('solarPanel', 38, -24, 12, 2, 4.4, 4.8, PI2);
    grid('solarPanel', -60, 78, 8, 2, 4.4, 4.8, PI2);
    grid('sampleBox', 36, -46, 8, 2, 2.4, 1.7, 0);
    grid('tool', 90, -46, 4, 2, 2.4, 1.7, 0);
    grid('sampleBox', -100, -66, 6, 2, 2.4, 1.7, 0);
    grid('antennaS', -110, -90, 1, 8, 1, 4.8, 0);
    place('flag', 60, -45, 0, 1); place('flag', 46, -62, 0, 1); place('flag', 74, -62, 0, 1);
    scatter('astronaut', 40, BASE, 0.9, 1.1, 12);
    scatter('astronaut', 22, ALL, 0.9, 1.1, 12);
    scatter('sampleBox', 14, BASE, 0.9, 1.1, 12);
    scatter('tool', 10, RIG, 0.9, 1.1, 12);
    scatter('rockS', 80, ALL, 0.9, 1.2, 12);
    scatter('pebble', 90, ALL, 0.9, 1.3, 12);
  },
};
