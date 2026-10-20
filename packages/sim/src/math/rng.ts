/**
 * sfc32: a small, fast PRNG built only from 32-bit integer operations, so it gives the
 * same sequence on every JavaScript engine. Its state lives in the world (plain numbers),
 * which makes it part of save/resync like everything else.
 */
export type RngState = number[];

export function seedRng(seed: number): RngState {
  let s = seed | 0;
  const split = (): number => {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) | 0;
  };
  const st: RngState = [split(), split(), split(), split()];
  for (let i = 0; i < 12; i++) nextU32(st);
  return st;
}

export function nextU32(st: RngState): number {
  let a = st[0]! | 0;
  let b = st[1]! | 0;
  let c = st[2]! | 0;
  let d = st[3]! | 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  st[0] = a;
  st[1] = b;
  st[2] = c;
  st[3] = d;
  return t >>> 0;
}

/** Uniform in [0, 1). */
export function rand(st: RngState): number {
  return nextU32(st) / 4294967296;
}

/** Integer in [0, n). */
export function randInt(st: RngState, n: number): number {
  return Math.floor(rand(st) * n);
}

export function randRange(st: RngState, lo: number, hi: number): number {
  return lo + (hi - lo) * rand(st);
}

export function chance(st: RngState, p: number): boolean {
  return rand(st) < p;
}

/** Stateless integer hash of (x, y, seed) in [0, 1); used for map noise. */
export function hash01(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
