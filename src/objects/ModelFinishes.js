import { TEXTURE_LAYERS } from './TextureLibrary.js';

const profiles = {
  rome: { glass: [0.12, 0.14], paint: [0.29, 0.08], stucco: [0.94, 0], stone: [0.88, 0], fabric: [0.92, 0], rubber: [0.97, 0] },
  coastal: { glass: [0.14, 0.12], paint: [0.32, 0.08], stucco: [0.93, 0], stone: [0.86, 0], fabric: [0.91, 0], rubber: [0.97, 0], wood: [0.81, 0] },
  urban: { glass: [0.1, 0.16], paint: [0.3, 0.08], stucco: [0.9, 0], stone: [0.92, 0], brick: [0.93, 0], roof: [0.85, 0], wood: [0.82, 0], metal: [0.45, 0.35], rubber: [0.97, 0], fabric: [0.92, 0] },
  industrial: { glass: [0.16, 0.12], paint: [0.42, 0.12], metal: [0.36, 0.55], stone: [0.9, 0], brick: [0.92, 0], roof: [0.6, 0.2], wood: [0.85, 0], rubber: [0.97, 0], fabric: [0.92, 0] },
  park: { foliage: [0.94, 0], fabric: [0.93, 0], wood: [0.86, 0], paint: [0.4, 0.05], stone: [0.9, 0], stucco: [0.92, 0], brick: [0.92, 0], rubber: [0.97, 0], metal: [0.55, 0.2], glass: [0.15, 0.1] },
  lunar: { metal: [0.26, 0.7], paint: [0.3, 0.3], glass: [0.08, 0.2], rubber: [0.95, 0], fabric: [0.6, 0.2], stone: [0.98, 0], stucco: [0.98, 0], roof: [0.4, 0.45] },
  voxel: { stone: [0.95, 0], stucco: [0.95, 0], brick: [0.95, 0], roof: [0.95, 0], wood: [0.95, 0], metal: [0.9, 0], rubber: [0.97, 0], fabric: [0.95, 0], foliage: [0.95, 0], paint: [0.9, 0], glass: [0.85, 0] },
};
const finishes = Object.fromEntries(Object.entries(profiles).map(([name, profile]) => [name,
  new Map(Object.entries(profile).map(([surface, values]) => [TEXTURE_LAYERS[surface], values])),
]));

/** Adjust mixed finishes without splitting a prototype into additional draw calls. */
export function applyModelFinishes(proto, profile = 'coastal') {
  const { surface, textureInfo } = proto.geometry.attributes;
  const values = finishes[profile] ?? finishes.coastal;
  for (let i = 0; i < surface.count; i++) {
    const finish = values.get(textureInfo.getX(i));
    if (finish) surface.setXY(i, finish[0], finish[1]);
  }
  return proto;
}
