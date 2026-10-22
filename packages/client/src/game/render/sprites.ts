// Instanced pixel-art billboards. Every soldier, corpse and prop is one instance of a quad
// that stands upright, turns to face the camera and leans back a little toward it (so
// sprites stay readable from high up). The fragment shader reads a palette index from the
// atlas and looks the colour up in the army's palette row; Three's Lambert lighting,
// shadows and fog then apply as for any other object.

import * as THREE from 'three';
import type { FrameRect } from '../art/atlas';
import { PALETTE_ROWS, PALETTE_WIDTH } from '../art/palette';

export interface SpriteShared {
  atlas: THREE.DataTexture;
  palette: THREE.DataTexture;
  uniforms: {
    uRight: { value: THREE.Vector3 };
    uUp: { value: THREE.Vector3 };
    uNormal: { value: THREE.Vector3 };
    uTime: { value: number };
  };
}

export function createSpriteShared(atlasPixels: Uint8Array, size: number, paletteData: Uint8Array): SpriteShared {
  const atlas = new THREE.DataTexture(atlasPixels, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.generateMipmaps = false;
  atlas.colorSpace = THREE.NoColorSpace;
  atlas.needsUpdate = true;
  const palette = new THREE.DataTexture(paletteData, PALETTE_WIDTH, PALETTE_ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  palette.magFilter = THREE.NearestFilter;
  palette.minFilter = THREE.NearestFilter;
  palette.generateMipmaps = false;
  palette.colorSpace = THREE.SRGBColorSpace;
  palette.needsUpdate = true;
  return {
    atlas,
    palette,
    uniforms: {
      uRight: { value: new THREE.Vector3(1, 0, 0) },
      uUp: { value: new THREE.Vector3(0, 1, 0) },
      uNormal: { value: new THREE.Vector3(0, 0.8, 0.6).normalize() },
      uTime: { value: 0 },
    },
  };
}

const VERT_DECL = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iUV;
attribute vec2 iSize;
attribute float iPal;
attribute vec4 iFx;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uNormal;
uniform float uTime;
varying vec2 vSpriteUv;
varying float vPal;
varying vec4 vFx;
varying float vGlint;
`;

const VERT_POS = /* glsl */ `
float u = iFx.x > 0.5 ? 1.0 - uv.x : uv.x;
vSpriteUv = vec2(mix(iUV.x, iUV.z, u), mix(iUV.y, iUV.w, uv.y));
vPal = iPal;
vFx = iFx;
// iFx.w: 2 marks swaying foliage, 3 a super unit (a glint of gold runs over it now and then).
float sway = abs(iFx.w - 2.0) < 0.5 ? sin(uTime * 1.3 + iPos.x * 0.37 + iPos.z * 0.21) * 0.06 * position.y * position.y * iSize.y : 0.0;
vGlint = iFx.w > 2.5 ? fract(uTime * 0.22 + iPos.x * 0.013 + iPos.z * 0.017) * 3.0 - 1.0 - (uv.x + uv.y) * 0.5 : -9.0;
vec3 transformed = iPos + uRight * (position.x * iSize.x + sway) + uUp * (position.y * iSize.y);
`;

const FRAG_DECL = /* glsl */ `
uniform sampler2D uAtlas;
uniform sampler2D uPalette;
varying vec2 vSpriteUv;
varying float vPal;
varying vec4 vFx;
varying float vGlint;
`;

const FRAG_COLOR = /* glsl */ `
vec4 texel = texture2D(uAtlas, vSpriteUv);
if (texel.a < 0.5) discard;
float idx = floor(texel.r * 255.0 + 0.5);
vec4 pc = texture2D(uPalette, vec2((idx + 0.5) / ${PALETTE_WIDTH.toFixed(1)}, (vPal + 0.5) / ${PALETTE_ROWS.toFixed(1)}));
diffuseColor.rgb = pc.rgb;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.96, 0.9), vFx.y);
diffuseColor.rgb *= 1.0 + vFx.z * 0.5;
// Palette index 4 is the metal glint: push it past 1 so bloom catches it.
if (idx == 4.0) diffuseColor.rgb *= 2.2;
// Super units: a narrow diagonal band of gold light sweeps across every few seconds.
diffuseColor.rgb += vec3(1.0, 0.82, 0.45) * 0.55 * max(0.0, 1.0 - abs(vGlint) * 9.0);
`;

function patchSprite(shader: THREE.WebGLProgramParametersWithUniforms, shared: SpriteShared, depth: boolean): void {
  Object.assign(shader.uniforms, shared.uniforms, { uAtlas: { value: shared.atlas }, uPalette: { value: shared.palette } });
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
    .replace('#include <begin_vertex>', VERT_POS);
  if (!depth) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = uNormal;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAG_DECL}`)
    .replace('#include <map_fragment>', depth ? 'vec4 texel = texture2D(uAtlas, vSpriteUv); if (texel.a < 0.5) discard;' : FRAG_COLOR);
}

export class SpriteBatch {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private pos: Float32Array;
  private uv: Float32Array;
  private size: Float32Array;
  private pal: Float32Array;
  private fx: Float32Array;
  count = 0;

  constructor(
    shared: SpriteShared,
    readonly capacity: number,
    opts: { castShadow?: boolean; receiveShadow?: boolean } = {},
  ) {
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0, 0.5, 0);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = quad.index;
    this.geo.setAttribute('position', quad.getAttribute('position'));
    this.geo.setAttribute('uv', quad.getAttribute('uv'));
    this.geo.setAttribute('normal', quad.getAttribute('normal'));
    this.pos = new Float32Array(capacity * 3);
    this.uv = new Float32Array(capacity * 4);
    this.size = new Float32Array(capacity * 2);
    this.pal = new Float32Array(capacity);
    this.fx = new Float32Array(capacity * 4);
    const attr = (name: string, arr: Float32Array, n: number): void => {
      const a = new THREE.InstancedBufferAttribute(arr, n);
      a.setUsage(THREE.DynamicDrawUsage);
      this.geo.setAttribute(name, a);
    };
    attr('iPos', this.pos, 3);
    attr('iUV', this.uv, 4);
    attr('iSize', this.size, 2);
    attr('iPal', this.pal, 1);
    attr('iFx', this.fx, 4);
    this.geo.instanceCount = 0;

    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => patchSprite(shader, shared, false);
    mat.customProgramCacheKey = () => 'pl-sprite';
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !!opts.castShadow;
    this.mesh.receiveShadow = opts.receiveShadow ?? true;
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    depth.onBeforeCompile = (shader) => patchSprite(shader, shared, true);
    depth.customProgramCacheKey = () => 'pl-sprite-depth';
    this.mesh.customDepthMaterial = depth;
  }

  begin(): void {
    this.count = 0;
  }

  /**
   * Adds an instance with its feet at (x, height, z). fx: flip (0/1), flash (0..1),
   * highlight (0..1), w (1 normal, 2 swaying foliage, 3 a super unit's glint).
   */
  push(x: number, y: number, z: number, f: FrameRect, pal: number, flip: number, flash: number, highlight: number, scale = 1, w = 1): number {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.uv[i * 4] = f.u0;
    this.uv[i * 4 + 1] = f.v0;
    this.uv[i * 4 + 2] = f.u1;
    this.uv[i * 4 + 3] = f.v1;
    this.size[i * 2] = f.w * scale;
    this.size[i * 2 + 1] = f.h * scale;
    this.pal[i] = pal;
    this.fx[i * 4] = flip;
    this.fx[i * 4 + 1] = flash;
    this.fx[i * 4 + 2] = highlight;
    this.fx[i * 4 + 3] = w;
    return i;
  }

  end(): void {
    this.geo.instanceCount = this.count;
    for (const name of ['iPos', 'iUV', 'iSize', 'iPal', 'iFx']) {
      const a = this.geo.getAttribute(name) as THREE.InstancedBufferAttribute;
      a.needsUpdate = true;
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
    }
  }

  dispose(): void {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.customDepthMaterial?.dispose();
  }
}
