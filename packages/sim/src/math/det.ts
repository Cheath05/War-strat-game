// Deterministic maths helpers. Only + - * /, Math.sqrt and exact rounding functions are
// used here, so results are bit-identical on every browser (see docs/architecture.md).

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sq = (v: number): number => v * v;

export function len(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** Unit vector, or (fx, fy) when the input is (near) zero. */
export function norm(x: number, y: number, fx = 0, fy = 1): [number, number] {
  const l = Math.sqrt(x * x + y * y);
  if (l < 1e-9) return [fx, fy];
  return [x / l, y / l];
}

/**
 * Turns facing (fx, fy) toward (tx, ty) by blending, without trigonometry. `rate` is the
 * share of the gap closed per call (0..1); opposite directions turn via the right side.
 */
export function turnToward(fx: number, fy: number, tx: number, ty: number, rate: number): [number, number] {
  const d = fx * tx + fy * ty;
  if (d > 0.9995) return [tx, ty];
  if (d < -0.9) {
    // Nearly opposite: step toward the perpendicular first so the blend never collapses.
    return norm(fx + -fy * rate * 2, fy + fx * rate * 2, fx, fy);
  }
  return norm(fx + (tx - fx) * rate, fy + (ty - fy) * rate, fx, fy);
}

/** Smoothstep on [e0, e1]. */
export function smooth(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Rounds to 1/100 m; commands carry quantised numbers so every client parses the same values. */
export const q2 = (v: number): number => Math.round(v * 100) / 100;
