/*
 * MAP + OBJECT API  (all maps and theme object modules must follow this exactly)
 * ===========================================================================
 *
 * Registry
 *   MAPS (below) is an ordered array of map modules. ORDER = ADVENTURE ORDER.
 *   To add a map: create src/maps/<id>.js (+ src/objects/<theme>.js), import it here, append to MAPS.
 *
 * Object helpers  (src/objects/build.js)
 *   box(w,h,d,color,opts)            cyl(rTop,rBottom,h,color,opts)   (opts.segments default 20)
 *   cone(r,h,color,opts)  (default 20)   sphere(r,color,opts)  (default 20 x 14; opts.segments / opts.rings)
 *   torus(R,r,color,opts) (default 10 radial x 24 tube)
 *   rbox(w,h,d,color,opts)           rounded/beveled box: opts.bevel (default 12% of the smallest side, max 45%),
 *                                    opts.segments (default 2). Use for cars, buildings, furniture, signs.
 *   capsule(r,len,color,opts)        pill along Y, total length len+2r (opts.segments 16, opts.caps 6). Limbs, bottles.
 *   lathe(points,color,opts)         surface of revolution about Y; points = [[radius,y],...] listed BOTTOM -> TOP
 *                                    (y used as-is). Vases, domes, towers, bottles, lamp posts. opts.segments 20.
 *   extrude(shape,depth,color,opts)  shape = [[x,y],...] outline extruded `depth` along Z (centred on z=0);
 *                                    opts.bevel (default 0) rounds the edge. Arches, roof gables, signs, brackets;
 *                                    stand it up with opts.rx / opts.ry.
 *     opts = { x,y,z, rx,ry,rz, sx,sy,sz }  position / rotation (radians, XYZ order) / scale.
 *     y is the CENTRE of the primitive (a box of height h sitting on the ground uses y = h/2).
 *     Each returns a NON-indexed BufferGeometry with position/normal/color(baked per-vertex) attributes (uv dropped),
 *     so any mix of parts merges. Parts keep their OWN normals: round parts (cyl/cone/sphere/torus/capsule/lathe)
 *     are smooth-shaded, box/extrude stay crisp. Passing an explicit low count (opts.segments <= 8) keeps the old
 *     faceted look (flat normals) automatically; opts.flat = true|false forces either way.
 *     VERTEX BUDGET (per proto): tiny items <= ~1.5k verts, medium <= ~5k, large <= ~20k, landmarks <= ~60k.
 *     (makeProto console.warns in dev above 80k.) A default sphere is ~1.6k verts, a default cylinder 240: give
 *     small props explicit segments (e.g. sphere(r,c,{segments:10,rings:7})) and spend the budget on the big ones.
 *   makeProto(name, parts, opts?) -> { name, geometry, radius, height, value, move }
 *     - merges parts into ONE geometry (mergeGeometries), recentres bbox to x=z=0 and min y=0.
 *       Each part's own normals are kept (no flat-normal recompute).
 *     - radius = half of the larger XZ bbox extent. opts.radius overrides (e.g. tall thin things with wide overhang).
 *       Swallow rule uses radius: a hole needs r > radius*1.1 and centre within (hole.r - radius*0.3).
 *     - height = bbox height (units; the hole starts at radius 1.2).
 *     - value = opts.value ?? radius^2 * clamp(height,0.5,6) * 0.5.  Value is hole AREA gained when eaten
 *       (hole radius = sqrt(area/PI); start area ~= 4.52). Tune opts.value for pacing.
 *     - opts.move = { type: 'walk', speed: 1.5, range: 10 } makes EVERY placed instance a wandering mover
 *       (people, animals; models face +X). type 'drive' = free-roaming vehicle that turns gradually (optional
 *       turn: rad/s, default 1.8). speed in units/s, range = wander radius around the placement point (home).
 *       Walkers pick random targets inside range, pause 0.5-3s between walks, speed varies +-20%, stay inside the
 *       map, and run away (1.3x speed) from any hole within ~2x its radius that could swallow them.
 *       Movers pass through static objects and each other; they freeze while wobbling and stop once falling.
 *     Every object shares ONE material (exported as the live binding objectMaterial): MeshStandardMaterial
 *     (vertexColors, roughness 0.75, metalness 0) on Graphics=High, MeshLambertMaterial on Low. Objects taller than
 *     0.6 cast real sun shadows and all receive them (High only). Colours are sRGB hex strings.
 *   A theme module (e.g. src/objects/construction.js) exports buildProtos() -> { [protoName]: proto }.
 *   Vehicles etc. are modelled with length along X; each placed object gets a random Y rotation by default.
 *
 * Map module (src/maps/<id>.js) default-exports:
 *   {
 *     id, name, description,
 *     cardColor: '#f5a623',       // menu card colour
 *     emoji: '🚧',                // menu card emoji
 *     size: 120,                  // world half-extent; map spans [-size,size] in x and z
 *     groundColor, skyColor, fogColor,          // css colour strings
 *     lightColor?: '#ffffff', ambient?: 0.6,    // optional (sun colour / hemisphere-light strength)
 *     --- optional look & feel (all have good defaults; existing maps need none of them) ---
 *     groundStyle?: 'grass'|'dirt'|'sand'|'asphalt'|'concrete'|'regolith'|'voxel',
 *                       // procedural ground detail (world-space noise / patterns). Default = subtle noise.
 *                       // also picks the default map edge (see edge).
 *     sky?: { top, horizon },   // gradient sky dome colours. Default: horizon = fogColor, top = deeper skyColor.
 *                               // horizon also colours the fog. NOTE the game camera looks down at 62 degrees, so
 *                               // the sky itself is rarely in frame; the backdrop below is what players see.
 *     stars?: true,             // star field (moon / space maps); also makes the default backdrop 'space'.
 *     clouds?: bool,            // low-poly clouds drifting outside the map + soft cloud shadows on the ground.
 *                               // Default true unless stars is set.
 *     backdrop?: entry | [entry,...],  // scenery ring OUTSIDE the playable square (never swallowable):
 *                       //   entry = { type: 'hills'|'mountains'|'city'|'ocean'|'desert'|'space'|'forest',
 *                       //             color?, color2?, side?: 'north'|'south'|'east'|'west'|'all' (default all),
 *                       //             oceanSide?: 'north'|'south'|'east'|'west' }
 *                       //   north = -Z, south = +Z, east = +X, west = -X. Later entries with an explicit side win over
 *                       //   'all'. oceanSide turns that one side into ocean (e.g. { type:'mountains',
 *                       //   oceanSide:'south' } = mountains on 3 sides, sea to the south); with oceanSide the entry may
 *                       //   also carry oceanColor / sandColor.
 *                       //   color / color2 by type: hills grass/far-hill, mountains rock/snow, city building/ground,
 *                       //   ocean water/sand, desert sand/mesa, space rock/deep, forest ground/foliage.
 *                       //   Default (no field): 'hills' tinted from groundColor, or 'space' when stars is set.
 *                       //   Only the first ~30-60 units beyond the edge are ever near the camera: put the interesting
 *                       //   detail there. 'space' drops the terrain into a starfield with a little Earth.
 *     edge?: 'hedge'|'fence'|'barrier'|'rocks'|'blocks'|'curb'|'none',  // replaces the old plain wall. Default from
 *                       // groundStyle: grass hedge, dirt fence, sand/regolith rocks, asphalt/concrete barrier,
 *                       // voxel blocks, otherwise a red/white curb. (Holes are clamped inside by the engine.)
 *     buildProtos,                // from the theme objects module
 *     decorate?(ctx) {},          // flat NON-swallowable ground decals (roads, lines, craters)
 *     populate(ctx) {},           // place swallowable objects
 *   }
 *
 * ctx (passed to decorate() then populate(); same object)
 *   scene                  THREE.Scene
 *   protos                 result of buildProtos()
 *   size                   map half-extent
 *   rand()                 seeded PRNG in [0,1), deterministic per map id
 *   randRange(a,b)         seeded float in [a,b)
 *   pick(array)            seeded random element
 *   place(name,x,z,rotY=random,scale=1,opts?) -> boolean
 *        Adds a swallowable object. Returns false (and adds nothing) if it would overlap an existing
 *        object (circle test on radius*scale, 8% tolerance), leaves the map (|x|,|z| > size - radius - 1),
 *        or lies within 5 units of the player spawn at (0,0). Scaled objects get value * scale^3.
 *        opts (optional 6th arg) = { move } overrides the proto's move flag for this instance:
 *          { move: { type:'walk'|'drive', speed, range } }  make it a mover (e.g. a static prop that wanders),
 *          { move: null }                                   make it static even if the proto walks.
 *        STATIC (non-mover) objects are also REJECTED (return false) if their footprint circle touches a route
 *        corridor: distance(centre, route polyline) < radius*scale + route.width/2. Movers are exempt.
 *   addRoute(points, { loop=true, width=4, network='road' }) -> route
 *        points = [[x,z],...] world coords (>= 2), a polyline; loop:true closes it back to the first point.
 *        width = corridor width kept clear of static objects. Returns an opaque route handle. It draws nothing:
 *        paint the road yourself with addDecal. MUST be called in decorate() (or at least before any place()),
 *        because objects placed earlier are not re-checked; a console warning is logged otherwise.
 *   placeOnRoute(name, route, { count=1, speed=6, offset=0, speedJitter=0, scale=1 }) -> number placed
 *        Call from populate(). Places `count` instances evenly spaced along the route (random phase on loops)
 *        that drive it forever facing travel direction (+X of the model is forward), cutting corners smoothly.
 *        offset = lateral lane offset from the centreline, positive = RIGHT of the travel direction.
 *        speedJitter = +-fraction randomising each vehicle's speed (0.2 -> +-20%). Open roads prefer connected
 *        roads at endpoints, with U-turns where no continuation fits. Set network='water'|'air'|'rail' to keep
 *        non-road traffic on its original path. Spawns retry for vehicle clearance and obey the 5-unit spawn
 *        exclusion/map bounds. Traffic brakes and yields for other vehicles while maintaining lane footprints.
 *   addDecal(geometry,color,{ style }?) -> Mesh
 *        geometry must already be in WORLD coordinates lying flat at y=0. Rendered at y ~= 0.01 (each call
 *        stacks 0.002 higher so later decals draw over earlier ones) with a lit, shadow-receiving material hidden
 *        inside holes. Optional style = 'grass'|'dirt'|'sand'|'asphalt' (speckle)|'concrete' (paving joints every 4
 *        units)|'regolith'|'voxel'|'water' (animated ripples + glossy highlights); omit for a subtle noise tint.
 *        Roads -> 'asphalt', sidewalks/plazas -> 'concrete', lawns -> 'grass', ponds/rivers/sea -> 'water'.
 *   Extra helpers (flat geometries in world coords, for addDecal):
 *   rect(x,z,w,d,rotY=0)   circle(x,z,r,segments=24)   merge(arrayOfFlatGeometries) -> one geometry
 *        (merge many lane dashes / parking lines into ONE decal to save draw calls).
 *
 *   Parking helpers (call parkingLot / roadsideSpots in decorate(); placeParked in populate()):
 *   parkingLot(cx,cz,w,d,{ rotY=0, stallW=3, stallD=5.5, aisle=7, color, lineColor }) -> [{x,z,rotY}]
 *        Draws an asphalt lot (w along local X, d along local Z, rotated by rotY like rect) with painted stall lines
 *        (2 addDecal calls) and returns the stall spots: rows on both sides of central aisles, sized to fit w x d.
 *        Each spot's rotY makes a +X-forward car sit nose-in.
 *   roadsideSpots(route,{ side='right', spacing=7, gap=0.6, from=0, to=1, carWidth=2.2, maxTurn=0.5 }) -> [{x,z,rotY}]
 *        Parallel-parking spots along the curb OUTSIDE the route's corridor, car aligned with the road direction
 *        (facing travel). side = 'right'|'left' of travel; from/to = fraction of the route length. Skips spots near
 *        corners (heading change > maxTurn rad within ~1.2 spacing), outside the map, or inside another route's
 *        corridor. Call after all addRoute()s.
 *   placeParked(name,spot,opts?) -> boolean
 *        = place(name, spot.x, spot.z, spot.rotY, opts.scale ?? 1, { move: null, tight: true, ...opts }).
 *        `tight` lets neighbouring stalls' bounding circles overlap (opts.overlap, default 0.5 vs 0.92) and only
 *        needs the car's narrow half-width clear of a route corridor.
 *        Example:
 *          decorate(ctx) { R.main = ctx.addRoute([[-90,20],[90,20]], {loop:false, width:8});
 *                          LOT = ctx.parkingLot(60,-70, 50,30, {rotY:0}); SIDE = ctx.roadsideSpots(R.main,{side:'right'}); }
 *          populate(ctx) { LOT.forEach(s => ctx.rand() < 0.7 && ctx.placeParked(ctx.pick(['car','carBlue']), s));
 *                          SIDE.forEach(s => ctx.placeParked('car', s)); }
 *
 * Visual finishing (Rome-style)  -- optional, opt-in per map; see src/maps/rome.js + src/objects/rome.js
 *   Map fields:
 *     lighting?: { sunDirection:[x,y,z], sunColor, sunIntensity (~0.72*PI), hemiSkyColor, hemiGroundColor,
 *                  hemiIntensity (~0.6*PI), shadowOpacity (1), shadowRadius (2.5), environmentIntensity (0.3),
 *                  exposure (0.95) }   every field optional (defaults derived from skyColor/groundColor/ambient).
 *     postProcessing?: { aoRadius: 0.1-1.2 (0.45), aoStrength: 0-0.3 (0.16),
 *                        bloom?: { strength 0-3 (0.35), radius 0-1 (0.6), threshold (1.0) } | false }
 *         depth AO + bloom + FXAA, High graphics only. Bloom is a cheap HDR pass (1/4-res chain, runs before tone mapping):
 *         it is ON by default and subtle; only pixels brighter than `threshold` (emissive parts, strong speculars) glow,
 *         ordinary lit surfaces stay below 1.0. `bloom: false` disables it; omit fields to keep the defaults.
 *   Per-primitive `emissive: true | 0-3` opt (any primitive in build.js): the part shows its own vertex colour regardless of
 *     lighting (radiance = colour * strength * 1.8, HDR so it feeds bloom). ~1 = lit lamp / window, 1.3-2 = neon, flames, beacons.
 *     Stored per vertex (`glow` attribute; makeProto adds 0 for parts built elsewhere, e.g. glTF), survives merging, is excluded from
 *     baked AO darkening, and works in both High and Low materials (and fall/fade clones). To mark helper output built elsewhere:
 *     emissiveParts(parts, strength, color?) (build.js) sets it on existing parts, optionally only those of a given colour.
 *   Per-primitive `surface: 'name'` opt (+ optional textureStrength, textureRotation) selects a procedural detail
 *   texture baked into vertex attributes. Names (TEXTURE_LAYERS in src/objects/TextureLibrary.js):
 *     stone stucco brick roof wood metal rubber fabric foliage paint glass   (none = default)
 *   applyModelFinishes(proto, profile) (src/objects/ModelFinishes.js) sets per-surface [roughness, metalness] on the
 *   merged proto without extra draw calls. Profiles: 'rome' 'coastal' (default) 'urban' 'industrial' 'park' 'lunar'
 *   'voxel'. Call it on every proto, e.g. wrap `add` inside buildProtos():
 *     const P = {}, add = (name, parts, opts = {}) => {
 *       P[name] = applyModelFinishes(makeProto(name, parts, opts), 'urban');
 *     };
 *   articulate(geometry, kind, pivot, opts) (build.js) marks a part of a MOVER proto for rigid animation; the part's
 *   vertices rotate about `pivot` (proto-local, pre-recentring coords; makeProto re-offsets). Models face +X.
 *     'wheel'  opts { radius, front }     rolls with travel; front wheels also steer.
 *     'leg'    opts { side: +-1, hip }    swings about pivot; side flips the phase (biped: sides alternate).
 *     'shin'   opts { side, hip }         pivot = knee, hip = hip pos; flexes at the knee and follows the thigh.
 *     'arm'    opts { side }              swings opposite the legs.
 *     Quadrupeds: give leg/shin parts `phase: 0|1` INSTEAD of side. Diagonal pairs share a phase:
 *       front-left + back-right = 0, front-right + back-left = 1 (the pairs swing in anti-phase).
 *     'tail'   opts { amp? (1) }          gentle side-to-side wag about the vertical axis through pivot; wags faster
 *                                         while walking. Only animates once the mover has walked.
 *   Ambient sway: makeProto(name, parts, { sway: 'tree' | 'boat' }) makes static instances gently rock (trees/boats).
 *     Without the flag, legacy proto names (umbrellaPine, cypress, tree, palm*, oak*, gondola, sailboat...) still sway.
 *     Protos with windStart (vertex wind) skip tree sway.
 *   Facade helpers (src/objects/ModelDetails.js):
 *     facadeWall(w, h, thickness, color, openings = [{x,y,width,height}], opts {ry,x,y,z}) -> parts[]
 *         wall centred on X/Z, Y from its base, with real openings cut out (spread the array into makeProto parts).
 *     recessedWindow(w, h, depth, opts {frame, frameColor, glassColor, mullion, x,y,z,ry}) -> parts[]
 *         inset frame + glass pane + sill, window centred on Y, front face at local Z=0; put it in a facadeWall opening.
 *
 * Graphics setting (Settings -> Graphics High/Low, default High, persisted): High = pixel ratio min(dpr,2), 2048 PCF
 * sun shadows, Standard object material, procedural ground/water detail, cloud shadows; Low = pixel ratio 1.25,
 * no shadows, Lambert, fewer clouds/stars. Maps do not need to care.
 *
 * Guidance: target ~600-1200 objects; many tiny, fewer medium, a few huge. Place big things first so they
 * get room. Keep the smallest items with radius <= ~0.9 so they fit the starting hole (r=1.2).
 * Total value sum should let a lone player reach roughly radius 15-20 by the end.
 */
import construction from './construction.js';
import minecraft from './minecraft.js';
import dogpark from './dogpark.js';
import moon from './moon.js';
import newyork from './newyork.js';
import firestation from './firestation.js';
import airport from './airport.js';
import paris from './paris.js';
import tokyo from './tokyo.js';
import santabarbara from './santabarbara.js';
import venice from './venice.js';
import rome from './rome.js';
import neighborhood from './neighborhood.js';

export const MAPS = [construction, firestation, minecraft, dogpark, airport, paris, tokyo, newyork, santabarbara, moon, venice, rome, neighborhood];
export default MAPS;
