// Screen ↔ world: rays onto the heightmap, and projecting soldiers to the screen to pick
// units under the cursor or inside a selection box.

import * as THREE from 'three';
import { heightAt, type BattleMap } from '@pl/sim';

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const v = new THREE.Vector3();

/** Ground point (sim metres) under a screen point given in pixels, or null off the map. */
export function groundAt(camera: THREE.PerspectiveCamera, map: BattleMap, px: number, py: number, w: number, h: number): { x: number; y: number } | null {
  ndc.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin;
  const d = ray.ray.direction;
  if (d.y >= -0.001) return null;
  // March down the ray until we pass below the ground, then bisect.
  let t = 0;
  let prev = 0;
  const maxT = 6000;
  const step = (tt: number): number => Math.max(0.5, (o.y + d.y * tt) * 0.25);
  let hit = false;
  while (t < maxT) {
    const x = o.x + d.x * t;
    const z = o.z + d.z * t;
    const y = o.y + d.y * t;
    const inside = x >= 0 && z >= 0 && x < map.wm && z < map.hm;
    const g = inside ? heightAt(map, x, z) : 0;
    if (y <= g) {
      hit = true;
      break;
    }
    prev = t;
    t += step(t);
  }
  if (!hit) return null;
  let a = prev;
  let b = t;
  for (let i = 0; i < 8; i++) {
    const m = (a + b) / 2;
    const x = o.x + d.x * m;
    const z = o.z + d.z * m;
    const g = x >= 0 && z >= 0 && x < map.wm && z < map.hm ? heightAt(map, x, z) : 0;
    if (o.y + d.y * m <= g) b = m;
    else a = m;
  }
  const x = o.x + d.x * b;
  const z = o.z + d.z * b;
  if (x < 0 || z < 0 || x > map.wm || z > map.hm) return null;
  return { x, y: z };
}

/** Screen pixel position of a world point, or null if behind the camera. */
export function toScreen(camera: THREE.Camera, x: number, h: number, y: number, w: number, hpx: number): { x: number; y: number } | null {
  v.set(x, h, y).project(camera);
  if (v.z > 1) return null;
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * hpx };
}
