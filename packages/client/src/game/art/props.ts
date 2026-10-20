// Battlefield props drawn as pixel-art billboards: Mediterranean trees, bushes, rocks,
// reeds, tents and ruined columns. Each kind has a few variants.

import { P, R, mid, dark, light } from './palette';
import { Px } from './px';

export interface PropArt {
  w: number;
  h: number;
  draw(px: Px, v: number): void;
  /** Height in metres when placed (scaled by the prop's own size factor). */
  metres: number;
  variants: number;
}

function blob(px: Px, cx: number, cy: number, rx: number, ry: number, ramp: number, seed: number): void {
  // A leafy clump: an ellipse with a ragged edge and darker undersides.
  px.ellipse(cx, cy, rx, ry, mid(ramp));
  let s = seed * 9301 + 49297;
  const rnd = (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let k = 0; k < rx * ry * 0.8; k++) {
    const a = rnd() * 6.283;
    const r = 0.75 + rnd() * 0.35;
    const x = Math.round(cx + Math.cos(a) * rx * r);
    const y = Math.round(cy + Math.sin(a) * ry * r);
    px.set(x, y, rnd() < 0.5 ? mid(ramp) : 0);
  }
  for (let k = 0; k < rx * ry * 0.35; k++) {
    const x = Math.round(cx + (rnd() - 0.5) * rx * 1.6);
    const y = Math.round(cy + (rnd() - 0.2) * ry * 1.4);
    if (px.get(x, y)) px.set(x, y, y > cy ? dark(ramp) : light(ramp), true);
  }
}

export const PROPS: Record<string, PropArt> = {
  tree: {
    w: 40,
    h: 56,
    metres: 7,
    variants: 3,
    draw(px, v) {
      if (v === 0) {
        // Cypress: a tall dark flame.
        px.rect(19, 46, 2, 9, mid(R.bark));
        for (let y = 6; y < 48; y++) {
          const t = (y - 6) / 42;
          const r = Math.round(1 + Math.sin(t * 3.0) * 6.2 * (1 - t * 0.25));
          px.hline(20 - r, 19 + r, y, mid(R.cypress));
        }
        for (let y = 10; y < 46; y += 3) px.set(17 + (y % 6), y, dark(R.cypress), true);
        for (let y = 8; y < 40; y += 5) px.set(15 + (y % 4), y, light(R.cypress), true);
      } else if (v === 1) {
        // Olive: twisted trunk, silvery round canopy.
        px.line(20, 54, 18, 40, mid(R.bark));
        px.line(21, 54, 22, 38, mid(R.bark));
        px.line(19, 44, 13, 36, mid(R.bark));
        blob(px, 20, 28, 15, 11, R.leafOlive, 7 + v);
        blob(px, 12, 33, 8, 6, R.leafOlive, 3);
        blob(px, 28, 32, 8, 6, R.leafOlive, 5);
      } else {
        // Umbrella pine: bare trunk, flat crown.
        px.line(20, 55, 21, 22, mid(R.bark));
        px.line(21, 30, 27, 22, mid(R.bark));
        blob(px, 20, 17, 17, 7, R.leaf, 11);
        blob(px, 27, 21, 9, 5, R.leaf, 13);
      }
    },
  },
  bush: {
    w: 24,
    h: 18,
    metres: 1.5,
    variants: 2,
    draw(px, v) {
      blob(px, 12, 11, 9, 6, v ? R.leafOlive : R.leaf, 21 + v);
    },
  },
  rock: {
    w: 24,
    h: 18,
    metres: 1.4,
    variants: 3,
    draw(px, v) {
      px.ellipse(12, 12, 9 - v, 5 + (v % 2), mid(R.stone));
      px.ellipse(9, 10, 4, 3, light(R.stone), true);
      px.set(14, 13, dark(R.stone), true);
      px.set(15, 12, dark(R.stone), true);
      if (v === 2) px.ellipse(18, 14, 4, 3, mid(R.stone));
    },
  },
  reeds: {
    w: 16,
    h: 24,
    metres: 2,
    variants: 2,
    draw(px, v) {
      for (let i = 0; i < 6; i++) {
        const x = 3 + i * 2 + (v ? 1 : 0);
        const top = 4 + ((i * 7 + v * 3) % 8);
        px.line(x, 23, x + (i % 2 ? 1 : -1), top, mid(R.reed));
        if (i % 2 === 0) px.rect(x - 1 + (i % 2 ? 1 : -1), top - 2, 2, 3, mid(R.leather));
      }
    },
  },
  tent: {
    w: 40,
    h: 32,
    metres: 4,
    variants: 2,
    draw(px, v) {
      for (let y = 4; y < 30; y++) {
        const r = Math.round((y - 4) * 0.75);
        px.hline(20 - r, 20 + r, y, mid(v ? R.canvas : R.team));
      }
      px.rect(18, 18, 5, 12, P.outline, true);
      px.vline(20, 1, 5, mid(R.wood));
      px.rect(21, 1, 4, 3, mid(R.team2));
    },
  },
  column: {
    w: 16,
    h: 48,
    metres: 6,
    variants: 2,
    draw(px, v) {
      const top = v ? 18 : 4;
      px.rect(4, top, 8, 44 - top, mid(R.ivory));
      for (let x = 5; x < 12; x += 2) px.vline(x, top + 2, 42, dark(R.ivory), true);
      px.rect(2, top - 2, 12, 3, mid(R.ivory));
      px.rect(2, 44, 12, 3, mid(R.stone));
      if (v) px.rect(0, 44, 5, 3, mid(R.ivory));
    },
  },
  banner: {
    w: 16,
    h: 40,
    metres: 4.5,
    variants: 1,
    draw(px) {
      px.vline(4, 2, 39, mid(R.wood));
      px.rect(5, 4, 9, 12, mid(R.team));
      px.hline(5, 13, 4, mid(R.team2), true);
      px.set(9, 9, mid(R.gold), true);
      px.set(4, 1, mid(R.gold), true);
    },
  },
};
