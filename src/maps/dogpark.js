import { buildProtos } from '../objects/dogpark.js';

const POND = { x: 60, z: -55, r: 20 };
const AGILITY = [-105, -45, 45, 105]; // fenced agility area
const PICNIC = [30, 100, 30, 100];

let routeMain, routeCross, routeEntry;
let LOT = [], SIDE = [];
const LOT_RECT = { cx: -35, cz: -80, w: 44, d: 22 };
const ROAD_Z = -101;
const inLotZone = (x, z) => (Math.abs(x - LOT_RECT.cx) < LOT_RECT.w / 2 + 3 && Math.abs(z - LOT_RECT.cz) < LOT_RECT.d / 2 + 3) || (z < ROAD_Z + 6 && z > ROAD_Z - 8);

// Winding path centreline
const pathX = (t) => t;
const pathZ = (t) => 26 * Math.sin(t / 22) + 8 * Math.sin(t / 9);

export default {
  id: 'dogpark',
  name: 'Dog Park',
  description: 'Gobble bones, balls and a whole pack of pups!',
  cardColor: '#7ac943',
  emoji: '🐶',
  size: 120,
  groundColor: '#63c04a',
  skyColor: '#a8e0ff',
  fogColor: '#c4ecff',
  lightColor: '#fffbe6',
  ambient: 0.65,
  // Warm sunny park afternoon: golden sun from the west, fresh blue-green sky fill, soft grounded shadows.
  lighting: {
    sunDirection: [-45, 58, 30], sunColor: '#fff0cc', sunIntensity: 0.76 * Math.PI,
    hemiSkyColor: '#bfe6ff', hemiGroundColor: '#7fa85a', hemiIntensity: 0.6 * Math.PI,
    shadowOpacity: 0.72, shadowRadius: 3.0, environmentIntensity: 0.26, exposure: 1.03,
  },
  postProcessing: { aoRadius: 0.42, aoStrength: 0.15 },
  groundStyle: 'grass',
  edge: 'hedge',
  sky: { top: '#5aaef5', horizon: '#c9efff' },
  clouds: true,
  backdrop: [{ type: 'hills', color: '#4fa040', color2: '#3f8a3a' }, { type: 'forest', color: '#4a9a3a', color2: '#2f7a3a' }],
  buildProtos,

  decorate(ctx) {
    const { rect, circle, merge, addDecal, randRange } = ctx;
    const S = ctx.size;

    // Mown grass stripes and patches
    const stripes = [];
    for (let x = -S + 8; x < S; x += 24) stripes.push(rect(x, 0, 12, S * 2));
    addDecal(merge(stripes), '#6fcd54', { style: 'grass' });
    const patches = [];
    for (let i = 0; i < 30; i++) patches.push(circle(randRange(-S, S), randRange(-S, S), randRange(3, 8), 14));
    addDecal(merge(patches), '#58b040', { style: 'grass' });

    // Winding gravel path (chain of rotated rects) + a crossing path
    const segs = [];
    const step = 4;
    for (let t = -S; t < S; t += step) {
      const x0 = pathX(t), z0 = pathZ(t), x1 = pathX(t + step), z1 = pathZ(t + step);
      const rot = -Math.atan2(z1 - z0, x1 - x0);
      segs.push(rect((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 1.2, 6, rot));
    }
    for (let t = -S; t < S; t += step) {
      const x0 = 40 * Math.sin(t / 25) - 20, x1 = 40 * Math.sin((t + step) / 25) - 20;
      const rot = -Math.atan2(step, x1 - x0);
      segs.push(rect((x0 + x1) / 2, t + step / 2, Math.hypot(x1 - x0, step) + 1.2, 5, rot));
    }
    addDecal(merge(segs), '#c9bfa8', { style: 'sand' });

    // Ice-cream cart routes: along the winding path and the crossing path (ping-pong)
    const mainPts = [], crossPts = [];
    for (let t = -S + 12; t <= S - 12; t += 6) {
      mainPts.push([pathX(t), pathZ(t)]);
      if (t <= 90) crossPts.push([40 * Math.sin(t / 25) - 20, t]); // stops short of the fenced agility area
    }
    routeMain = ctx.addRoute(mainPts, { loop: false, width: 3 });
    routeCross = ctx.addRoute(crossPts, { loop: false, width: 3 });
    const gravel = [];
    for (let i = 0; i < 160; i++) {
      const t = randRange(-S, S);
      gravel.push(rect(pathX(t) + randRange(-1, 1), pathZ(t) + randRange(-2.4, 2.4), 0.6, 0.6, randRange(0, 3)));
    }
    addDecal(merge(gravel), '#a89e88', { style: 'sand' });

    // Entrance road along the north edge, car park below it, driveway and a footpath into the park
    routeEntry = ctx.addRoute([[-108, ROAD_Z], [108, ROAD_Z]], { loop: false, width: 8 });
    addDecal(merge([rect(0, ROAD_Z, 240, 8), rect(LOT_RECT.cx, -95.5, 8, 6)]), '#3c3f45', { style: 'asphalt' });
    addDecal(merge([rect(0, ROAD_Z - 4.25, 240, 0.5), rect(0, ROAD_Z + 4.25, 240, 0.5)]), '#d8d8d8');
    const dashes = [];
    for (let x = -110; x < 110; x += 6) dashes.push(rect(x, ROAD_Z, 3, 0.35));
    addDecal(merge(dashes), '#f2c230');
    const zebra = [];
    for (let i = -3; i <= 3; i++) zebra.push(rect(LOT_RECT.cx + 12 + i * 1.1, ROAD_Z, 0.6, 7));
    addDecal(merge(zebra), '#f2f2f2');
    LOT = ctx.parkingLot(LOT_RECT.cx, LOT_RECT.cz, LOT_RECT.w, LOT_RECT.d, { rotY: 0 });
    SIDE = ctx.roadsideSpots(routeEntry, { side: 'right', spacing: 6.5 }).filter((sp) => Math.abs(sp.x - LOT_RECT.cx) > 8 && Math.abs(sp.x - (LOT_RECT.cx + 12)) > 5);
    addDecal(rect(LOT_RECT.cx, -47, 5, 46), '#c9bfa8', { style: 'sand' }); // path from the car park into the park
    // paw prints along the path, flower beds, manhole
    const paws = [];
    for (let i = 0; i < 12; i++) paws.push(circle(LOT_RECT.cx + (i % 2 ? 0.8 : -0.8), -66 + i * 3.4, 0.35, 8));
    addDecal(merge(paws), '#a89e88');
    addDecal(merge([circle(-8, -95, 1.6, 12), circle(20, -95.5, 1.6, 12)]), '#ff8fb0');
    addDecal(circle(30, ROAD_Z + 1.5, 0.6, 12), '#2a2c30');

    // Pond with shore
    addDecal(circle(POND.x, POND.z, POND.r + 2.5, 28), '#d8c690', { style: 'sand' });
    addDecal(circle(POND.x, POND.z, POND.r, 28), '#4aa3e8', { style: 'water' });
    addDecal(circle(POND.x - 4, POND.z + 3, POND.r * 0.55, 20), '#6cbcf2', { style: 'water' });
    addDecal(merge([circle(POND.x + 8, POND.z + 6, 1.2, 10), circle(POND.x - 9, POND.z - 4, 1.0, 10), circle(POND.x + 3, POND.z - 10, 1.3, 10)]), '#3f9a4a');

    // Fenced agility area: sandy-rubber floor + white boundary lines
    const [x0, x1, z0, z1] = AGILITY;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    addDecal(rect(cx, cz, w, d), '#78c95a', { style: 'grass' });
    addDecal(merge([rect(cx, z0, w, 0.6), rect(cx, z1, w, 0.6), rect(x0, cz, 0.6, d), rect(x1, cz, 0.6, d)]), '#ffffff');
    const posts = [];
    for (let x = x0; x <= x1; x += 4) posts.push(rect(x, z0, 0.7, 0.7), rect(x, z1, 0.7, 0.7));
    for (let z = z0; z <= z1; z += 4) posts.push(rect(x0, z, 0.7, 0.7), rect(x1, z, 0.7, 0.7));
    addDecal(merge(posts), '#8f6a38');
    // course numbers as coloured start/finish pads
    addDecal(merge([rect(x0 + 6, cz, 4, 4), rect(x1 - 6, cz, 4, 4)]), '#f28a1a');

    // Picnic lawn blanket + sandbox
    addDecal(merge([rect(70, 65, 14, 10), rect(95, 88, 10, 8)]), '#e8534a');
    addDecal(merge([rect(70, 65, 12, 1.2), rect(95, 88, 8, 1.2)]), '#ffffff');
    addDecal(rect(-20, -55, 16, 16), '#e6d69a', { style: 'sand' });
    const beds = [];
    for (let i = 0; i < 10; i++) beds.push(circle(-60 + (i % 5) * 2, 8 + Math.floor(i / 5) * 2, 0.7, 8));
    addDecal(merge(beds), '#ff6a8a');
    void S;
  },

  populate(ctx) {
    const { place, randRange, rand, size: S } = ctx;
    const inPond = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5;
    const put = (name, x, z, rot, sc = 1) => !inPond(x, z) && !inLotZone(x, z) && place(name, x, z, rot, sc);
    const scatter = (name, n, [x0, x1, z0, z1], sMin = 1, sMax = 1, tries = 30) => {
      for (let i = 0; i < n; i++) {
        for (let t = 0; t < tries; t++) {
          if (put(name, randRange(x0, x1), randRange(z0, z1), undefined, randRange(sMin, sMax))) break;
        }
      }
    };
    const ALL = [-S + 3, S - 3, -S + 3, S - 3];
    const START = [-28, 28, -28, 28];

    // Dense ring of tiny starters around spawn (6-24 units out)
    const ring = (name, n) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < 12; t++) {
        const a = rand() * Math.PI * 2, d = randRange(6, 24);
        if (put(name, Math.cos(a) * d, Math.sin(a) * d, undefined, 1)) break;
      }
    };
    const STARTER = () => { ring('tennisBall', 12); ring('bone', 10); ring('frisbeeRed', 5); ring('frisbeeBlue', 4); ring('chewRope', 5); ring('squeakyToy', 5); ring('foodBowl', 4); ring('waterBowl', 3); ring('puppy', 3); ring('bush', 4); };

    // --- Car park + roadside parking (cars only in stalls / along the curb)
    const carNames = ['car', 'carBlue', 'carYellow', 'carGreen', 'carWhite'];
    LOT.forEach((sp) => ctx.rand() < 0.72 && ctx.placeParked(ctx.pick(carNames), sp));
    SIDE.forEach((sp) => ctx.rand() < 0.6 && ctx.placeParked(ctx.pick(carNames), sp));
    place('parkSign', LOT_RECT.cx + 13, -91.5, 0, 1);
    ctx.placeOnRoute('carBlue', routeEntry, { count: 2, speed: 5, offset: 1.6, speedJitter: 0.15 });

    // --- Huge landmarks
    place('giantDoghouse', -75, -75, 0, 1);
    place('boneStatue', 0, -45, 0, 1);
    place('boneStatue', 20, 70, 0, 1);
    place('gazebo', -35, 15, 0, 1);
    place('gazebo', 85, 20, 0, 1);

    // --- Large: trees, wash station, carts
    scatter('treeBig', 10, ALL);
    scatter('tree', 24, ALL);
    scatter('treeBlossom', 12, ALL);
    scatter('pineTree', 12, ALL);
    scatter('dogWash', 4, [-30, 60, -110, -70]);
    place('dogWash', -10, 40, 0, 1);
    scatter('iceCreamCart', 2, ALL, 1, 1, 30);
    ctx.placeOnRoute('iceCreamCart', routeMain, { count: 2, speed: 3, offset: 0.8, speedJitter: 0.15 });
    ctx.placeOnRoute('iceCreamCart', routeCross, { count: 1, speed: 3, offset: 0.8 });
    scatter('umbrellaTable', 6, PICNIC);
    scatter('doghouse', 12, ALL);
    scatter('picnicTable', 12, PICNIC);
    scatter('picnicTable', 4, ALL);

    // --- Agility area
    scatter('agilityJump', 12, AGILITY);
    scatter('tunnel', 6, AGILITY);
    scatter('seesaw', 4, AGILITY);
    scatter('weavePoles', 8, AGILITY);
    scatter('greatDane', 4, AGILITY);
    scatter('dalmatian', 3, AGILITY);
    scatter('corgi', 5, AGILITY);
    scatter('personHat', 4, AGILITY);

    // --- Benches and cans along the path
    for (let t = -S + 10; t < S - 8; t += 14) {
      const z = pathZ(t);
      place('bench', pathX(t), z + 5.8, 0, 1);
      place('trashCan', pathX(t + 6), z - 4.8, undefined, 1);
      place('hydrant', pathX(t + 9), z + 4.5, undefined, 1);
    }
    scatter('bench', 12, ALL);
    scatter('trashCan', 24, ALL);

    // --- Dogs
    scatter('greatDane', 10, ALL);
    scatter('dalmatian', 12, ALL);
    scatter('husky', 10, ALL);
    scatter('labYellow', 16, ALL);
    scatter('labChoc', 12, ALL);
    scatter('corgi', 20, ALL);
    scatter('poodle', 14, ALL);
    scatter('poodleWhite', 12, ALL);
    scatter('dachshund', 22, ALL);
    scatter('puppy', 16, ALL);
    scatter('puppyBlack', 12, ALL);

    // --- Owners
    scatter('person', 12, ALL);
    scatter('personRed', 10, ALL);
    scatter('personGreen', 10, ALL);
    scatter('personDress', 10, ALL);
    scatter('personHat', 10, ALL);

    // --- Pond ducks (on the water) and shore
    for (let i = 0; i < 6; i++) {
      const a = randRange(0, Math.PI * 2), d = randRange(2, 10);
      place('pondDuck', POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d, undefined, 1);
    }

    // --- Starter cluster near spawn
    scatter('tennisBall', 10, START, 1, 1, 12);
    scatter('bone', 8, START, 1, 1, 12);
    scatter('frisbeeRed', 5, START, 1, 1, 12);
    scatter('foodBowl', 4, START, 1, 1, 12);
    scatter('chewRope', 5, START, 1, 1, 12);
    scatter('puppy', 3, START, 1, 1, 12);
    scatter('squeakyToy', 4, START, 1, 1, 12);
    STARTER();

    // --- Small everywhere
    scatter('tennisBall', 60, ALL, 1, 1, 12);
    scatter('bone', 50, ALL, 1, 1, 12);
    scatter('frisbeeRed', 24, ALL, 1, 1, 12);
    scatter('frisbeeBlue', 24, ALL, 1, 1, 12);
    scatter('chewRope', 24, ALL, 1, 1, 12);
    scatter('squeakyToy', 24, ALL, 1, 1, 12);
    scatter('foodBowl', 24, ALL, 1, 1, 12);
    scatter('waterBowl', 20, ALL, 1, 1, 12);
    scatter('ballBucket', 14, ALL, 1, 1, 12);
    scatter('poopBag', 20, ALL, 1, 1, 12);
    scatter('sprinkler', 16, ALL, 1, 1, 12);
    scatter('bush', 30, ALL, 1, 1, 12);
    scatter('hydrant', 24, ALL, 1, 1, 12);
    void rand;
  },
};
