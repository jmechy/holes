import { buildProtos } from '../objects/minecraft.js';

const POND = { x: -55, z: 50, r: 17 };
const DESERT = [55, 105, -35, 20];
const MINES = [[-15, -75], [25, -95]];

export default {
  id: 'minecraft',
  name: 'Blocky World',
  description: 'Swallow creepers, cows and a giant blocky castle!',
  cardColor: '#5cae3c',
  emoji: '⛏️',
  size: 120,
  groundColor: '#5fae3f',
  skyColor: '#8fd0ff',
  fogColor: '#a9dcff',
  lightColor: '#fffbe8',
  ambient: 0.65,
  // Bright cheerful noon: near-overhead white sun, crisp short shadows, vivid sky fill.
  lighting: {
    sunDirection: [25, 85, 18], sunColor: '#fffbe8', sunIntensity: 0.8 * Math.PI,
    hemiSkyColor: '#c4e6ff', hemiGroundColor: '#8abf62', hemiIntensity: 0.62 * Math.PI,
    shadowOpacity: 0.62, shadowRadius: 1.4, environmentIntensity: 0.2, exposure: 1.02,
  },
  postProcessing: { aoRadius: 0.3, aoStrength: 0.13 },
  groundStyle: 'voxel',
  edge: 'blocks',
  sky: { top: '#4f9cf0', horizon: '#bfe6ff' },
  clouds: true,
  backdrop: [
    // Terraced block hills with block trees and lakes; taller peaks to the north.
    { type: 'voxel', color: '#5fae3f', color2: '#7a5a3a' },
    { type: 'voxel', side: 'north', color: '#5fae3f', color2: '#7a5a3a', tall: 1.8 },
  ],
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, rand, randRange } = ctx;
    const S = ctx.size;
    const snap = (v, g = 2) => Math.round(v / g) * g;

    // Lighter / darker grass patches (blocky squares, snapped to a 2-unit grid)
    const lite = [], dark = [];
    for (let i = 0; i < 90; i++) {
      const w = Math.round(randRange(2, 5)) * 2, d = Math.round(randRange(2, 5)) * 2;
      (i % 2 ? lite : dark).push(rect(snap(randRange(-S, S)), snap(randRange(-S, S)), w, d));
    }
    addDecal(merge(lite), '#6cbd4a', { style: 'voxel' });
    addDecal(merge(dark), '#52a035', { style: 'voxel' });
    // tiny 1x1 grass tufts
    const tufts = [];
    for (let i = 0; i < 160; i++) tufts.push(rect(snap(randRange(-S, S), 1), snap(randRange(-S, S), 1), 1, 1));
    addDecal(merge(tufts), '#7ad058', { style: 'voxel' });

    // Sandy desert + beach around the pond (with dune bands and sandstone pixels)
    addDecal(merge([rect(80, -8, 50, 55), rect(70, 12, 30, 20), rect(95, -30, 22, 16)]), '#e6d69a', { style: 'sand' });
    addDecal(circle(POND.x, POND.z, POND.r + 3, 24), '#e6d69a', { style: 'sand' });
    addDecal(merge([rect(78, -12, 6, 6), rect(90, 2, 8, 5), rect(100, -20, 5, 8), rect(66, -22, 6, 4), rect(84, -32, 6, 4), rect(72, 14, 8, 4)]), '#d8c682', { style: 'sand' });
    const dunes = [];
    for (let i = 0; i < 28; i++) dunes.push(rect(snap(randRange(58, 104), 1), snap(randRange(-34, 18), 1), 3, 1));
    addDecal(merge(dunes), '#efe2ae', { style: 'sand' });

    // Dirt paths (blocky, 4 wide) with a coarse pebble/dirt speckle
    const path = [
      rect(0, 0, S * 2, 4), rect(0, 0, 4, S * 2), rect(60, 55, 4, 60), rect(60, 30, 60, 4),
      rect(-45, -30, 4, 60), rect(-45, -30, 80, 4),
    ];
    addDecal(merge(path), '#8a6a3f', { style: 'dirt' });
    const dots = [], dots2 = [];
    for (let i = 0; i < 220; i++) {
      const onX = rand() < 0.5;
      const t = snap(randRange(-S, S), 1);
      (i % 2 ? dots : dots2).push(rect(onX ? t : snap(randRange(-1.6, 1.6), 1) + 0.5, onX ? snap(randRange(-1.6, 1.6), 1) + 0.5 : t, 1, 1));
    }
    addDecal(merge(dots), '#6f5230', { style: 'dirt' });
    addDecal(merge(dots2), '#a07c4a', { style: 'dirt' });

    // Pond: water, deeper centre, lily pads (green squares)
    addDecal(circle(POND.x, POND.z, POND.r, 24), '#3f76e4', { style: 'water' });
    addDecal(circle(POND.x + 2, POND.z - 2, POND.r * 0.6, 20), '#5b8ff0', { style: 'water' });
    addDecal(merge([rect(POND.x - 8, POND.z + 6, 2, 2), rect(POND.x - 5, POND.z + 9, 2, 2), rect(POND.x + 7, POND.z + 8, 2, 2), rect(POND.x + 10, POND.z - 4, 2, 2), rect(POND.x - 10, POND.z - 6, 2, 2)]), '#3f9a3a');
    addDecal(merge([rect(POND.x - 8, POND.z + 6, 1, 1), rect(POND.x + 7, POND.z + 8, 1, 1), rect(POND.x - 10, POND.z - 6, 1, 1)]), '#f2a6c8');

    // Farm plots (tilled soil rows) with crops, water channel, and stone quarry floor
    const rows = [], crops = [], crops2 = [];
    for (let i = 0; i < 5; i++) {
      rows.push(rect(-78, 8 + i * 4, 24, 2.4));
      for (let k = 0; k < 12; k++) (i % 2 ? crops : crops2).push(rect(-88 + k * 2 + 1, 8 + i * 4, 1.2, 1.2));
    }
    addDecal(merge(rows), '#5a3a1e', { style: 'dirt' });
    addDecal(merge(crops), '#7ec040');
    addDecal(merge(crops2), '#e6c84a');
    addDecal(merge([rect(-78, 6, 26, 1.2)]), '#3f76e4', { style: 'water' });
    const quarry = [rect(-25, -85, 40, 26), rect(-5, -100, 26, 12)];
    addDecal(merge(quarry), '#7c7c7c', { style: 'voxel' });
    const qsp = [], qsp2 = [];
    for (let i = 0; i < 60; i++) (i % 2 ? qsp : qsp2).push(rect(snap(randRange(-44, -4), 2), snap(randRange(-97, -73), 2), 2, 2));
    addDecal(merge(qsp), '#6a6a6a', { style: 'voxel' });
    addDecal(merge(qsp2), '#8e8e8e', { style: 'voxel' });
    addDecal(circle(-60, -60, 6, 16), '#2a1a40'); // portal scorch
    addDecal(merge([rect(-60, -60, 2, 2), rect(-56, -62, 2, 2), rect(-64, -57, 2, 2), rect(-60, -66, 2, 2)]), '#4a2a70');

    // Cobble road + plaza from the castle gate, village street, flower beds
    addDecal(merge([rect(72, -48, 5, 40), rect(72, -66, 18, 8)]), '#8a8a8a', { style: 'concrete' });
    const cobs = [];
    for (let i = 0; i < 50; i++) cobs.push(rect(snap(randRange(64, 80), 1) + 0.5, snap(randRange(-70, -28), 1) + 0.5, 1, 1));
    addDecal(merge(cobs), '#6e6e6e', { style: 'concrete' });
    addDecal(rect(74, 66, 44, 5), '#8a8a8a', { style: 'concrete' });
    const bedsR = [], bedsY = [];
    for (let i = 0; i < 6; i++) { bedsR.push(rect(46 + i * 2, 80.5, 1, 1), rect(92 + i * 2, 90.5, 1, 1)); bedsY.push(rect(47 + i * 2, 81.5, 1, 1), rect(93 + i * 2, 91.5, 1, 1)); }
    addDecal(merge([rect(51, 81, 12, 3), rect(97, 91, 12, 3)]), '#5a3a1e', { style: 'dirt' });
    addDecal(merge(bedsR), '#d9382b');
    addDecal(merge(bedsY), '#ffd21a');

    // Mine rails leading out of each mine entrance (minecarts are parked on them in populate)
    const rails = [], sleepers = [];
    for (const [mx, mz] of MINES) {
      rails.push(rect(mx - 0.55, mz + 16, 0.16, 26), rect(mx + 0.55, mz + 16, 0.16, 26));
      for (let z = mz + 3.6; z < mz + 29; z += 0.8) sleepers.push(rect(mx, z, 1.6, 0.3));
    }
    addDecal(merge(sleepers), '#7a5a30');
    addDecal(merge(rails), '#9a9aa2');
  },

  populate(ctx) {
    const { randRange, rand, size: S } = ctx;
    // static props stay off the dirt paths and the cobble road (rectangles as painted in decorate(); [cx, cz, w, d])
    const PATHS = [[0, 0, S * 2, 4], [0, 0, 4, S * 2], [60, 55, 4, 60], [60, 30, 60, 4], [-45, -30, 4, 60], [-45, -30, 80, 4],
      [72, -48, 5, 40], [72, -66, 18, 8], [74, 66, 44, 5]];
    const onRoad = (x, z, m) => PATHS.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + m && Math.abs(z - cz) < d / 2 + m);
    const place = (n, x, z, rot, sc = 1, opts) => {
      const proto = ctx.protos[n];
      const isStatic = opts && 'move' in opts ? !opts.move : proto && !proto.move;
      if (isStatic && onRoad(x, z, Math.min(1, (proto ? proto.radius * sc : 0) * 0.6))) return false;
      return ctx.place(n, x, z, rot, sc, opts);
    };
    const inPond = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5;
    const put = (name, x, z, rot, sc = 1) => !inPond(x, z) && place(name, x, z, rot, sc);
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (put(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const FOREST = [-112, -40, -112, -30];
    const FARM = [-112, -50, -5, 40];
    const VILLAGE = [35, 112, 40, 112];
    const QUARRY = [-40, 30, -112, -65];
    const START = [-28, 28, -28, 28];

    const TIGHT = { move: null, tight: true };
    const SMALL = ['flowerRed', 'flowerYellow', 'flowerBlue', 'mushroomRed', 'sapling', 'grassBlock'];
    // fence run from (x0,z0) to (x1,z1): equal steps of ~4 so the run is gap-free; placed straight through ctx.place
    // (no path check: a fence may touch a dirt path) and every rejected segment is reported
    const fenceLine = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 4), yaw = Math.atan2(-(z1 - z0), x1 - x0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        if (!ctx.place('fenceRow', x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, yaw, 1, TIGHT)) console.warn('fence segment rejected at', x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
      }
    };
    const fenceRect = (cx, cz, hw, hd) => {
      fenceLine(cx - hw, cz - hd, cx + hw, cz - hd); fenceLine(cx - hw, cz + hd, cx + hw, cz + hd);
      fenceLine(cx - hw, cz - hd, cx - hw, cz + hd); fenceLine(cx + hw, cz - hd, cx + hw, cz + hd);
    };
    // square fenced pen (half-size hs), fully enclosed (animals wander inside it)
    const pen = (cx, cz, hs, gate, animals, rect) => {
      const hw = rect ? rect[0] : hs, hd = rect ? rect[1] : hs;
      fenceRect(cx, cz, hw, hd);
      for (const [n, k] of animals) for (let i = 0; i < k; i++) for (let t = 0; t < 10; t++) {
        if (place(n, cx + randRange(-hw + 1.8, hw - 1.8), cz + randRange(-hd + 1.8, hd - 1.8), undefined, 1, { move: { type: 'walk', speed: 1.1, range: 2.2 } })) break;
      }
    };
    // grove of mixed voxel trees with an understory of flowers / mushrooms / saplings around the trunks
    const grove = (cx, cz, rx, rz, n, kinds, under = 3) => {
      for (let i = 0; i < Math.round(n * 1.05); i++) for (let t = 0; t < 25; t++) {
        const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
        const x = cx + Math.cos(a) * d * rx, z = cz + Math.sin(a) * d * rz, k = kinds[Math.floor(rand() * kinds.length)];
        if (!put(k, x, z, undefined, 0.9 + rand() * 0.25)) continue;
        for (let u = 0; u < Math.min(under, 2); u++) for (let q = 0; q < 6; q++) {
          const aa = rand() * Math.PI * 2, dd = randRange(1.9, 3.4);
          const nm = k === 'spruceTree' ? ['mushroomRed', 'mushroomBrown', 'sapling'] : k === 'cherryTree' ? ['flowerRed', 'flowerBlue', 'flowerYellow'] : ['flowerRed', 'flowerYellow', 'flowerBlue', 'mushroomBrown', 'mushroomRed', 'sapling'];
          if (put(nm[Math.floor(rand() * nm.length)], x + Math.cos(aa) * dd, z + Math.sin(aa) * dd, undefined, 1)) break;
        }
        break;
      }
    };
    // torches in a line along a path (alternating sides)
    const torchLine = (x0, z0, x1, z1, step, off) => {
      const len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
      for (let t = 0, i = 0; t <= len; t += step, i++) { const s = i % 2 ? 1 : -1; put('torch', x0 + (x1 - x0) * t / len + nx * off * s, z0 + (z1 - z0) * t / len + nz * off * s, 0, 1); }
    };

    // --- Fences: farm field, animal pens, garden plots (placed FIRST so nothing else can block a fence segment)
    fenceRect(-78, 17, 14.4, 14.4);
    pen(-55, 14, 4, 'n', [['cow', 2], ['sheep', 2]]);
    pen(-105, 5, 4, 's', [['pig', 3], ['chicken', 2]]);
    pen(-108, -15, 4, 'e', [['sheep', 3]]);
    pen(48, 100, 5, 's', [['cow', 2], ['pig', 2]]);
    pen(25, 90, 4, 'n', [['sheepPink', 2], ['sheep', 2]]);
    pen(-14, 15, 4, 's', [['chicken', 4]]);                  // chicken run beside spawn
    pen(14, -14, 4, 'w', [], null);                          // flower garden beside spawn
    for (const gx of [-1, 1]) for (const gz of [-1, 1]) {
      put(gz < 0 ? 'flowerRed' : 'flowerYellow', 14 + gx * 1.5, -14 + gz * 1.5, 0, 1);
      put('flowerBlue', 14 + gx * 1.5, -14, 0, 1);
    }
    pen(-30, -50, 3, 'e', [], null);                         // little crop plots
    for (let i = 0; i < 4; i++) place('pumpkin', -30, -52 + i * 1.8, 0, 1);

    // --- Huge landmarks
    place('castle', 72, -78, 0, 1);
    place('giantTree', -78, -75, 0, 1);
    place('watchtower', 25, 62, 0, 1);
    place('watchtower', -30, 80, 0, 1);
    place('watchtower', -95, 90, 0, 1);

    // --- Large: houses, barns, mine, portal
    for (let i = 0; i < 4; i++) place('house', 50 + i * 16, 55 + (i % 2) * 22, 0, 1);
    place('farmHouse', -85, 60, 0, 1);
    place('farmHouse', 95, 75, 0, 1);
    place('barn', -95, 30, 0, 1);
    place('barn', 90, 100, 0, 1);
    place('mineEntrance', -15, -75, 0, 1);
    place('mineEntrance', 25, -95, 0, 1);
    place('portal', -60, -60, 0, 1);
    // minecarts parked on the mine rails
    for (const [mx, mz] of MINES) for (const dz of [10, 17, 24]) place('minecart', mx, mz + dz, Math.PI / 2, 1);
    scatter('house', 3, VILLAGE);
    scatter('hut', 7, ALL);
    scatter('hut', 6, VILLAGE);
    scatter('lavaPool', 5, QUARRY);
    scatter('lavaPool', 1, ALL);
    scatter('well', 5, VILLAGE);
    scatter('well', 1, ALL);

    // --- Torches line the dirt paths
    torchLine(-112, 0, 112, 0, 8, 3.2);
    torchLine(0, -112, 0, 112, 8, 3.2);
    torchLine(-112, 0, 112, 0, 8, 3.2 + 0);
    torchLine(60, 25, 60, 85, 7, 3.2);
    torchLine(30, 30, 90, 30, 7, 3.2);
    torchLine(-45, -58, -45, 0, 7, 3.2);
    torchLine(-85, -30, -5, -30, 8, 3.2);
    torchLine(72, -66, 72, -30, 7, 4);
    // neat orchard rows beside the main path
    for (let x = 14; x <= 50; x += 6) { put('sapling', x, 8, 0, 1); put('sapling', x, -8, 0, 1); }
    for (let x = -50; x <= -14; x += 6) { put('sapling', x, 8, 0, 1); put('sapling', x, -8, 0, 1); }

    // --- Forests and groves (voxel trees, with flowers / mushrooms / saplings underneath)
    const MIX = ['oakTree', 'oakTree', 'birchTree', 'spruceTree', 'cherryTree'];
    grove(-78, -62, 34, 40, 34, ['oakTree', 'oakTree', 'birchTree', 'spruceTree', 'oakTreeBig'], 3);
    grove(-85, -95, 28, 14, 14, ['spruceTree', 'spruceTree', 'birchTree'], 3);
    grove(30, -62, 18, 24, 22, MIX, 3);          // NE meadow forest
    grove(18, -105, 16, 8, 8, ['oakTree', 'birchTree'], 2);
    grove(-25, 28, 14, 14, 9, ['birchTree', 'oakTree', 'cherryTree'], 3);   // west of spawn
    grove(-22, 58, 12, 14, 9, ['oakTree', 'birchTree', 'cherryTree'], 3);
    grove(40, -32, 12, 10, 7, ['oakTree', 'birchTree', 'spruceTree'], 3);
    grove(26, 22, 11, 11, 6, ['oakTree', 'cherryTree'], 3);
    grove(12, 80, 18, 22, 22, MIX, 3);           // SE-centre
    grove(-30, 95, 24, 16, 18, ['oakTree', 'oakTreeBig', 'birchTree', 'cherryTree'], 3);
    grove(-100, 75, 14, 30, 14, ['oakTree', 'spruceTree', 'birchTree'], 3);
    grove(-85, 105, 24, 8, 8, ['oakTree', 'cherryTree'], 3);
    grove(-20, -35, 14, 12, 9, ['oakTree', 'birchTree', 'spruceTree'], 3);
    grove(105, -62, 10, 16, 7, ['oakTree', 'birchTree'], 2);
    grove(105, 60, 8, 12, 6, ['birchTree', 'cherryTree'], 2);
    grove(112, 112, 8, 8, 3, ['oakTree'], 2);
    scatter('oakTreeBig', 2, ALL);
    scatter('cherryTree', 4, [-20, 60, 70, 112]);

    // --- Village life
    scatter('villager', 14, VILLAGE);
    scatter('villager', 2, ALL);
    scatter('craftingTable', 7, VILLAGE);
    scatter('chest', 8, VILLAGE);
    scatter('furnace', 6, VILLAGE);
    for (let x = 42; x <= 106; x += 8) { place('fenceRow', x, 62.3, 0, 1, TIGHT); }
    for (const hx of [50, 66, 82, 98]) { put('flowerRed', hx - 3.5, 52, 0, 1); put('flowerYellow', hx + 3.5, 52, 0, 1); put('torch', hx - 3.5, 58, 0, 1); }

    // --- Farm
    scatter('hayBale', 12, FARM);
    scatter('pumpkin', 10, FARM);
    scatter('cow', 10, FARM);
    scatter('pig', 8, FARM);
    scatter('sheep', 8, FARM);
    scatter('chicken', 10, FARM);

    // --- Mobs across the world
    scatter('cow', 10, ALL);
    scatter('pig', 10, ALL);
    scatter('sheep', 8, ALL);
    scatter('sheepPink', 4, ALL);
    scatter('wolf', 5, ALL);
    scatter('wolf', 6, FOREST);
    scatter('creeper', 16, ALL);
    scatter('zombie', 10, ALL);
    scatter('skeleton', 14, QUARRY);
    scatter('skeleton', 6, ALL);

    // --- Desert
    scatter('cactus', 16, DESERT);
    scatter('cactus', 4, ALL);
    scatter('tntBlock', 8, DESERT);

    // --- Quarry blocks
    scatter('stoneStack', 12, QUARRY);
    scatter('stoneStack', 4, ALL);
    scatter('coalOre', 14, QUARRY);
    scatter('ironOre', 10, QUARRY);
    scatter('goldOre', 8, QUARRY);
    scatter('diamondOre', 6, QUARRY);
    scatter('stoneBlock', 14, QUARRY);
    scatter('cobbleBlock', 14, QUARRY);

    // --- Small things: only in meaningful spots (flower meadows by the pond/paths, no random block litter)
    for (let i = 0; i < 16; i++) {
      const cx = randRange(-S + 8, S - 8), cz = randRange(-S + 8, S - 8), k = ctx.pick(['flowerRed', 'flowerYellow', 'flowerBlue']);
      for (let j = 0; j < 4; j++) put(k, cx + randRange(-1.6, 1.6), cz + randRange(-1.6, 1.6), undefined, 1);
    }
        scatter('grassBlock', 8, ALL, 1, 1, 12);
    scatter('dirtBlock', 6, ALL, 1, 1, 12);
    scatter('stoneBlock', 4, ALL, 1, 1, 12);
    scatter('chicken', 8, ALL, 1, 1, 12);
  },
};
