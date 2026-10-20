// Immediate-mode ground lines: selection outlines, order arrows, formation previews,
// capture circles and pings. Rebuilt every frame from what the input and HUD want shown.

import * as THREE from 'three';
import { heightAt, type BattleMap } from '@pl/sim';

export class Overlays {
  readonly lines: THREE.LineSegments;
  private pos: Float32Array;
  private col: Float32Array;
  private n = 0;
  private cap: number;

  constructor(
    private map: BattleMap,
    cap = 20000,
  ) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 6);
    this.col = new Float32Array(cap * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthTest: false });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 10;
  }

  begin(): void {
    this.n = 0;
  }

  private h(x: number, y: number): number {
    const cx = Math.max(0, Math.min(this.map.wm - 0.01, x));
    const cy = Math.max(0, Math.min(this.map.hm - 0.01, y));
    return heightAt(this.map, cx, cy) + 0.15;
  }

  /** A ground-hugging segment from (ax, ay) to (bx, by) in sim metres. */
  seg(ax: number, ay: number, bx: number, by: number, c: THREE.Color, step = 3): void {
    const d = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
    const n = Math.max(1, Math.ceil(d / step));
    let px = ax;
    let py = ay;
    let ph = this.h(ax, ay);
    for (let i = 1; i <= n; i++) {
      if (this.n >= this.cap) return;
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      const h = this.h(x, y);
      this.pos.set([px, ph, py, x, h, y], this.n * 6);
      this.col.set([c.r, c.g, c.b, c.r, c.g, c.b], this.n * 6);
      this.n++;
      px = x;
      py = y;
      ph = h;
    }
  }

  /** Rectangle around a formation: front centre (ax, ay), facing (dx, dy). */
  formation(ax: number, ay: number, dx: number, dy: number, frontage: number, depth: number, c: THREE.Color, dashed = false): void {
    const rx = -dy;
    const ry = dx;
    const hw = frontage / 2 + 0.8;
    const f = 0.8;
    const b = depth + 0.8;
    const p = [
      [ax + rx * -hw + dx * f, ay + ry * -hw + dy * f],
      [ax + rx * hw + dx * f, ay + ry * hw + dy * f],
      [ax + rx * hw - dx * b, ay + ry * hw - dy * b],
      [ax + rx * -hw - dx * b, ay + ry * -hw - dy * b],
    ];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = p[i]!;
      const [x1, y1] = p[(i + 1) % 4]!;
      if (dashed) {
        const n = 8;
        for (let k = 0; k < n; k += 2) this.seg(x0! + ((x1! - x0!) * k) / n, y0! + ((y1! - y0!) * k) / n, x0! + ((x1! - x0!) * (k + 1)) / n, y0! + ((y1! - y0!) * (k + 1)) / n, c);
      } else this.seg(x0!, y0!, x1!, y1!, c);
    }
    // A small arrowhead on the front edge shows the facing.
    const tx = ax + dx * (f + 1.6);
    const ty = ay + dy * (f + 1.6);
    this.seg(ax + rx * -1.2 + dx * f, ay + ry * -1.2 + dy * f, tx, ty, c);
    this.seg(tx, ty, ax + rx * 1.2 + dx * f, ay + ry * 1.2 + dy * f, c);
  }

  circle(x: number, y: number, r: number, c: THREE.Color, segments = 28): void {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      this.seg(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, c, 50);
    }
  }

  arrow(ax: number, ay: number, bx: number, by: number, c: THREE.Color): void {
    this.seg(ax, ay, bx, by, c);
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const s = Math.min(3, d * 0.3);
    this.seg(bx, by, bx - ux * s - uy * s * 0.6, by - uy * s + ux * s * 0.6, c);
    this.seg(bx, by, bx - ux * s + uy * s * 0.6, by - uy * s - ux * s * 0.6, c);
  }

  end(): void {
    const geo = this.lines.geometry;
    geo.setDrawRange(0, this.n * 2);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Flat dark ellipses under soldiers' feet (cheap stand-in for real sprite shadows). */
export class BlobShadows {
  readonly mesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  count = 0;

  constructor(private cap: number) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(10,8,20,0.55)');
    grad.addColorStop(0.6, 'rgba(10,8,20,0.35)');
    grad.addColorStop(1, 'rgba(10,8,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    // A constant depth nudge only: a slope-scaled offset would pull these ground decals in
    // front of the soldiers standing on them when the camera looks along the ground.
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -4 });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  begin(): void {
    this.count = 0;
  }

  push(x: number, h: number, y: number, size: number): void {
    if (this.count >= this.cap) return;
    this.p.set(x, h + 0.06, y);
    this.s.set(size, size * 0.7, 1);
    this.m.compose(this.p, this.q, this.s);
    this.mesh.setMatrixAt(this.count++, this.m);
  }

  end(): void {
    this.mesh.count = Math.max(0, this.count);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
