// Particles (dust from charges, sparks from clashing bronze, blood, splashes, drifting
// light motes) and missiles in flight (arrows, javelins and pila as streaks, sling stones
// as pebbles), all as pixel-sized points and lines.

import * as THREE from 'three';
import { heightAt, type BattleMap, type Projectile } from '@pl/sim';

const PVERT = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
varying vec4 vColor;
varying float vFogDepth;
uniform float uScale;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_PointSize = clamp(aSize * uScale / max(0.5, -mv.z), 1.0, 48.0);
  gl_Position = projectionMatrix * mv;
}
`;
const PFRAG = /* glsl */ `
varying vec4 vColor;
varying float vFogDepth;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
void main() {
  if (vColor.a < 0.02) discard;
  vec3 c = mix(vColor.rgb, uFogColor, smoothstep(uFogNear, uFogFar, vFogDepth) * 0.8);
  gl_FragColor = vec4(c, vColor.a);
}
`;

export const fogUniforms = {
  uFogColor: { value: new THREE.Color() },
  uFogNear: { value: 100 },
  uFogFar: { value: 1000 },
};

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  r: number;
  g: number;
  b: number;
  size: number;
  grow: number;
  gravity: number;
}

const SPEED = [48, 24, 38, 20];

export class Effects {
  readonly group = new THREE.Group();
  private parts: Particle[] = [];
  private pGeo = new THREE.BufferGeometry();
  private pPos: Float32Array;
  private pCol: Float32Array;
  private pSize: Float32Array;
  private lines: THREE.LineSegments;
  private lPos: Float32Array;
  private lCol: Float32Array;
  readonly pointUniforms = { uScale: { value: 400 }, ...fogUniforms };
  private moteTimer = 0;

  constructor(
    private map: BattleMap,
    private cap: number,
  ) {
    this.pPos = new Float32Array(cap * 3);
    this.pCol = new Float32Array(cap * 4);
    this.pSize = new Float32Array(cap);
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('aColor', new THREE.BufferAttribute(this.pCol, 4).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('aSize', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
    const pMat = new THREE.ShaderMaterial({ vertexShader: PVERT, fragmentShader: PFRAG, uniforms: this.pointUniforms, transparent: true, depthWrite: false });
    const points = new THREE.Points(this.pGeo, pMat);
    points.frustumCulled = false;
    points.renderOrder = 3;
    this.group.add(points);

    const maxProj = 6000;
    this.lPos = new Float32Array(maxProj * 6);
    this.lCol = new Float32Array(maxProj * 6);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(this.lPos, 3).setUsage(THREE.DynamicDrawUsage));
    lGeo.setAttribute('color', new THREE.BufferAttribute(this.lCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
  }

  private add(p: Partial<Particle> & { x: number; y: number; z: number }): void {
    if (this.parts.length >= this.cap) this.parts.shift();
    this.parts.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 1, g: 1, b: 1, size: 1, grow: 0, gravity: 0, ...p });
  }

  /** Dust kicked up at ground point (x, y) in sim metres. */
  dust(x: number, y: number, n = 3, heavy = false): void {
    const h = heightAt(this.map, x, y);
    for (let k = 0; k < n; k++) {
      this.add({
        x: x + (Math.random() - 0.5) * 1.5,
        y: h + 0.2,
        z: y + (Math.random() - 0.5) * 1.5,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.4 + Math.random() * 0.8,
        vz: (Math.random() - 0.5) * 1.2,
        max: 0.8 + Math.random() * (heavy ? 1.0 : 0.6),
        r: 0.66,
        g: 0.57,
        b: 0.44,
        size: heavy ? 0.9 : 0.6,
        grow: heavy ? 0.9 : 0.5,
      });
    }
  }

  sparks(x: number, y: number, n = 4): void {
    const h = heightAt(this.map, x, y) + 1.1;
    for (let k = 0; k < n; k++) {
      this.add({
        x,
        y: h,
        z: y,
        vx: (Math.random() - 0.5) * 6,
        vy: 1 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 6,
        max: 0.18 + Math.random() * 0.15,
        r: 2.6,
        g: 2.2,
        b: 1.2,
        size: 0.09,
        gravity: 14,
      });
    }
  }

  blood(x: number, y: number, n = 3): void {
    const h = heightAt(this.map, x, y) + 1;
    for (let k = 0; k < n; k++) {
      this.add({ x, y: h, z: y, vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2, vz: (Math.random() - 0.5) * 3, max: 0.35, r: 0.5, g: 0.04, b: 0.05, size: 0.07, gravity: 12 });
    }
  }

  splash(x: number, y: number): void {
    const h = this.map.sea;
    for (let k = 0; k < 4; k++) {
      this.add({ x, y: h + 0.1, z: y, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, max: 0.4, r: 0.85, g: 0.95, b: 1, size: 0.09, gravity: 12 });
    }
  }

  /** Floating motes of light around the focus point (the HD-2D shimmer). */
  motes(dt: number, cx: number, cy: number, radius: number): void {
    this.moteTimer += dt;
    while (this.moteTimer > 0.12) {
      this.moteTimer -= 0.12;
      const x = cx + (Math.random() - 0.5) * radius * 2;
      const y = cy + (Math.random() - 0.5) * radius * 2;
      if (x < 0 || y < 0 || x > this.map.wm || y > this.map.hm) continue;
      this.add({
        x,
        y: heightAt(this.map, x, y) + 1 + Math.random() * 6,
        z: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.15 + Math.random() * 0.2,
        vz: (Math.random() - 0.5) * 0.4,
        max: 3 + Math.random() * 3,
        r: 1.5,
        g: 1.2,
        b: 0.6,
        size: 0.05,
      });
    }
  }

  /** Pixels per metre at distance 1: viewport height / (2 tan(fov / 2)). */
  setProjection(viewportHeight: number, fovDeg: number): void {
    this.pointUniforms.uScale.value = viewportHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  update(dt: number, camDist: number): void {
    let n = 0;
    const keep: Particle[] = [];
    for (const p of this.parts) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.97;
      p.vz *= 0.97;
      p.size += p.grow * dt;
      keep.push(p);
      const t = p.life / p.max;
      const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      this.pPos[n * 3] = p.x;
      this.pPos[n * 3 + 1] = p.y;
      this.pPos[n * 3 + 2] = p.z;
      this.pCol[n * 4] = p.r;
      this.pCol[n * 4 + 1] = p.g;
      this.pCol[n * 4 + 2] = p.b;
      this.pCol[n * 4 + 3] = a * (p.grow > 0 ? 0.32 : 1);
      this.pSize[n] = p.size;
      n++;
    }
    this.parts = keep;
    this.pGeo.setDrawRange(0, n);
    for (const name of ['position', 'aColor', 'aSize']) (this.pGeo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    void camDist;
  }

  /** Missiles in flight, interpolated between ticks. */
  projectiles(proj: Projectile[], alpha: number): void {
    let n = 0;
    const cap = this.lPos.length / 6;
    for (const p of proj) {
      if (n >= cap) break;
      const t = (p.t + alpha) / p.dur;
      if (t < 0 || t > 1) continue;
      const dx = p.tx - p.sx;
      const dy = p.ty - p.sy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const arc = d * (p.kind === 0 ? 0.2 : p.kind === 2 ? 0.08 : 0.12);
      const h0 = heightAt(this.map, p.sx, p.sy) + 1.6;
      const h1 = heightAt(this.map, p.tx, p.ty) + 0.6;
      const at = (u: number): [number, number, number] => [p.sx + dx * u, h0 + (h1 - h0) * u + arc * 4 * u * (1 - u), p.sy + dy * u];
      const [x, y, z] = at(t);
      const len = p.kind === 2 ? 0.25 : p.kind === 0 ? 0.9 : 1.4;
      const back = Math.max(0, t - len / Math.max(1, d));
      const [bx, by, bz] = at(back);
      this.lPos.set([x, y, z, bx, by, bz], n * 6);
      const c = p.kind === 0 ? [0.25, 0.2, 0.15, 0.85, 0.82, 0.75] : p.kind === 2 ? [0.55, 0.52, 0.5, 0.45, 0.42, 0.4] : [0.75, 0.75, 0.8, 0.45, 0.32, 0.2];
      this.lCol.set(c, n * 6);
      n++;
    }
    const geo = this.lines.geometry;
    geo.setDrawRange(0, n * 2);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.pGeo.dispose();
    (this.group.children[0] as THREE.Points).material instanceof THREE.Material && ((this.group.children[0] as THREE.Points).material as THREE.Material).dispose();
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
  }
}

export { SPEED as PROJECTILE_SPEED };
