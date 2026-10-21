// A Total War-style camera: pan, zoom toward the cursor, rotate. The tilt follows the
// zoom, from almost overhead when far out to a low cinematic angle up close. In possession
// it follows the player's officer.

import * as THREE from 'three';
import type { BattleMap } from '@pl/sim';
import { heightAt } from '@pl/sim';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** Ground point the camera looks at (sim metres). */
  tx = 0;
  ty = 0;
  dist = 120;
  /** Yaw in radians: 0 looks toward -y (north on the map). */
  yaw = 0;
  private cur = { tx: 0, ty: 0, dist: 120, yaw: 0 };
  minDist = 10;
  maxDist = 300;
  follow: { x: number; y: number } | null = null;
  /** Fly-over intro: when set, overrides the rig until it finishes. */
  intro: { t: number; dur: number; from: { tx: number; ty: number; dist: number; yaw: number } } | null = null;

  constructor(
    private map: BattleMap,
    aspect: number,
  ) {
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.5, 3000);
    this.maxDist = Math.max(map.wm, map.hm) * 0.75;
  }

  /** 0 when zoomed all the way in, 1 all the way out. */
  zoomT(dist = this.cur.dist): number {
    return clamp((dist - this.minDist) / (this.maxDist - this.minDist), 0, 1);
  }

  pitch(dist = this.cur.dist): number {
    // Radians below the horizon: ~32 deg close up, ~66 deg far out.
    const t = Math.sqrt(this.zoomT(dist));
    return (32 + (66 - 32) * t) * (Math.PI / 180);
  }

  jump(x: number, y: number): void {
    this.tx = x;
    this.ty = y;
  }

  snap(): void {
    this.cur = { tx: this.tx, ty: this.ty, dist: this.dist, yaw: this.yaw };
  }

  /** Pan in screen directions (metres per second scaled by zoom). */
  pan(right: number, forward: number, dt: number): void {
    const speed = (25 + this.dist * 1.1) * dt;
    const fx = -Math.sin(this.yaw);
    const fy = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const ry = -Math.sin(this.yaw);
    this.tx += (rx * right + fx * forward) * speed;
    this.ty += (ry * right + fy * forward) * speed;
    this.clampTarget();
  }

  /** Zoom by a factor, keeping the ground point under the cursor roughly fixed. */
  zoom(factor: number, focus?: { x: number; y: number }): void {
    const before = this.dist;
    this.dist = clamp(this.dist * factor, this.minDist, this.maxDist);
    if (focus && !this.follow) {
      const k = 1 - this.dist / before;
      this.tx += (focus.x - this.tx) * k * 0.9;
      this.ty += (focus.y - this.ty) * k * 0.9;
      this.clampTarget();
    }
  }

  rotate(radians: number): void {
    this.yaw += radians;
  }

  clampTarget(): void {
    this.tx = clamp(this.tx, 0, this.map.wm);
    this.ty = clamp(this.ty, 0, this.map.hm);
  }

  startIntro(x: number, y: number, yaw: number, dur = 6): void {
    this.tx = x;
    this.ty = y;
    this.yaw = yaw;
    this.dist = Math.min(this.maxDist * 0.55, 140);
    const from = { tx: this.map.wm / 2, ty: this.map.hm / 2, dist: this.maxDist * 0.95, yaw: yaw + 1.2 };
    this.cur = { ...from };
    this.intro = { t: 0, dur, from };
  }

  /** Smoothly moves toward the targets and updates the Three camera. */
  update(dt: number): void {
    if (this.follow) {
      this.tx = this.follow.x;
      this.ty = this.follow.y;
    }
    const c = this.cur;
    if (this.intro) {
      const it = this.intro;
      it.t += dt;
      const u = clamp(it.t / it.dur, 0, 1);
      const e = u * u * (3 - 2 * u);
      c.tx = it.from.tx + (this.tx - it.from.tx) * e;
      c.ty = it.from.ty + (this.ty - it.from.ty) * e;
      c.dist = it.from.dist + (this.dist - it.from.dist) * e;
      c.yaw = it.from.yaw + (this.yaw - it.from.yaw) * e;
      if (u >= 1) this.intro = null;
    } else {
      const k = 1 - Math.exp(-dt * (this.follow ? 9 : 12));
      c.tx += (this.tx - c.tx) * k;
      c.ty += (this.ty - c.ty) * k;
      c.dist += (this.dist - c.dist) * k;
      c.yaw += (this.yaw - c.yaw) * k;
    }
    const p = this.pitch(c.dist);
    const ground = heightAt(this.map, clamp(c.tx, 0, this.map.wm - 0.01), clamp(c.ty, 0, this.map.hm - 0.01));
    const horiz = Math.cos(p) * c.dist;
    const cx = c.tx + Math.sin(c.yaw) * horiz;
    const cy = c.ty + Math.cos(c.yaw) * horiz;
    let cz = ground + Math.sin(p) * c.dist;
    // Never dip below the terrain under the camera.
    const under = heightAt(this.map, clamp(cx, 0, this.map.wm - 0.01), clamp(cy, 0, this.map.hm - 0.01));
    cz = Math.max(cz, under + 4);
    this.camera.position.set(cx, cz, cy);
    this.camera.lookAt(c.tx, ground + 1, c.ty);
  }

  /** Smoothed look-at point (what is in focus). */
  get focus(): { x: number; y: number; dist: number } {
    return { x: this.cur.tx, y: this.cur.ty, dist: this.cur.dist };
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
