import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { holeUniforms, MAX_HOLES } from './Ground.js';

// AO reads the beauty depth: material overrides would lose dynamic hole discard.
const vertexShader = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const reconstruction = `
  varying vec2 vUv;
  uniform sampler2D tDepth;
  uniform mat4 inverseProjection, cameraWorld;
  uniform float aoRadius;
  uniform vec3 uHoles[${MAX_HOLES}];
  uniform int uHoleCount;
  vec3 viewPosition(vec2 uv, float depth) {
    vec4 p = inverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
  }
  vec3 positionAt(vec2 uv) { return viewPosition(uv, texture2D(tDepth, uv).r); }
  float holeMask(vec3 p) {
    vec3 world = (cameraWorld * vec4(p, 1.0)).xyz;
    float mask = 1.0;
    for (int i = 0; i < ${MAX_HOLES}; i++) {
      if (i >= uHoleCount) break;
      float rim = length(world.xz - uHoles[i].xy) - uHoles[i].z;
      mask *= smoothstep(0.15, aoRadius + 0.2, rim);
    }
    return mask;
  }
`;

function uniforms() {
  return {
    tDepth: { value: null }, inverseProjection: { value: new THREE.Matrix4() },
    cameraWorld: { value: new THREE.Matrix4() }, aoRadius: { value: 0.45 },
    uHoles: holeUniforms.uHoles, uHoleCount: holeUniforms.uHoleCount,
  };
}

class DepthAOPass extends Pass {
  constructor(camera, options) {
    super();
    this.camera = camera;
    this.radius = Number.isFinite(options.aoRadius) ? THREE.MathUtils.clamp(options.aoRadius, 0.1, 1.2) : 0.45;
    this.strength = Number.isFinite(options.aoStrength) ? THREE.MathUtils.clamp(options.aoStrength, 0, 0.3) : 0.16;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    });
    this.estimate = new ShaderPass({
      uniforms: { ...uniforms(), projection: { value: new THREE.Matrix4() }, texel: { value: new THREE.Vector2() } },
      vertexShader,
      fragmentShader: reconstruction + `
        uniform mat4 projection;
        uniform vec2 texel;
        void main() {
          float depth = texture2D(tDepth, vUv).r;
          vec3 p = viewPosition(vUv, depth);
          float viewDepth = -p.z;
          gl_FragColor = vec4(0.0, viewDepth, 0.0, 1.0);
          vec2 footprint = vec2(projection[0][0], projection[1][1]) * aoRadius * 0.5 / max(viewDepth, 0.1);
          float projectedRadius = length(footprint / texel);
          float mask = holeMask(p) * (1.0 - smoothstep(65.0, 110.0, viewDepth)) * smoothstep(0.75, 2.5, projectedRadius);
          if (depth >= 0.999999 || mask <= 0.0) return;
          // Choose the neighbor on the same surface at silhouette/depth boundaries.
          // Unlike screen derivatives this never crosses a 2x2 quad into the sky.
          vec3 left = p - positionAt(vUv - vec2(texel.x, 0.0));
          vec3 right = positionAt(vUv + vec2(texel.x, 0.0)) - p;
          vec3 down = p - positionAt(vUv - vec2(0.0, texel.y));
          vec3 up = positionAt(vUv + vec2(0.0, texel.y)) - p;
          vec3 dx = abs(left.z) < abs(right.z) ? left : right;
          vec3 dy = abs(down.z) < abs(up.z) ? down : up;
          vec3 crossed = cross(dx, dy);
          float normalLength = length(crossed);
          if (normalLength < 1e-8) return;
          vec3 n = crossed / normalLength;
          if (dot(n, -p) < 0.0) n = -n;
          // Close views retain a world-space radius, capped to bound the screen footprint.
          footprint *= min(1.0, 24.0 / max(projectedRadius, 1.0));
          float occlusion = 0.0;
          for (int i = 0; i < 6; i++) {
            float angle = float(i) * 1.0471975512;
            vec2 direction = vec2(cos(angle), sin(angle));
            for (int j = 0; j < 2; j++) {
              vec2 uv = vUv + direction * footprint * (float(j) * 0.5 + 0.5);
              if (any(lessThanEqual(uv, vec2(0.0))) || any(greaterThanEqual(uv, vec2(1.0)))) continue;
              float sampleDepth = texture2D(tDepth, uv).r;
              if (sampleDepth >= 0.999999) continue;
              vec3 q = viewPosition(uv, sampleDepth);
              vec3 delta = q - p;
              float distance = length(delta);
              if (distance < 0.015 || distance > aoRadius) continue;
              float elevation = max(0.0, dot(n, delta / distance) - 0.12);
              occlusion += elevation * (1.0 - distance / aoRadius) * holeMask(q);
            }
          }
          gl_FragColor.r = clamp(occlusion / 12.0 * 5.0, 0.0, 1.0) * mask;
        }`,
    });
    this.composite = new ShaderPass({
      uniforms: {
        ...uniforms(), tDiffuse: { value: null }, tAO: { value: this.target.texture },
        aoSize: { value: new THREE.Vector2() }, aoStrength: { value: this.strength },
      },
      vertexShader,
      fragmentShader: reconstruction + `
        uniform sampler2D tDiffuse, tAO;
        uniform vec2 aoSize;
        uniform float aoStrength;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float depth = texture2D(tDepth, vUv).r;
          vec3 p = viewPosition(vUv, depth);
          float mask = holeMask(p);
          if (depth >= 0.999999 || -p.z > 110.0 || mask <= 0.0 ||
              dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)) < 0.012) {
            gl_FragColor = color; return;
          }
          // Manual bilinear reconstruction with view-depth rejection: background AO
          // cannot leak across a foreground silhouette or the hole rim.
          vec2 cell = vUv * aoSize - 0.5;
          vec2 base = floor(cell), blend = fract(cell);
          float total = 0.0, weights = 0.0;
          for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 uv = (base + offset + 0.5) / aoSize;
            vec2 sampleAO = texture2D(tAO, uv).rg;
            vec2 bilinear = mix(vec2(1.0) - blend, blend, offset);
            float depthError = abs(sampleAO.g + p.z);
            float weight = bilinear.x * bilinear.y *
              (1.0 - smoothstep(aoRadius * 0.12, aoRadius * 0.5, depthError));
            total += sampleAO.r * weight; weights += weight;
          }
          float ao = weights > 0.0001 ? total / weights : 0.0;
          color.rgb *= 1.0 - aoStrength * ao * mask;
          gl_FragColor = color;
        }`,
    });
    for (const pass of [this.estimate, this.composite]) {
      pass.uniforms.uHoles = holeUniforms.uHoles;
      pass.uniforms.uHoleCount = holeUniforms.uHoleCount;
      pass.uniforms.aoRadius.value = this.radius;
      pass.material.depthTest = false;
      pass.material.depthWrite = false;
    }
    // ShaderPass clones texture uniforms; sample the live render target, not its clone.
    this.composite.uniforms.tAO.value = this.target.texture;
  }

  setSize(width, height) {
    const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
    this.target.setSize(w, h);
    this.estimate.uniforms.texel.value.set(1 / width, 1 / height);
    this.composite.uniforms.aoSize.value.set(w, h);
  }

  render(renderer, writeBuffer, readBuffer) {
    for (const pass of [this.estimate, this.composite]) {
      pass.uniforms.tDepth.value = readBuffer.depthTexture;
      pass.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);
      pass.uniforms.cameraWorld.value.copy(this.camera.matrixWorld);
    }
    this.estimate.uniforms.projection.value.copy(this.camera.projectionMatrix);
    this.estimate.render(renderer, this.target, readBuffer);
    this.composite.renderToScreen = this.renderToScreen;
    this.composite.render(renderer, writeBuffer, readBuffer);
  }

  dispose() {
    this.target.dispose();
    this.estimate.dispose();
    this.composite.dispose();
  }
}

// Cheap HDR bloom: bright-pass into a 1/4 res chain, 4-tap dual-filter downsample, additive tent upsample, then added to
// the beauty image before tone mapping (emissive parts are > 1 in the half-float target; lit surfaces stay below threshold).
const BLOOM_LEVELS = 4;
const BLOOM_DEFAULTS = { strength: 0.35, radius: 0.6, threshold: 1.0 };
const bloomVertex = vertexShader;
const bloomMaterial = (fragmentShader, uniformValues) => new THREE.ShaderMaterial({
  uniforms: uniformValues, vertexShader: bloomVertex, fragmentShader, depthTest: false, depthWrite: false,
});
class BloomPass extends Pass {
  constructor(options) {
    super();
    const o = { ...BLOOM_DEFAULTS, ...options };
    this.strength = Number.isFinite(o.strength) ? THREE.MathUtils.clamp(o.strength, 0, 3) : BLOOM_DEFAULTS.strength;
    this.radius = Number.isFinite(o.radius) ? THREE.MathUtils.clamp(o.radius, 0, 1) : BLOOM_DEFAULTS.radius;
    this.threshold = Number.isFinite(o.threshold) ? Math.max(0, o.threshold) : BLOOM_DEFAULTS.threshold;
    this.targets = [];
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.targets.push(new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      }));
    }
    this.quad = new FullScreenQuad();
    const sample4 = `
      uniform sampler2D tSource; uniform vec2 texel; varying vec2 vUv;
      vec3 box4(vec2 uv) {
        return (texture2D(tSource, uv + texel * vec2(-0.5, -0.5)).rgb + texture2D(tSource, uv + texel * vec2(0.5, -0.5)).rgb +
                texture2D(tSource, uv + texel * vec2(-0.5, 0.5)).rgb + texture2D(tSource, uv + texel * vec2(0.5, 0.5)).rgb) * 0.25;
      }`;
    // texel = source texel size. Two box4 rings make a wider, smoother first downsample.
    this.bright = bloomMaterial(sample4 + `
      uniform float threshold;
      vec3 bright(vec3 c) {
        c = min(c, vec3(12.0));
        float m = max(c.r, max(c.g, c.b));
        return c * (max(m - threshold, 0.0) / max(m, 1e-4));
      }
      void main() {
        vec3 sum = vec3(0.0);
        for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++)
          sum += bright(box4(vUv + texel * (vec2(float(x), float(y)) * 2.0 - 1.0)));
        gl_FragColor = vec4(sum * 0.25, 1.0);
      }`, { tSource: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: this.threshold } });
    this.down = bloomMaterial(sample4 + `void main() { gl_FragColor = vec4(box4(vUv), 1.0); }`,
      { tSource: { value: null }, texel: { value: new THREE.Vector2() } });
    this.up = bloomMaterial(`
      uniform sampler2D tSource; uniform vec2 texel; uniform float weight; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tSource, vUv).rgb * 4.0;
        c += texture2D(tSource, vUv + texel * vec2(-1.0, 0.0)).rgb * 2.0 + texture2D(tSource, vUv + texel * vec2(1.0, 0.0)).rgb * 2.0;
        c += texture2D(tSource, vUv + texel * vec2(0.0, -1.0)).rgb * 2.0 + texture2D(tSource, vUv + texel * vec2(0.0, 1.0)).rgb * 2.0;
        c += texture2D(tSource, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tSource, vUv + texel * vec2(1.0, -1.0)).rgb;
        c += texture2D(tSource, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tSource, vUv + texel * vec2(1.0, 1.0)).rgb;
        gl_FragColor = vec4(c / 16.0 * weight, 1.0);
      }`, { tSource: { value: null }, texel: { value: new THREE.Vector2() }, weight: { value: 1 } });
    this.up.blending = THREE.CustomBlending;
    this.up.blendEquation = THREE.AddEquation;
    this.up.blendSrc = THREE.OneFactor;
    this.up.blendDst = THREE.OneFactor;
    this.composite = bloomMaterial(`
      uniform sampler2D tDiffuse, tBloom; uniform float strength; varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        color.rgb += texture2D(tBloom, vUv).rgb * strength;
        gl_FragColor = color;
      }`, { tDiffuse: { value: null }, tBloom: { value: this.targets[0].texture }, strength: { value: this.strength } });
    this.needsSwap = true;
  }

  setSize(width, height) {
    let w = width, h = height;
    this.sourceSize = [width, height];
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      w = Math.max(1, Math.ceil(w / (i === 0 ? 4 : 2)));
      h = Math.max(1, Math.ceil(h / (i === 0 ? 4 : 2)));
      this.targets[i].setSize(w, h);
    }
  }

  pass(renderer, material, target, clear = true) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.autoClear = false;
    if (clear) renderer.clear(true, false, false);
    this.quad.render(renderer);
  }

  render(renderer, writeBuffer, readBuffer) {
    const autoClear = renderer.autoClear;
    const t = this.targets;
    this.bright.uniforms.tSource.value = readBuffer.texture;
    this.bright.uniforms.texel.value.set(1 / this.sourceSize[0], 1 / this.sourceSize[1]);
    this.pass(renderer, this.bright, t[0]);
    for (let i = 1; i < BLOOM_LEVELS; i++) {
      this.down.uniforms.tSource.value = t[i - 1].texture;
      this.down.uniforms.texel.value.set(1 / t[i - 1].width, 1 / t[i - 1].height);
      this.pass(renderer, this.down, t[i]);
    }
    // Radius shifts weight toward the coarser levels (wider glow).
    for (let i = BLOOM_LEVELS - 1; i > 0; i--) {
      this.up.uniforms.tSource.value = t[i].texture;
      this.up.uniforms.texel.value.set(1 / t[i].width, 1 / t[i].height);
      this.up.uniforms.weight.value = THREE.MathUtils.lerp(0.45, 1.0, this.radius);
      this.pass(renderer, this.up, t[i - 1], false);
    }
    this.composite.uniforms.tDiffuse.value = readBuffer.texture;
    this.composite.uniforms.strength.value = this.strength;
    this.quad.material = this.composite;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
    renderer.autoClear = autoClear;
  }

  dispose() {
    for (const t of this.targets) t.dispose();
    for (const m of [this.bright, this.down, this.up, this.composite]) m.dispose();
    this.quad.dispose();
  }
}

/** High-quality map pipeline. setSize accepts CSS dimensions, as renderer.setSize does. */
export class MapPostProcessing {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.camera = camera;
    this.size = new THREE.Vector2();
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedInt248Type),
    });
    target.depthTexture.format = THREE.DepthStencilFormat;
    this.composer = new EffectComposer(renderer, target);
    // Physical dimensions below already include the renderer pixel ratio.
    this.composer.setPixelRatio(1);
    this.beauty = new RenderPass(scene, camera);
    this.ao = new DepthAOPass(camera, options);
    // options.bloom: { strength, radius, threshold } | false. Subtle default; emissive parts (> threshold) glow.
    this.bloom = options.bloom === false ? null : new BloomPass(options.bloom === true ? {} : options.bloom);
    this.output = new OutputPass();
    // Canvas MSAA does not cover offscreen targets. Smooth edges after output conversion.
    this.antialias = new ShaderPass(FXAAShader);
    this.antialias.material.toneMapped = false;
    this.composer.addPass(this.beauty);
    this.composer.addPass(this.ao);
    if (this.bloom) this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.antialias);
    renderer.getSize(this.size);
    this.setSize(this.size.x, this.size.y);
  }

  setSize(w, h) {
    const ratio = this.renderer.getPixelRatio();
    this.width = Math.max(1, Math.floor(w * ratio));
    this.height = Math.max(1, Math.floor(h * ratio));
    this.composer.setSize(this.width, this.height);
    this.antialias.uniforms.resolution.value.set(1 / this.width, 1 / this.height);
  }

  render() {
    // Covers quality/pixel-ratio changes even when no browser resize occurs.
    this.renderer.getDrawingBufferSize(this.size);
    if (this.width !== this.size.x || this.height !== this.size.y) {
      this.width = this.size.x; this.height = this.size.y;
      this.composer.setSize(this.width, this.height);
      this.antialias.uniforms.resolution.value.set(1 / this.width, 1 / this.height);
    }
    this.composer.render();
  }

  dispose() {
    this.beauty.dispose();
    this.ao.dispose();
    this.bloom?.dispose();
    this.output.dispose();
    this.antialias.dispose();
    this.composer.dispose();
  }
}

export { MapPostProcessing as RomePostProcessing };
export default MapPostProcessing;
