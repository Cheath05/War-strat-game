// The sprite atlas: every unit type a battle can show, in every view and pose, plus the
// props. Pixels hold palette indices (red channel), so one atlas serves all armies. Frames
// are drawn once, the first time anything needs them (a battle's atlas, a menu's portrait).

import { FACTIONS, type SpriteSpec, type UnitTypeDef } from '@pl/sim';
import { Px } from './px';
import { POSES, drawSoldier, type Pose, type View } from './doll';
import { drawChariot, drawElephant, drawHorseman } from './mounts';
import { PROPS } from './props';

/** Pixels per metre for sprites: a 36 px foot frame is 2.25 m tall, the soldier in it about 1.6 m. */
export const PX_PER_M = 16;

export interface FrameRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Size in metres. */
  w: number;
  h: number;
}

export interface Atlas {
  size: number;
  /** RGBA: R = palette index, A = 255 where drawn. */
  pixels: Uint8Array;
  /** Indexed pixels per frame, kept for UI thumbnails. */
  cells: Map<string, Px>;
  frames: Map<string, FrameRect>;
}

export const POSE_INDEX: Record<Pose, number> = Object.fromEntries(POSES.map((p, i) => [p, i])) as Record<Pose, number>;

export function spriteKey(t: UnitTypeDef): string {
  const s = t.sprite;
  const kind = t.cls === 'ele' ? 'ele' : t.cls === 'chariot' ? 'chariot' : s.mount ? 'horse' : 'foot';
  const tint = Object.entries(s.tint ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join(',');
  return [kind, s.body, s.armor, s.helmet, s.crest, s.shield, s.weapon, s.cloth, s.cape ?? '', s.beard ? 'b' : '', s.skin ?? '', s.hair ?? '', s.mount ?? '', s.emblem ?? '', s.greaves ? 'g' : '', tint].join('.');
}

export function frameKey(sprite: string, view: View, pose: Pose): string {
  return `${sprite}|${view}|${pose}`;
}

function frameSize(kind: string): [number, number] {
  return kind === 'ele' ? [64, 64] : kind === 'chariot' ? [64, 48] : kind === 'horse' ? [48, 48] : [32, 36];
}

function drawFrame(kind: string, spec: SpriteSpec, view: View, pose: Pose): Px {
  const [w, h] = frameSize(kind);
  const px = new Px(w, h);
  if (kind === 'ele') drawElephant(px, spec, view, pose);
  else if (kind === 'chariot') drawChariot(px, spec, view, pose);
  else if (kind === 'horse') drawHorseman(px, spec, view, pose);
  else drawSoldier(px, spec, view, pose);
  px.shade();
  px.outline();
  return px;
}

const CELLS = new Map<string, Px>();

/** One frame of a unit type, drawn the first time it's asked for. */
export function cellOf(t: UnitTypeDef, view: View, pose: Pose): Px {
  const sk = spriteKey(t);
  const key = frameKey(sk, view, pose);
  let px = CELLS.get(key);
  if (!px) {
    px = drawFrame(sk.split('.')[0]!, t.sprite, view, pose);
    CELLS.set(key, px);
  }
  return px;
}

/** The atlas for these unit types (all of them by default). */
export function buildAtlas(types: UnitTypeDef[] = FACTIONS.flatMap((f) => f.units)): Atlas {
  const items: { key: string; px: Px; metres?: number }[] = [];
  const seen = new Set<string>();
  for (const t of types) {
    const sk = spriteKey(t);
    if (seen.has(sk)) continue;
    seen.add(sk);
    for (const view of [0, 1, 2] as View[]) {
      for (const pose of POSES) {
        if (pose === 'dead' && view !== 0) continue;
        items.push({ key: frameKey(sk, view, pose), px: cellOf(t, view, pose) });
      }
    }
  }
  for (const [kind, art] of Object.entries(PROPS)) {
    for (let v = 0; v < art.variants; v++) {
      const px = new Px(art.w, art.h);
      art.draw(px, v);
      px.shade();
      px.outline();
      items.push({ key: `prop|${kind}|${v}`, px, metres: art.metres });
    }
  }
  // Shelf packing, tallest first.
  items.sort((a, b) => b.px.h - a.px.h || b.px.w - a.px.w);
  let size = 1024;
  for (;;) {
    let x = 0;
    let y = 0;
    let shelf = 0;
    let ok = true;
    for (const it of items) {
      if (x + it.px.w > size) {
        x = 0;
        y += shelf;
        shelf = 0;
      }
      if (y + it.px.h > size) {
        ok = false;
        break;
      }
      x += it.px.w;
      shelf = Math.max(shelf, it.px.h);
    }
    if (ok) break;
    size *= 2;
  }
  const pixels = new Uint8Array(size * size * 4);
  const frames = new Map<string, FrameRect>();
  const cells = new Map<string, Px>();
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const it of items) {
    if (x + it.px.w > size) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    const { w, h, data } = it.px;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const idx = data[j * w + i]!;
        if (!idx) continue;
        // Row 0 of the texture is at the bottom in GL; flip so frames read top-down.
        const k = ((size - 1 - (y + j)) * size + (x + i)) * 4;
        pixels[k] = idx;
        pixels[k + 3] = 255;
      }
    }
    const metres = it.metres ?? h / PX_PER_M;
    frames.set(it.key, {
      u0: x / size,
      v0: (size - (y + h)) / size,
      u1: (x + w) / size,
      v1: (size - y) / size,
      w: (w / h) * metres,
      h: metres,
    });
    cells.set(it.key, it.px);
    x += w;
    shelf = Math.max(shelf, h);
  }
  return { size, pixels, cells, frames };
}
