// An indexed pixel canvas with the few drawing primitives the sprite generators need,
// plus the two finishing passes that give the HD-2D sprite look: ramp shading (light from
// the top left) and a dark outline.

import { P, rampOf } from './palette';

export class Px {
  readonly data: Uint8Array;
  /** Pixels drawn with an explicit shade keep it; others get auto-shaded. */
  private fixed: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h);
    this.fixed = new Uint8Array(w * h);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x]!;
  }

  /** Sets a pixel. `keep` marks it so the shading pass leaves it alone. */
  set(x: number, y: number, i: number, keep = false): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = i;
    this.fixed[y * this.w + x] = keep ? 1 : 0;
  }

  rect(x0: number, y0: number, w: number, h: number, i: number, keep = false): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, i, keep);
  }

  hline(x0: number, x1: number, y: number, i: number, keep = false): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, i, keep);
  }

  vline(x: number, y0: number, y1: number, i: number, keep = false): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, i, keep);
  }

  line(x0: number, y0: number, x1: number, y1: number, i: number, keep = false): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, i, keep);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Filled ellipse centred at (cx, cy) with radii rx, ry (half-pixel centres allowed). */
  ellipse(cx: number, cy: number, rx: number, ry: number, i: number, keep = false): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, i, keep);
      }
    }
  }

  /** Paints index i only over pixels that are already opaque (for patterns on a shape). */
  over(x: number, y: number, i: number, keep = false): void {
    if (this.get(x, y) !== 0) this.set(x, y, i, keep);
  }

  /** Copies a string template: chars map to indices via the key; '.' is transparent. */
  stamp(rows: string[], ox: number, oy: number, key: Record<string, number>, flip = false): void {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]!;
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]!;
        if (ch === '.' || ch === ' ') continue;
        const i = key[ch];
        if (i === undefined) continue;
        const x = flip ? ox + row.length - 1 - c : ox + c;
        this.set(x, oy + r, i, ch === ch.toUpperCase() && ch !== ch.toLowerCase());
      }
    }
  }

  /** Light from the top left: ramp pixels on upper edges get the light shade, lower/right edges dark. */
  shade(): void {
    const { w, h, data, fixed } = this;
    const out = data.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        const i = data[k]!;
        if (!i || fixed[k]) continue;
        const r = rampOf(i);
        if (r < 0 || i !== r + 1) continue;
        const same = (xx: number, yy: number): boolean => {
          const j = this.get(xx, yy);
          return j !== 0 && rampOf(j) === r;
        };
        const up = same(x, y - 1);
        const left = same(x - 1, y);
        const down = same(x, y + 1);
        const right = same(x + 1, y);
        if (!up || (!left && same(x + 1, y) && y > 0 && !same(x - 1, y - 1))) out[k] = r + 2;
        else if (!down || !right) out[k] = r;
      }
    }
    data.set(out);
  }

  /** Dark outline around everything opaque (4-neighbour). */
  outline(): void {
    const { w, h, data } = this;
    const out = data.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[y * w + x] !== 0) continue;
        const n = (xx: number, yy: number): boolean => {
          const j = this.get(xx, yy);
          return j !== 0 && j !== P.outline;
        };
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * w + x] = P.outline;
      }
    }
    data.set(out);
  }

  /** Mirrors horizontally in place. */
  flipX(): void {
    const { w, h, data } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w / 2; x++) {
        const a = y * w + x;
        const b = y * w + (w - 1 - x);
        const t = data[a]!;
        data[a] = data[b]!;
        data[b] = t;
      }
    }
  }
}
