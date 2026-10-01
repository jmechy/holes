import * as THREE from 'three';

/** Resolve optional per-map lighting while keeping every existing theme's defaults. */
export function getLightingConfig(map = {}) {
  const config = map.lighting ?? {};
  const direction = config.sunDirection ?? [40, 60, 25];
  const hemiSky = config.hemiSkyColor ?? new THREE.Color(map.skyColor ?? '#87c8ef').lerp(new THREE.Color(0xffffff), 0.55);
  const hemiGround = config.hemiGroundColor ?? new THREE.Color(map.groundColor ?? '#75a85c').lerp(new THREE.Color(0xffffff), 0.3);
  return {
    sunDirection: new THREE.Vector3(...direction).normalize(),
    sunColor: new THREE.Color(config.sunColor ?? map.lightColor ?? '#ffffff'),
    sunIntensity: config.sunIntensity ?? 0.76 * Math.PI,
    hemiSkyColor: new THREE.Color(hemiSky),
    hemiGroundColor: new THREE.Color(hemiGround),
    hemiIntensity: config.hemiIntensity ?? (map.ambient ?? 0.6) * Math.PI * 0.9,
    shadowOpacity: config.shadowOpacity ?? 1,
    environmentIntensity: config.environmentIntensity ?? 0.3,
    shadowRadius: config.shadowRadius ?? 2.5,
    exposure: config.exposure ?? 0.95,
  };
}

// Build a compact, map-tinted environment for subtle reflections. The generated
// pixels are linear-light values, so the DataTexture is explicitly tagged as
// LinearSRGBColorSpace rather than being decoded as display sRGB a second time.
export function createSkyEnvironment(renderer, map) {
  if (!renderer || !map || map.stars) return null;

  const width = 256;
  const height = 128;
  const pixels = new Uint8Array(width * height * 4);
  const sky = new THREE.Color(map.skyColor ?? '#87c8ef');
  const ground = new THREE.Color(map.groundColor ?? '#75a85c');
  const { sunColor, sunDirection } = getLightingConfig(map);
  const direction = new THREE.Vector3();

  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    // DataTexture row zero is v=0 (south); equirectUv maps the north pole to v=1.
    const latitude = (v - 0.5) * Math.PI;
    const cosLatitude = Math.cos(latitude);
    for (let x = 0; x < width; x++) {
      const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2;
      direction.set(
        cosLatitude * Math.cos(longitude),
        Math.sin(latitude),
        cosLatitude * Math.sin(longitude),
      );

      // A narrow horizon transition keeps the lower hemisphere grounded while
      // retaining enough sky light for glossy surfaces.
      const horizon = THREE.MathUtils.smoothstep(direction.y, -0.035, 0.055);
      const col = ground.clone().lerp(sky, horizon);
      const sunDot = Math.max(0, direction.dot(sunDirection));
      const glow = 0.24 * Math.pow(sunDot, 48) + 0.075 * Math.pow(sunDot, 9);
      col.r += sunColor.r * glow;
      col.g += sunColor.g * glow;
      col.b += sunColor.b * glow;

      const i = (y * width + x) * 4;
      pixels[i] = Math.round(THREE.MathUtils.clamp(col.r, 0, 1) * 255);
      pixels[i + 1] = Math.round(THREE.MathUtils.clamp(col.g, 0, 1) * 255);
      pixels[i + 2] = Math.round(THREE.MathUtils.clamp(col.b, 0, 1) * 255);
      pixels[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;

  let generator;
  try {
    generator = new THREE.PMREMGenerator(renderer);
    return generator.fromEquirectangular(texture);
  } finally {
    texture.dispose();
    generator?.dispose();
  }
}
