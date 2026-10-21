// Fog of war (a lobby switch): what our side can see. Purely a view: the simulation and
// the AI know everything, the renderer just hides enemies our troops can't see and dims
// the ground beyond their sight.

import { TERRAIN, terrainAt, type Battle, type Unit } from '@pl/sim';

const CELL = 4;
const SIGHT_FOOT = 130;
const SIGHT_HORSE = 160;
/** Enemies in forest are only seen this close. */
const HIDDEN_RANGE = 40;
/** Brightness of ground out of sight (0..255). */
const UNSEEN = 60;

export class FogOfWar {
  readonly w: number;
  readonly h: number;
  /** Visibility per 4 m cell (0..255), the terrain shader's fog texture. */
  readonly data: Uint8Array;
  private seen = new Set<number>();

  constructor(b: Battle) {
    this.w = Math.ceil(b.map.wm / CELL);
    this.h = Math.ceil(b.map.hm / CELL);
    this.data = new Uint8Array(this.w * this.h);
  }

  /** Recomputes what `side` can see. */
  update(b: Battle, side: number): void {
    const { w, h, data } = this;
    data.fill(UNSEEN);
    const eyes: { x: number; y: number; r: number }[] = [];
    for (const u of b.world.units) {
      if (u.side !== side || u.st === 'gone') continue;
      const c = b.center(u);
      if (c.n) eyes.push({ x: c.x, y: c.y, r: b.typeOf(u).mounted ? SIGHT_HORSE : SIGHT_FOOT });
    }
    for (const e of eyes) {
      const r = e.r / CELL;
      const cx = e.x / CELL;
      const cy = e.y / CELL;
      const j0 = Math.max(0, Math.floor(cy - r));
      const j1 = Math.min(h - 1, Math.ceil(cy + r));
      for (let j = j0; j <= j1; j++) {
        const dy = j + 0.5 - cy;
        const half = Math.sqrt(Math.max(0, r * r - dy * dy));
        const i0 = Math.max(0, Math.floor(cx - half));
        const i1 = Math.min(w - 1, Math.ceil(cx + half));
        for (let i = i0; i <= i1; i++) {
          // A soft edge over the last 15% of the sight radius.
          const dx = i + 0.5 - cx;
          const d = Math.sqrt(dx * dx + dy * dy) / r;
          const v = d < 0.85 ? 255 : Math.max(UNSEEN, Math.round(255 - ((d - 0.85) / 0.15) * (255 - UNSEEN)));
          const k = j * w + i;
          if (v > data[k]!) data[k] = v;
        }
      }
    }
    // Enemy units are seen when within sight of one of ours (close, if they hide in forest).
    this.seen.clear();
    for (const u of b.world.units) {
      if (u.side === side || u.st === 'gone') continue;
      const c = b.center(u);
      if (!c.n) continue;
      const hides = TERRAIN[terrainAt(b.map, c.x, c.y)]?.hides;
      for (const e of eyes) {
        const dx = c.x - e.x;
        const dy = c.y - e.y;
        const r = hides ? HIDDEN_RANGE : e.r;
        if (dx * dx + dy * dy <= r * r) {
          this.seen.add(u.id);
          break;
        }
      }
    }
  }

  visible(u: Unit, side: number): boolean {
    return u.side === side || this.seen.has(u.id);
  }
}
