import { describe, expect, it } from 'vitest';
import { FrameLimiter } from '../src/game/frameLimit';

/** Frames drawn a second on a screen refreshing hz times a second, its frame times jittered by up to `jitter` ms. */
function rate(cap: number, hz: number, jitter = 0, seconds = 20): number {
  const lim = new FrameLimiter();
  lim.cap = cap;
  let seed = 7;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let n = 0;
  for (let i = 1; i <= hz * seconds; i++) if (lim.due(5000 + (i * 1000) / hz + (rnd() * 2 - 1) * jitter)) n++;
  return n / seconds;
}

describe('frame-rate limit', () => {
  it('draws every refresh without a limit', () => {
    expect(rate(0, 144)).toBe(144);
  });

  it('holds each limit on 60, 120, 144 and 240 Hz screens, despite jitter', () => {
    for (const hz of [60, 120, 144, 240]) {
      for (const cap of [30, 45, 60, 90, 120, 144]) {
        if (cap > hz) continue;
        for (const jitter of [0, 1]) expect(Math.abs(rate(cap, hz, jitter) - cap), `${cap} fps on ${hz} Hz, jitter ${jitter} ms`).toBeLessThan(cap * 0.03);
      }
    }
  });

  it('draws every refresh when the limit is above the screen rate', () => {
    expect(rate(144, 60, 1)).toBeCloseTo(60, 0);
  });
});
