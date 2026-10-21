// The 3D battlefield: a heightmap mesh with crisp pixel-art ground textures (dithered at
// tile borders, rock strata on steep faces), shimmering water, and the deployment-zone
// highlight. Lit by Three's Lambert lighting so it takes the sun, shadows and fog.

import * as THREE from 'three';
import { T, TILE, type BattleMap } from '@pl/sim';
import { LAYERS, LAYER_CLIFF_FACE, TEX, buildTerrainTextures } from '../art/terrainTex';

export interface TerrainView {
  group: THREE.Group;
  mesh: THREE.Mesh;
  uniforms: {
    uZone: { value: THREE.Vector4 };
    uZoneOn: { value: number };
    uTime: { value: number };
    uFogTex: { value: THREE.DataTexture };
    uFogOn: { value: number };
  };
  water: THREE.Mesh | null;
  waterUniforms: Record<string, THREE.IUniform>;
  fogData: Uint8Array;
  dispose(): void;
}

const TERRAIN_DECL = /* glsl */ `
uniform highp sampler2DArray uTex;
uniform sampler2D uTypes;
uniform sampler2D uFogTex;
uniform float uFogOn;
uniform vec2 uMapTiles;
uniform vec4 uZone;
uniform float uZoneOn;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vWN;

float tileType(vec2 cell) {
  vec2 c = clamp(cell, vec2(0.0), uMapTiles - 1.0);
  return floor(texelFetch(uTypes, ivec2(c), 0).r * 255.0 + 0.5);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[y * 4 + x]) + 0.5) / 16.0;
}
`;

const TERRAIN_COLOR = /* glsl */ `
{
  vec2 tc = vWorld.xz / ${TILE.toFixed(1)};
  // Wobble the borders so tiles don't read as a grid.
  vec2 wob = vec2(vnoise(tc * 1.7), vnoise(tc * 1.7 + 17.0)) - 0.5;
  vec2 tcw = tc + wob * 0.55;
  vec2 cell = floor(tcw);
  vec2 f = tcw - cell;
  vec2 texel = floor(fract(tc) * ${TEX.toFixed(1)});
  float b = bayer4(texel + floor(tc) * 3.0);
  float layer = tileType(cell);
  // Dithered blend into a neighbour near each edge.
  float wl = 1.0 - f.x, wr = f.x, wu = 1.0 - f.y, wd = f.y;
  float pick = layer;
  float best = 0.0;
  float n;
  n = tileType(cell + vec2(-1.0, 0.0)); if (n != layer) { float w = (0.35 - min(wr, 0.35)) / 0.35 * 0.5; if (w > b && w > best) { best = w; pick = n; } }
  n = tileType(cell + vec2(1.0, 0.0)); if (n != layer) { float w = (0.35 - min(wl, 0.35)) / 0.35 * 0.5; if (w > b && w > best) { best = w; pick = n; } }
  n = tileType(cell + vec2(0.0, -1.0)); if (n != layer) { float w = (0.35 - min(wd, 0.35)) / 0.35 * 0.5; if (w > b && w > best) { best = w; pick = n; } }
  n = tileType(cell + vec2(0.0, 1.0)); if (n != layer) { float w = (0.35 - min(wu, 0.35)) / 0.35 * 0.5; if (w > b && w > best) { best = w; pick = n; } }
  vec3 col;
  vec3 nrm = normalize(vWN);
  if (nrm.y < 0.72) {
    // Steep: rock strata (or masonry) projected on the face.
    vec2 fuv = abs(nrm.x) > abs(nrm.z) ? vWorld.zy : vWorld.xy;
    float wallNear = max(max(step(abs(tileType(cell) - ${T.wall.toFixed(1)}), 0.1), step(abs(tileType(cell + vec2(1.0, 0.0)) - ${T.wall.toFixed(1)}), 0.1)),
      max(step(abs(tileType(cell + vec2(0.0, 1.0)) - ${T.wall.toFixed(1)}), 0.1), step(abs(tileType(cell - vec2(1.0, 0.0)) - ${T.wall.toFixed(1)}), 0.1)));
    float fl = wallNear > 0.5 ? ${T.wall.toFixed(1)} : ${LAYER_CLIFF_FACE.toFixed(1)};
    col = texture(uTex, vec3(fract(fuv / ${TILE.toFixed(1)}), fl)).rgb;
    col *= 0.85;
  } else {
    col = texture(uTex, vec3(fract(tc), pick)).rgb;
  }
  // Gentle large-scale colour variation.
  col *= 0.92 + 0.16 * vnoise(tc * 0.18);
  // Deployment zone: a soft gold tint with a dashed border.
  if (uZoneOn > 0.5) {
    vec2 p = vWorld.xz;
    if (p.x > uZone.x && p.x < uZone.z && p.y > uZone.y && p.y < uZone.w) {
      col = mix(col, vec3(1.0, 0.85, 0.45), 0.12);
      float edge = min(min(p.x - uZone.x, uZone.z - p.x), min(p.y - uZone.y, uZone.w - p.y));
      if (edge < 0.6 && mod(floor((p.x + p.y) * 0.8 + uTime * 2.0), 2.0) < 1.0) col = mix(col, vec3(1.0, 0.92, 0.6), 0.7);
    }
  }
  diffuseColor.rgb = col * col; // the textures are authored in sRGB: approximate linear
  if (uFogOn > 0.5) {
    // Out of sight: grey, dark and a little cool, so the edge of sight reads at a glance
    // (plain darkening mostly vanishes in the tone mapping).
    float vis = texture2D(uFogTex, vWorld.xz / (uMapTiles * ${TILE.toFixed(1)})).r;
    float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
    diffuseColor.rgb = mix(lum * vec3(0.3, 0.33, 0.4), diffuseColor.rgb, vis);
  }
}
`;

export function createTerrain(map: BattleMap): TerrainView {
  const group = new THREE.Group();
  const W = map.w + 1;
  const H = map.h + 1;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(W * H * 3);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      pos[k * 3] = i * TILE;
      pos[k * 3 + 1] = map.hgt[k]!;
      pos[k * 3 + 2] = j * TILE;
    }
  }
  const idx = new Uint32Array(map.w * map.h * 6);
  let n = 0;
  for (let j = 0; j < map.h; j++) {
    for (let i = 0; i < map.w; i++) {
      const a = j * W + i;
      const b = a + 1;
      const c = a + W;
      const d = c + 1;
      idx[n++] = a;
      idx[n++] = c;
      idx[n++] = b;
      idx[n++] = b;
      idx[n++] = c;
      idx[n++] = d;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const texData = buildTerrainTextures();
  const tex = new THREE.DataArrayTexture(texData, TEX, TEX, LAYERS);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;

  const types = new THREE.DataTexture(map.ter.slice(), map.w, map.h, THREE.RedFormat, THREE.UnsignedByteType);
  types.magFilter = THREE.NearestFilter;
  types.minFilter = THREE.NearestFilter;
  types.needsUpdate = true;

  const fogW = Math.ceil(map.wm / 4);
  const fogH = Math.ceil(map.hm / 4);
  const fogData = new Uint8Array(fogW * fogH).fill(255);
  const fogTex = new THREE.DataTexture(fogData, fogW, fogH, THREE.RedFormat, THREE.UnsignedByteType);
  fogTex.magFilter = THREE.LinearFilter;
  fogTex.minFilter = THREE.LinearFilter;
  fogTex.needsUpdate = true;

  const uniforms = {
    uZone: { value: new THREE.Vector4() },
    uZoneOn: { value: 0 },
    uTime: { value: 0 },
    uFogTex: { value: fogTex },
    uFogOn: { value: 0 },
  };
  const mat = new THREE.MeshLambertMaterial();
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, {
      uTex: { value: tex },
      uTypes: { value: types },
      uMapTiles: { value: new THREE.Vector2(map.w, map.h) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${TERRAIN_DECL}`).replace('#include <map_fragment>', TERRAIN_COLOR);
  };
  mat.customProgramCacheKey = () => 'pl-terrain';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  const { water, waterUniforms } = createWater(map);
  if (water) group.add(water);

  // Walls: stone blocks from the ground up to their top (the ground beside them stays flat,
  // so nobody seems to walk up them).
  const walls: number[] = [];
  for (let k = 0; k < map.w * map.h; k++) if (map.ter[k] === T.wall && map.top[k]! > 0) walls.push(k);
  let wallMesh: THREE.InstancedMesh | null = null;
  let wallTex: THREE.DataTexture | null = null;
  if (walls.length) {
    const L = TEX * TEX * 4;
    wallTex = new THREE.DataTexture(texData.slice(T.wall * L, T.wall * L + L), TEX, TEX, THREE.RGBAFormat);
    wallTex.magFilter = THREE.NearestFilter;
    wallTex.minFilter = THREE.NearestFilter;
    wallTex.colorSpace = THREE.SRGBColorSpace;
    wallTex.needsUpdate = true;
    const box = new THREE.BoxGeometry(TILE, 1, TILE);
    box.translate(0, 0.5, 0);
    wallMesh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ map: wallTex }), walls.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    walls.forEach((k, n) => {
      const i = k % map.w;
      const j = (k - i) / map.w;
      const g = Math.min(map.hgt[j * W + i]!, map.hgt[j * W + i + 1]!, map.hgt[(j + 1) * W + i]!, map.hgt[(j + 1) * W + i + 1]!);
      const h = Math.max(0.5, map.top[k]! - g);
      m4.compose(new THREE.Vector3((i + 0.5) * TILE, g - 0.05, (j + 0.5) * TILE), q, new THREE.Vector3(1, h + 0.05, 1));
      wallMesh!.setMatrixAt(n, m4);
    });
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);
  }

  return {
    group,
    mesh,
    uniforms,
    water,
    waterUniforms,
    fogData,
    dispose() {
      geo.dispose();
      mat.dispose();
      tex.dispose();
      types.dispose();
      fogTex.dispose();
      water?.geometry.dispose();
      (water?.material as THREE.Material | undefined)?.dispose();
      wallMesh?.geometry.dispose();
      (wallMesh?.material as THREE.Material | undefined)?.dispose();
      wallTex?.dispose();
    },
  };
}

const WATER_VERT = /* glsl */ `
attribute float aDepth;
varying float vDepth;
varying vec3 vWorld;
varying float vFogDepth;
void main() {
  vDepth = aDepth;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDepth;
varying vec3 vWorld;
varying float vFogDepth;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  if (vDepth < -0.05) discard;
  float d = clamp(vDepth / 2.2, 0.0, 1.0);
  vec3 shallow = vec3(0.16, 0.48, 0.52);
  vec3 deep = vec3(0.03, 0.12, 0.24);
  vec3 col = mix(shallow, deep, d);
  // Pixel-quantised ripples drifting across the surface.
  vec2 p = floor(vWorld.xz * 6.0) / 6.0;
  float w = sin(p.x * 1.3 + uTime * 1.2) * sin(p.y * 1.7 - uTime * 0.9) + 0.6 * sin((p.x + p.y) * 0.7 + uTime * 0.6);
  col += step(1.05, w) * vec3(0.10, 0.14, 0.14);
  // Sun glints: bright sparkles that bloom.
  float g = h(floor(vWorld.xz * 3.0) + floor(uTime * 3.0));
  col += step(0.992, g) * (1.0 - d * 0.6) * vec3(2.4, 2.2, 1.9);
  // Foam along the shore.
  float foam = step(vDepth, 0.14 + 0.05 * sin(uTime * 2.0 + vWorld.x * 0.7 + vWorld.z * 0.4));
  col = mix(col, vec3(0.85, 0.9, 0.9), foam * 0.75);
  float alpha = mix(0.6, 0.93, d);
  float fogF = smoothstep(uFogNear, uFogFar, vFogDepth);
  col = mix(col, uFogColor, fogF);
  gl_FragColor = vec4(col, alpha);
}
`;

function createWater(map: BattleMap): { water: THREE.Mesh | null; waterUniforms: Record<string, THREE.IUniform> } {
  const W = map.w + 1;
  const waterTile = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= map.w || j >= map.h) return false;
    const t = map.ter[j * map.w + i]!;
    return t === T.water || t === T.shallow;
  };
  const verts: number[] = [];
  const depth: number[] = [];
  for (let j = 0; j < map.h; j++) {
    for (let i = 0; i < map.w; i++) {
      // Water tiles and a one-tile margin, so the shoreline is covered.
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1 && !near; di++) near = waterTile(i + di, j + dj);
      if (!near) continue;
      const corners = [
        [i, j],
        [i, j + 1],
        [i + 1, j],
        [i + 1, j],
        [i, j + 1],
        [i + 1, j + 1],
      ];
      for (const [ci, cj] of corners) {
        verts.push(ci! * TILE, map.sea, cj! * TILE);
        depth.push(map.sea - map.hgt[cj! * W + ci!]!);
      }
    }
  }
  const waterUniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uFogColor: { value: new THREE.Color() },
    uFogNear: { value: 100 },
    uFogFar: { value: 1000 },
  };
  if (!verts.length) return { water: null, waterUniforms };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, uniforms: waterUniforms, transparent: true, depthWrite: false });
  const water = new THREE.Mesh(geo, mat);
  water.renderOrder = 2;
  return { water, waterUniforms };
}

/** World position helper: sim (x, y) metres → three (x, height, y). */
export function toWorld(map: BattleMap, x: number, y: number, h: (map: BattleMap, x: number, y: number) => number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x, h(map, x, y), y);
}
