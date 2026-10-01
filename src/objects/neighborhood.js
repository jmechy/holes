// Neighborhood object prototypes: real CC0 Kenney models (City Kit Suburban / Car Kit / City Kit Roads / Blocky Characters /
// Nature Kit) baked into our vertex-colour protos by gltfProtos.js, plus a few procedural props for gaps.
// Call preloadModels() (async, from the map's preload()) before buildProtos().
import { box, cyl, sphere, rbox, makeProto } from './build.js';
import { loadModels, protoFromGLTF } from './gltfProtos.js';

const SUB = 'models/kenney-city-suburban/', CAR = 'models/kenney-car-kit/', ROAD = 'models/kenney-city-roads/';
const PPL = 'models/kenney-blocky-characters/', NAT = 'models/kenney-nature-kit/';

const HOUSE_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'm', 'o', 'u'];
const CAR_FILES = ['sedan', 'hatchback-sports', 'suv', 'taxi', 'van', 'police', 'delivery', 'firetruck', 'garbage-truck', 'cone', 'box', 'debris-tire', 'debris-nut', 'debris-bolt'];
const ROAD_FILES = ['construction-barrier', 'light-square', 'light-curved', 'traffic-light', 'dumpster', 'road-sign-stop', 'road-sign-warning'];
const PPL_FILES = ['a', 'b', 'c', 'd', 'e', 'f'];
const NAT_FILES = ['tree_default', 'tree_oak', 'tree_fat', 'tree_simple', 'tree_detailed', 'tree_thin', 'tree_small', 'tree_pineTallA', 'tree_pineRoundA',
  'plant_bush', 'plant_bushLarge', 'plant_bushSmall', 'plant_bushDetailed', 'flower_redA', 'flower_yellowA', 'flower_purpleA', 'flower_redB', 'flower_yellowB',
  'flower_purpleB', 'mushroom_red', 'mushroom_tan', 'rock_smallA', 'rock_smallC', 'rock_largeA', 'rock_tallA', 'stone_smallA', 'stone_smallD', 'stump_round', 'log',
  'pot_small', 'sign', 'crop_pumpkin', 'crop_carrot', 'crop_melon', 'grass_large', 'campfire_stones', 'tent_smallOpen', 'fence_simple', 'statue_obelisk'];
const SUB_FILES = ['tree-large', 'tree-small', 'fence-low', 'fence-2x2', 'fence-1x3', 'planter', 'path-stones-short'];

export const MODEL_URLS = [
  ...HOUSE_FILES.map((n) => `${SUB}building-type-${n}.glb`), ...SUB_FILES.map((n) => `${SUB}${n}.glb`),
  ...CAR_FILES.map((n) => `${CAR}${n}.glb`), ...ROAD_FILES.map((n) => `${ROAD}${n}.glb`),
  ...PPL_FILES.map((n) => `${PPL}character-${n}.glb`), ...NAT_FILES.map((n) => `${NAT}${n}.glb`),
];

let GLTF = null; // Map path -> gltf
export async function preloadModels() {
  GLTF = await loadModels(MODEL_URLS);
}

// Nature Kit ships teal leaves / orange dirt (its own art style): remap to a friendly natural palette.
const NATURE = { leafsGreen: '#45b04a', leafsDark: '#2f8a3c', leafsFall: '#f28a1a', grass: '#5cc04e', dirt: '#9a7048', wood: '#c99a5b', woodDark: '#8f6a38',
  woodBark: '#7a4a28', woodBarkDark: '#5e3a20', woodInner: '#f0d9a8', stone: '#a9b0b8', stoneDark: '#7c848c' };
const leaves = (c, c2) => ({ ...NATURE, leafsGreen: c, leafsDark: c2 ?? c });

export function buildProtos() {
  if (!GLTF) throw new Error('neighborhood: call preloadModels() before buildProtos()');
  const P = {};
  const g = (path) => GLTF.get(path);
  const add = (name, path, opts = {}) => { P[name] = protoFromGLTF(name, g(path), opts); return P[name]; };

  // --- Houses: 12 shapes, green roofs as shipped plus hue-shifted roof/planter variants ------------------------------
  const HUES = { Red: -145, Blue: 75, Orange: -115, Purple: 120, Yellow: -90 };
  const hv = { a: ['Red', 'Blue'], b: ['Orange', 'Purple'], c: ['Yellow', 'Red'], e: ['Blue', 'Orange'], g: ['Purple', 'Red'], k: ['Yellow', 'Blue'], m: ['Orange', 'Red'], o: ['Purple', 'Yellow'] };
  HOUSE_FILES.forEach((n, i) => {
    const o = { length: 11 + (i % 3) * 1, surface: 'stucco', textureStrength: 0.22, value: 7 };
    add(`house${n.toUpperCase()}`, `${SUB}building-type-${n}.glb`, o);
    for (const v of hv[n] ?? []) add(`house${n.toUpperCase()}${v}`, `${SUB}building-type-${n}.glb`, { ...o, hue: HUES[v] });
  });

  // --- Cars: native models face +Z, ours face +X ------------------------------------------------------------------
  const car = (name, file, length, hue = 0, extra = {}) =>
    add(name, `${CAR}${file}.glb`, { rotY: Math.PI / 2, length, hue, surface: 'paint', textureStrength: 0.15, value: +(length * 0.85).toFixed(1), ...extra });
  car('sedan', 'sedan', 4.4); car('sedanBlue', 'sedan', 4.4, 200); car('sedanYellow', 'sedan', 4.4, 55); car('sedanGreen', 'sedan', 4.4, 120);
  car('hatch', 'hatchback-sports', 4.3); car('hatchBlue', 'hatchback-sports', 4.3, 95); car('hatchPink', 'hatchback-sports', 4.3, 170); car('hatchOrange', 'hatchback-sports', 4.3, -110);
  car('suv', 'suv', 4.8); car('suvRed', 'suv', 4.8, -150); car('suvBlue', 'suv', 4.8, 75);
  car('taxi', 'taxi', 4.5); car('van', 'van', 5); car('vanRed', 'van', 5, 150); car('police', 'police', 4.7);
  car('deliveryTruck', 'delivery', 6.5, 0, { value: 11 }); car('deliveryTruckBlue', 'delivery', 6.5, 100, { value: 11 });
  car('fireTruck', 'firetruck', 7.2, 0, { value: 14 }); car('garbageTruck', 'garbage-truck', 6.8, 0, { value: 12 });
  // Loose car-kit props
  add('trafficCone', `${CAR}cone.glb`, { scale: 1.7, value: 0.22 });
  add('cardboardBox', `${CAR}box.glb`, { scale: 1.3, value: 0.3 });
  add('tire', `${CAR}debris-tire.glb`, { scale: 1.3, value: 0.35 });
  add('nut', `${CAR}debris-nut.glb`, { scale: 3, value: 0.08 });
  add('bolt', `${CAR}debris-bolt.glb`, { scale: 3, value: 0.08 });

  // --- Road furniture -----------------------------------------------------------------------------------------------
  add('barrier', `${ROAD}construction-barrier.glb`, { scale: 7, value: 0.6 });
  add('streetLight', `${ROAD}light-square.glb`, { scale: 10, radius: 0.6, value: 1.3 });
  add('streetLightCurved', `${ROAD}light-curved.glb`, { scale: 10, radius: 0.6, value: 1.3 });
  add('trafficLight', `${ROAD}traffic-light.glb`, { scale: 10, radius: 0.5, value: 1.6 });
  add('dumpster', `${ROAD}dumpster.glb`, { scale: 7, value: 3 });
  add('stopSign', `${ROAD}road-sign-stop.glb`, { scale: 9, radius: 0.5, value: 0.9 });
  add('warnSign', `${ROAD}road-sign-warning.glb`, { scale: 9, radius: 0.5, value: 0.9 });

  // --- People (Blocky Characters; native +Z, walk +X) -----------------------------------------------------------------
  PPL_FILES.forEach((n, i) => add(`person${n.toUpperCase()}`, `${PPL}character-${n}.glb`, {
    rotY: Math.PI / 2, height: 1.75, value: 0.45, move: { type: 'walk', speed: 1.4 + (i % 3) * 0.2, range: 10 + (i % 2) * 6 },
  }));

  // --- Trees -----------------------------------------------------------------------------------------------------------
  const tree = (name, file, h, col, value = 3, extra = {}) =>
    add(name, `${NAT}${file}.glb`, { height: h, colors: col, sway: 'tree', value, surface: 'foliage', textureStrength: 0.25, ...extra });
  tree('treeA', 'tree_default', 6.2, leaves('#45b04a')); tree('treeB', 'tree_oak', 6.8, leaves('#3f9a45'), 3.4);
  tree('treeC', 'tree_fat', 5.4, leaves('#6cc04a'), 2.8); tree('treeD', 'tree_simple', 6, leaves('#58b850'), 2.4);
  tree('treeE', 'tree_detailed', 7.4, leaves('#3a9a48'), 4); tree('treeF', 'tree_thin', 6.4, leaves('#7cc542'), 2.6);
  tree('treeBlossom', 'tree_default', 6, leaves('#f6a9c8'), 3); tree('treeAutumn', 'tree_oak', 6.4, leaves('#f08a2a'), 3.2);
  tree('treeSmall', 'tree_small', 3.8, leaves('#5cbc4e'), 1.3); tree('pine', 'tree_pineTallA', 8.4, leaves('#3f9a45', '#2f8a3c'), 3.6);
  tree('pineRound', 'tree_pineRoundA', 7.2, leaves('#3f9a45', '#2c7f3a'), 3.2);
  add('suburbTree', `${SUB}tree-large.glb`, { height: 6.5, sway: 'tree', value: 2.2, radius: 1.1 });
  add('suburbTreeSmall', `${SUB}tree-small.glb`, { height: 4.4, sway: 'tree', value: 1.2, radius: 0.8 });

  // --- Garden / nature props -----------------------------------------------------------------------------------------------
  const nat = (name, file, o = {}) => add(name, `${NAT}${file}.glb`, { colors: NATURE, ...o });
  nat('flowerRed', 'flower_redA', { scale: 3.2, value: 0.12 }); nat('flowerYellow', 'flower_yellowA', { scale: 3.2, value: 0.12 });
  nat('flowerPurple', 'flower_purpleA', { scale: 3.2, value: 0.12 }); nat('flowerRed2', 'flower_redB', { scale: 3, value: 0.12 });
  nat('flowerYellow2', 'flower_yellowB', { scale: 3, value: 0.12 }); nat('flowerPurple2', 'flower_purpleB', { scale: 3, value: 0.12 });
  nat('mushroomRed', 'mushroom_red', { scale: 3.2, value: 0.15 }); nat('mushroomTan', 'mushroom_tan', { scale: 3.2, value: 0.15 });
  nat('pumpkin', 'crop_pumpkin', { scale: 2, value: 0.3 }); nat('melon', 'crop_melon', { scale: 2, value: 0.3 });
  nat('carrot', 'crop_carrot', { scale: 2.6, value: 0.2 });
  nat('rockSmall', 'rock_smallA', { scale: 2.2, value: 0.15 }); nat('rockFlat', 'rock_smallC', { scale: 2.4, value: 0.15 });
  nat('stoneSmall', 'stone_smallA', { scale: 2.2, value: 0.2 }); nat('stoneSmall2', 'stone_smallD', { scale: 2.2, value: 0.2 });
  nat('rockLarge', 'rock_largeA', { scale: 3.4, value: 1.6 }); nat('rockTall', 'rock_tallA', { scale: 3.4, value: 1.8 });
  nat('stump', 'stump_round', { scale: 3, value: 0.35 }); nat('log', 'log', { scale: 2.6, value: 0.6 });
  nat('flowerPot', 'pot_small', { scale: 3, value: 0.3 }); nat('woodSign', 'sign', { scale: 3.2, value: 0.3 });
  nat('grassTuft', 'grass_large', { scale: 3, value: 0.1 });
  nat('bushSmall', 'plant_bushSmall', { scale: 3.4, value: 0.3, sway: 'tree' }); nat('bush', 'plant_bush', { scale: 3.4, value: 0.35, sway: 'tree' });
  nat('bushLarge', 'plant_bushLarge', { scale: 4.2, value: 0.9, sway: 'tree' }); nat('bushDetailed', 'plant_bushDetailed', { scale: 4, value: 1.0, sway: 'tree' });
  nat('campfire', 'campfire_stones', { scale: 4, value: 0.9 }); nat('tent', 'tent_smallOpen', { scale: 5.5, value: 4 });
  nat('picketFence', 'fence_simple', { scale: 4.4, value: 0.6 });
  nat('obelisk', 'statue_obelisk', { scale: 12, value: 14, radius: 2.2 });
  add('planter', `${SUB}planter.glb`, { scale: 4, value: 0.9 });
  add('fenceLow', `${SUB}fence-low.glb`, { scale: 4.5, value: 1.4 });
  add('fenceYard', `${SUB}fence-1x3.glb`, { scale: 5, value: 1.6 });

  // --- Procedural gap-fillers (the kits have no mailboxes, benches or balls) -----------------------------------------------
  const proc = (name, parts, opts = {}) => { P[name] = makeProto(name, parts, opts); };
  proc('mailbox', [cyl(0.07, 0.07, 1.1, '#7a4a28', { y: 0.55, segments: 6 }), rbox(0.5, 0.36, 0.8, '#3f7fd6', { y: 1.2, segments: 1 }), box(0.06, 0.3, 0.06, '#d9382b', { x: 0.27, y: 1.4, z: 0.2 })], { value: 0.5 });
  proc('hydrant', [cyl(0.3, 0.34, 0.8, '#d9382b', { y: 0.4, segments: 10 }), sphere(0.3, '#d9382b', { y: 0.85, segments: 10, rings: 6 }), cyl(0.12, 0.12, 0.7, '#b8bec4', { y: 0.5, rz: Math.PI / 2, segments: 8 })], { value: 0.7 });
  proc('trashCan', [cyl(0.42, 0.36, 1.0, '#5b6b78', { y: 0.5, segments: 12 }), cyl(0.46, 0.46, 0.1, '#3f4a54', { y: 1.05, segments: 12 })], { value: 0.6 });
  proc('bench', [rbox(2, 0.14, 0.6, '#c99a5b', { y: 0.55, segments: 1 }), rbox(2, 0.5, 0.12, '#c99a5b', { y: 0.95, z: -0.28, segments: 1 }),
    box(0.12, 0.55, 0.5, '#3a3f45', { x: -0.85, y: 0.27 }), box(0.12, 0.55, 0.5, '#3a3f45', { x: 0.85, y: 0.27 })], { value: 1.1 });
  proc('soccerBall', [sphere(0.34, '#f5f5f5', { segments: 10, rings: 7, y: 0.34 }), sphere(0.345, '#2a2a2e', { segments: 5, rings: 3, y: 0.34, sx: 0.6, sz: 0.6, sy: 1.02 })], { value: 0.3 });
  proc('gnome', [cyl(0.2, 0.26, 0.45, '#3f7fd6', { y: 0.22, segments: 8 }), sphere(0.17, '#f1c8a0', { y: 0.55, segments: 8, rings: 5 }),
    cyl(0.01, 0.2, 0.42, '#d9382b', { y: 0.85, segments: 8 }), sphere(0.12, '#f5f5f5', { y: 0.45, z: 0.12, segments: 6, rings: 4 })], { value: 0.3 });
  return P;
}
