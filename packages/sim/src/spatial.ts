// Uniform grid over the battlefield for neighbour queries, rebuilt every tick from the
// soldier array (so it is a cache, never state). Holds soldier array indices.

import { GRID_CELL } from './constants';
import type { Soldier } from './types';

export class SpatialGrid {
  readonly cols: number;
  readonly rows: number;
  private head: Int32Array;
  private next: Int32Array;

  constructor(
    readonly wm: number,
    readonly hm: number,
  ) {
    this.cols = Math.max(1, Math.ceil(wm / GRID_CELL));
    this.rows = Math.max(1, Math.ceil(hm / GRID_CELL));
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(1024);
  }

  cellOf(x: number, y: number): number {
    let c = Math.floor(x / GRID_CELL);
    let r = Math.floor(y / GRID_CELL);
    if (c < 0) c = 0;
    else if (c >= this.cols) c = this.cols - 1;
    if (r < 0) r = 0;
    else if (r >= this.rows) r = this.rows - 1;
    return r * this.cols + c;
  }

  rebuild(soldiers: Soldier[]): void {
    this.head.fill(-1);
    if (this.next.length < soldiers.length) this.next = new Int32Array(soldiers.length * 2);
    // Insert in reverse so each cell's list runs in ascending soldier index order.
    for (let i = soldiers.length - 1; i >= 0; i--) {
      const s = soldiers[i]!;
      const c = this.cellOf(s.x, s.y);
      this.next[i] = this.head[c]!;
      this.head[c] = i;
    }
  }

  /** Calls fn(index) for soldiers in cells overlapping the circle (caller checks distance). */
  query(x: number, y: number, r: number, fn: (i: number) => void): void {
    let c0 = Math.floor((x - r) / GRID_CELL);
    let c1 = Math.floor((x + r) / GRID_CELL);
    let r0 = Math.floor((y - r) / GRID_CELL);
    let r1 = Math.floor((y + r) / GRID_CELL);
    if (c0 < 0) c0 = 0;
    if (r0 < 0) r0 = 0;
    if (c1 >= this.cols) c1 = this.cols - 1;
    if (r1 >= this.rows) r1 = this.rows - 1;
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        for (let i = this.head[rr * this.cols + cc]!; i !== -1; i = this.next[i]!) fn(i);
      }
    }
  }
}
