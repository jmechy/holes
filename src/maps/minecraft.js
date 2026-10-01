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

    // Dense ring of tiny starters around spawn (6-24 units out)
    const ring = (name, n) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < 12; t++) {
        const a = rand() * Math.PI * 2, d = randRange(6, 24);
        if (put(name, Math.cos(a) * d, Math.sin(a) * d, undefined, 1)) break;
      }
    };
    const STARTER = () => { ring('flowerRed', 8); ring('flowerYellow', 8); ring('flowerBlue', 6); ring('mushroomRed', 6); ring('grassBlock', 8); ring('dirtBlock', 6); ring('torch', 6); ring('sapling', 4); ring('chicken', 6); };

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
    scatter('hut', 14, ALL);
    scatter('hut', 6, VILLAGE);
    scatter('lavaPool', 5, QUARRY);
    scatter('lavaPool', 3, ALL);
    scatter('well', 5, VILLAGE);
    scatter('well', 3, ALL);

    // --- Trees (big first)
    scatter('oakTreeBig', 8, FOREST);
    scatter('oakTreeBig', 4, ALL);
    scatter('oakTree', 16, FOREST);
    scatter('birchTree', 10, FOREST);
    scatter('spruceTree', 10, [-112, -40, -112, -60]);
    scatter('cherryTree', 6, [-20, 60, 70, 112]);
    scatter('oakTree', 12, ALL);
    scatter('birchTree', 10, ALL);
    scatter('cherryTree', 4, ALL);
    scatter('spruceTree', 4, ALL);

    // --- Village life
    scatter('villager', 14, VILLAGE);
    scatter('villager', 6, ALL);
    scatter('craftingTable', 7, VILLAGE);
    scatter('chest', 8, VILLAGE);
    scatter('furnace', 6, VILLAGE);
    scatter('fenceRow', 10, VILLAGE);

    // --- Farm
    scatter('fenceRow', 8, FARM);
    scatter('hayBale', 16, FARM);
    scatter('pumpkin', 16, FARM);
    scatter('cow', 16, FARM);
    scatter('pig', 14, FARM);
    scatter('sheep', 14, FARM);
    scatter('chicken', 20, FARM);

    // --- Mobs across the world
    scatter('cow', 14, ALL);
    scatter('pig', 16, ALL);
    scatter('sheep', 12, ALL);
    scatter('sheepPink', 6, ALL);
    scatter('wolf', 12, ALL);
    scatter('wolf', 6, FOREST);
    scatter('creeper', 26, ALL);
    scatter('zombie', 20, ALL);
    scatter('skeleton', 14, QUARRY);
    scatter('skeleton', 8, ALL);

    // --- Desert
    scatter('cactus', 22, DESERT);
    scatter('cactus', 6, ALL);
    scatter('tntBlock', 8, DESERT);

    // --- Quarry blocks
    scatter('stoneStack', 12, QUARRY);
    scatter('stoneStack', 6, ALL);
    scatter('coalOre', 14, QUARRY);
    scatter('ironOre', 10, QUARRY);
    scatter('goldOre', 8, QUARRY);
    scatter('diamondOre', 6, QUARRY);
    scatter('stoneBlock', 14, QUARRY);
    scatter('cobbleBlock', 14, QUARRY);

    // --- Starter cluster near spawn
    scatter('flowerRed', 10, START, 1, 1, 12);
    scatter('flowerYellow', 10, START, 1, 1, 12);
    scatter('mushroomRed', 8, START, 1, 1, 12);
    scatter('grassBlock', 10, START, 1, 1, 12);
    scatter('chicken', 6, START, 1, 1, 12);
    scatter('torch', 6, START, 1, 1, 12);
    scatter('pig', 2, START, 1, 1, 12);
    STARTER();

    // --- Small everywhere
    scatter('flowerRed', 35, ALL, 1, 1, 12);
    scatter('flowerYellow', 35, ALL, 1, 1, 12);
    scatter('flowerBlue', 30, ALL, 1, 1, 12);
    scatter('mushroomRed', 20, FOREST, 1, 1, 12);
    scatter('mushroomBrown', 20, FOREST, 1, 1, 12);
    scatter('mushroomRed', 14, ALL, 1, 1, 12);
    scatter('sapling', 15, ALL, 1, 1, 12);
    scatter('torch', 20, ALL, 1, 1, 12);
    scatter('grassBlock', 35, ALL, 1, 1, 12);
    scatter('dirtBlock', 30, ALL, 1, 1, 12);
    scatter('stoneBlock', 12, ALL, 1, 1, 12);
    scatter('cobbleBlock', 10, ALL, 1, 1, 12);
    scatter('coalOre', 10, ALL, 1, 1, 12);
    scatter('ironOre', 6, ALL, 1, 1, 12);
    scatter('goldOre', 4, ALL, 1, 1, 12);
    scatter('chicken', 20, ALL, 1, 1, 12);
    scatter('diamondOre', 3, ALL, 1, 1, 12);
  },
};
