// The menus' backdrop: dusk at the Hot Gates in chunky pixels. Cliffs on the left, a low sun
// over the sea, and a phalanx on the ridge with its spears against the sky. Drawn once per
// page at 480×270 and scaled up with crisp pixels; a few embers drift up in CSS.

const W = 480;
const H = 270;
const HORIZON = 184;

type RGB = readonly [number, number, number];

/** Ordered dithering (4×4 Bayer matrix), so colour bands blend the way pixel art does. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const SKY: RGB[] = [
  [14, 16, 28],
  [22, 22, 42],
  [36, 30, 56],
  [60, 38, 66],
  [98, 50, 72],
  [146, 70, 74],
  [194, 104, 80],
  [228, 146, 92],
  [244, 186, 118],
];
const SUN: RGB = [255, 228, 170];
const SUN_RIM: RGB = [252, 200, 124];
const GLOW: RGB = [240, 168, 104];
const FAR: RGB = [92, 52, 78];
const FAR_LIT: RGB = [138, 74, 86];
const SEA: RGB = [54, 36, 62];
const SEA_DEEP: RGB = [40, 28, 50];
const SHIMMER: RGB = [246, 190, 118];
const SHIMMER_DIM: RGB = [196, 116, 86];
const CLIFF: RGB = [34, 24, 40];
const CLIFF_LIT: RGB = [70, 40, 56];
const CLIFF_DARK: RGB = [26, 18, 32];
const SIL: RGB = [14, 10, 18];
const RIM: RGB = [214, 120, 74];
const RIM_MID: RGB = [150, 78, 60];
const RIM_DIM: RGB = [88, 44, 48];
const BACK_ROW: RGB = [40, 26, 42];
const BIRD: RGB = [40, 28, 46];
const FLAG: RGB = [104, 26, 34];
const FLAG_LIT: RGB = [176, 62, 52];
const BRONZE: RGB = [232, 170, 92];

let url = '';

/** The backdrop as an image URL, painted the first time it's needed. */
function art(): string {
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(W, H);
  const px = img.data;
  let seed = 4807;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const put = (x: number, y: number, col: RGB): void => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    px[k] = col[0];
    px[k + 1] = col[1];
    px[k + 2] = col[2];
    px[k + 3] = 255;
  };
  const dither = (x: number, y: number, f: number): boolean => f * 16 > BAYER[(y & 3) * 4 + (x & 3)]! + 0.5;
  // Smooth value noise along x, for skylines.
  const noise = (n: number): ((x: number) => number) => {
    const pts = Array.from({ length: n + 2 }, rnd);
    return (x: number): number => {
      const t = (x / W) * n;
      const i = Math.floor(t);
      const f = t - i;
      const s = f * f * (3 - 2 * f);
      return pts[i]! * (1 - s) + pts[i + 1]! * s;
    };
  };

  // Sky, with a glow around the sun.
  const sunX = 340;
  const sunY = 170;
  const sunR = 22;
  for (let y = 0; y < HORIZON; y++) {
    const t = Math.pow(y / HORIZON, 1.45) * (SKY.length - 1);
    const i = Math.min(SKY.length - 1, Math.floor(t));
    for (let x = 0; x < W; x++) {
      let col = SKY[Math.min(SKY.length - 1, i + (dither(x, y, t - i) ? 1 : 0))]!;
      const d = Math.hypot(x - sunX, (y - sunY) * 1.25);
      if (d < sunR + 50 && dither(x, y, (1 - (d - sunR) / 50) * 0.55)) col = GLOW;
      put(x, y, col);
    }
  }
  // A few faint stars high up, and birds heading home.
  for (let k = 0; k < 40; k++) {
    const x = rnd() * W;
    const y = rnd() * 50;
    put(x, y, rnd() < 0.3 ? [86, 84, 112] : [52, 52, 78]);
  }
  for (const [bx, by] of [
    [262, 62],
    [274, 56],
    [283, 65],
    [410, 88],
  ] as const) {
    put(bx - 1, by - 1, BIRD);
    put(bx, by, BIRD);
    put(bx + 1, by - 1, BIRD);
  }
  // The sun, sinking behind Euboea's mountains across the gulf.
  for (let y = sunY - sunR; y <= sunY + sunR; y++) {
    for (let x = sunX - sunR; x <= sunX + sunR; x++) {
      const d = Math.hypot(x - sunX, y - sunY);
      if (d <= sunR) put(x, y, d > sunR - 2.2 ? SUN_RIM : SUN);
    }
  }
  const far = noise(9);
  const far2 = noise(31);
  for (let x = 0; x < W; x++) {
    const top = HORIZON - 8 - far(x) * 18 - far2(x) * 5;
    for (let y = Math.floor(top); y < HORIZON; y++) put(x, y, y - top < 1 && Math.abs(x - sunX) < 90 ? FAR_LIT : FAR);
  }
  // The sea, with the sun's path glittering on it.
  for (let y = HORIZON; y < H; y++) {
    const depth = (y - HORIZON) / 40;
    for (let x = 0; x < W; x++) put(x, y, dither(x, y, depth) ? SEA_DEEP : SEA);
  }
  for (let y = HORIZON + 1; y < H; y += 2) {
    const spread = 10 + (y - HORIZON) * 1.6;
    const n = Math.round(4 + (y - HORIZON) * 0.25);
    for (let k = 0; k < n; k++) {
      const x = sunX + (rnd() * 2 - 1) * spread * (0.4 + rnd() * 0.6);
      const len = 2 + Math.floor(rnd() * 5);
      const col = Math.abs(x - sunX) < spread * 0.45 ? SHIMMER : SHIMMER_DIM;
      for (let i = 0; i < len; i++) put(x + i, y, col);
    }
  }
  // Mount Kallidromos: cliffs falling from the upper left to the shore.
  const cliffN = noise(14);
  const cliffN2 = noise(53);
  const cliffTop = (x: number): number => 26 + Math.pow(x / 240, 1.35) * 170 + cliffN(x) * 22 + cliffN2(x) * 7;
  for (let x = 0; x < W; x++) {
    const top = cliffTop(x);
    if (top >= H) continue;
    for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
      // Rock strata: darker streaks, and the sunward edge catching the light.
      let col = CLIFF;
      if (y - top < 1.5) col = CLIFF_LIT;
      else if ((x * 7 + Math.floor(y / 6) * 13) % 23 === 0 || dither(x, y, ((y - top) / 120) * 0.5)) col = CLIFF_DARK;
      put(x, y, col);
    }
  }

  // The ridge in front, the phalanx standing on it and two standards: one silhouette,
  // edged with light from the low sun.
  const sil = new Uint8Array(W * H);
  const back = new Uint8Array(W * H);
  const plot =
    (into: Uint8Array) =>
    (x: number, y: number): void => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && y >= 0 && x < W && y < H) into[y * W + x] = 1;
    };
  const mark = plot(sil);
  const markBack = plot(back);
  const rect = (x0: number, y0: number, w: number, h: number, set: (x: number, y: number) => void): void => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y);
  };
  const ridgeN = noise(7);
  const ridge = (x: number): number => 196 + Math.sin(x * 0.019) * 3 + ridgeN(x) * 6 + Math.max(0, x - 430) * 0.3;
  for (let x = 120; x < W; x++) for (let y = Math.floor(ridge(x)); y < H; y++) mark(x, y);
  const hoplite = (x: number, gy: number, spear: number, set: (x: number, y: number) => void): void => {
    rect(x - 2, gy - 7, 2, 7, set);
    rect(x + 1, gy - 7, 2, 7, set);
    rect(x - 3, gy - 16, 6, 9, set);
    rect(x - 4, gy - 12, 1, 5, set);
    rect(x - 2, gy - 21, 4, 5, set);
    rect(x + 2, gy - 19, 1, 3, set);
    rect(x - 3, gy - 22, 5, 1, set);
    rect(x - 2, gy - 23, 3, 1, set);
    rect(x - 4, gy - 21, 1, 3, set);
    // The round shield, held in front.
    for (let y = -6; y <= 6; y++) for (let i = -6; i <= 6; i++) if (i * i + y * y <= 30) set(x + 3 + i, gy - 12 + y);
    // The spear, upright, with its leaf-shaped blade.
    const top = gy - spear;
    rect(x + 7, top, 1, spear - 1, set);
    rect(x + 6, top - 3, 3, 3, set);
    set(x + 7, top - 4);
    set(x + 7, top - 5);
  };
  for (let x = 206; x < W + 10; x += 8 + Math.floor(rnd() * 3)) hoplite(x, Math.round(ridge(x)) - 3, 34 + Math.floor(rnd() * 5), markBack);
  for (let x = 200; x < W + 10; x += 10 + Math.floor(rnd() * 4)) hoplite(x, Math.round(ridge(x)) + 1, 37 + Math.floor(rnd() * 6), mark);
  // Two standards above the ranks: a crossbar, a crimson banner with a forked hem, a bronze finial.
  const flags: [number, number][] = [];
  for (const sx of [268, 404]) {
    const gy = Math.round(ridge(sx));
    rect(sx, gy - 60, 1, 60, mark);
    rect(sx - 5, gy - 56, 11, 1, mark);
    flags.push([sx, gy]);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (sil[k]) {
        // Edges against the sky catch the sun, brighter nearer to it (none under the menu, on the left).
        const edge = x > 190 && ((y > 0 && !sil[k - W]) || (x < W - 1 && !sil[k + 1] && x < sunX) || (x > 0 && !sil[k - 1] && x > sunX));
        const f = 1 - Math.min(1, Math.abs(x - sunX) / 230);
        put(x, y, edge ? (f > 0.62 ? RIM : f > 0.3 ? RIM_MID : RIM_DIM) : SIL);
      } else if (back[k]) put(x, y, BACK_ROW);
    }
  }
  for (const [sx, gy] of flags) {
    for (let y = 0; y < 15; y++) {
      for (let i = -4; i <= 4; i++) {
        // A forked hem: the middle of the bottom edge is cut away.
        if (y > 12 && Math.abs(i) < y - 11) continue;
        put(sx + i, gy - 55 + y, i === (sx < sunX ? 4 : -4) ? FLAG_LIT : FLAG);
      }
    }
    put(sx, gy - 61, BRONZE);
    put(sx - 1, gy - 62, BRONZE);
    put(sx + 1, gy - 62, BRONZE);
    put(sx, gy - 63, BRONZE);
  }
  g.putImageData(img, 0, 0);
  url = c.toDataURL();
  return url;
}

/** Embers rising: position (%), duration and head start (s), sideways drift (px). */
const EMBERS = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number): number => ((i * 9301 + n * 49297) % 233280) / 233280;
  return { x: 30 + r(1) * 70, d: 9 + r(2) * 10, t: r(3) * 18, dx: (r(4) - 0.5) * 120 };
});

/** The backdrop behind every menu; `dim` darkens it behind a window. */
export function Backdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div className={`backdrop ${dim ? 'dim' : ''}`} style={{ backgroundImage: `url(${art()})` }} aria-hidden>
      <div className="embers">
        {EMBERS.map((e, i) => (
          <i key={i} style={{ left: `${e.x}%`, animationDuration: `${e.d}s`, animationDelay: `${-e.t}s`, ['--drift' as string]: `${e.dx}px` }} />
        ))}
      </div>
    </div>
  );
}
