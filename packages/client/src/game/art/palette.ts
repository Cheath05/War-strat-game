// The sprite palette. Sprites are drawn with palette indices, not colours, so one atlas
// serves every army: the shader looks each pixel's index up in that army's palette row,
// where the team ramps carry the army's colours.

import { TEAM_COLORS } from '@pl/sim';

/** Special single indices. */
export const P = {
  clear: 0,
  outline: 1,
  eye: 2,
  mouth: 3,
  shine: 4,
  shadow: 5,
} as const;

/**
 * Material ramps: base index = dark, +1 = mid, +2 = light. Draw with the mid index (R.x + 1)
 * and let the shading pass pick dark/light from the neighbours.
 */
export const R = {
  skinOlive: 8,
  skinTan: 11,
  skinDark: 14,
  team: 17,
  team2: 20,
  bronze: 23,
  iron: 26,
  leather: 29,
  wood: 32,
  linen: 35,
  hair: 38,
  gold: 41,
  horse: 44,
  horseDark: 47,
  horseGrey: 50,
  elephant: 53,
  wicker: 56,
  darkCloth: 59,
  red: 62,
  white: 65,
  black: 68,
  purple: 71,
  yellow: 74,
  leaf: 77,
  leafOlive: 80,
  bark: 83,
  stone: 86,
  reed: 89,
  cypress: 92,
  canvas: 95,
  ivory: 98,
  fire: 101,
  steel: 104,
  silver: 107,
  skinLight: 110,
  hairFair: 113,
  camel: 116,
} as const;
export type Ramp = (typeof R)[keyof typeof R];

/** Mid index of a ramp (what drawing code uses). */
export const mid = (r: number): number => r + 1;
export const dark = (r: number): number => r;
export const light = (r: number): number => r + 2;

const FIXED: Record<number, number> = {
  [P.outline]: 0x24161c,
  [P.eye]: 0x1a1220,
  [P.mouth]: 0x7a3030,
  [P.shine]: 0xfff6dc,
  [P.shadow]: 0x000000,
};

const RAMPS: Record<number, [number, number, number]> = {
  [R.skinOlive]: [0xa8714a, 0xd49a6a, 0xf0c49a],
  [R.skinTan]: [0x8e5a36, 0xc0824e, 0xe2a872],
  [R.skinDark]: [0x4a2a1a, 0x744628, 0x9c6844],
  [R.bronze]: [0x84561c, 0xc8902e, 0xf2d070],
  [R.iron]: [0x545a6a, 0x8a92a4, 0xccd4e0],
  [R.leather]: [0x563620, 0x80562e, 0xaa7c48],
  [R.wood]: [0x5a3a20, 0x8a6236, 0xb48c56],
  [R.linen]: [0xaa9a7a, 0xddd0b0, 0xf8f0de],
  [R.hair]: [0x26180f, 0x46302a, 0x6a4c3c],
  [R.gold]: [0x946410, 0xd8a828, 0xffe47c],
  [R.horse]: [0x56301a, 0x8a5430, 0xb27c50],
  [R.horseDark]: [0x281c1a, 0x46342e, 0x6c5448],
  [R.horseGrey]: [0x86868c, 0xbcbcc2, 0xe8e8ec],
  [R.elephant]: [0x5a5658, 0x86817f, 0xaca7a2],
  [R.wicker]: [0x86663a, 0xb8945a, 0xdec28c],
  [R.darkCloth]: [0x26222c, 0x3e3a48, 0x5c5868],
  [R.red]: [0x741a1e, 0xb02a2e, 0xdc5c52],
  [R.white]: [0xa6a29e, 0xd8d4d0, 0xfcfaf6],
  [R.black]: [0x1a181e, 0x2e2c34, 0x4a4850],
  [R.purple]: [0x3c1a58, 0x6a2c8f, 0x9c5cc2],
  [R.yellow]: [0x987810, 0xd0b030, 0xf2e272],
  [R.leaf]: [0x1c4624, 0x2e6c34, 0x58984c],
  [R.leafOlive]: [0x485c38, 0x6e845a, 0x9aae82],
  [R.bark]: [0x382416, 0x5a3e28, 0x80603e],
  [R.stone]: [0x66605c, 0x948c84, 0xbeb6ac],
  [R.reed]: [0x667636, 0x94a456, 0xbece80],
  [R.cypress]: [0x163624, 0x285638, 0x427650],
  [R.canvas]: [0xa49676, 0xd4c6a2, 0xf2e8ca],
  [R.ivory]: [0xb8ac90, 0xe6dcc2, 0xfffaea],
  [R.fire]: [0xc84a14, 0xf2962a, 0xffe878],
  // Blackened bronze or steel, and polished silver (super units).
  [R.steel]: [0x17161c, 0x30313b, 0x5e6170],
  [R.silver]: [0x7a8292, 0xbec6d2, 0xf6f9fc],
  // Northern peoples: fair skin and fair hair; and the camel's sandy coat.
  [R.skinLight]: [0xb07a5c, 0xe4b08e, 0xffd8bc],
  [R.hairFair]: [0x8a6420, 0xc89a40, 0xecd078],
  [R.camel]: [0x8c6638, 0xc29a62, 0xe6c896],
};

/** Index → whether it belongs to a shadable ramp, and which. */
export function rampOf(i: number): number {
  if (i < 8 || i > 118) return -1;
  return 8 + Math.floor((i - 8) / 3) * 3;
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** A 3-shade ramp from one colour: cool, dark shadow and warm highlight (pixel-art style). */
export function rampFrom(c: number): [number, number, number] {
  return [mix(mix(c, 0x10142a, 0.42), c, 0.08), c, mix(mix(c, 0xfff2d0, 0.32), c, 0.1)];
}

export const PALETTE_WIDTH = 128;
/** Row for neutral things (props, terrain decals): team colours are grey. */
export const NEUTRAL_ROW = TEAM_COLORS.length;
export const PALETTE_ROWS = TEAM_COLORS.length + 1;

/** RGBA bytes for all palette rows (one per team colour, then the neutral row). */
export function buildPaletteData(): Uint8Array {
  const data = new Uint8Array(PALETTE_WIDTH * PALETTE_ROWS * 4);
  for (let row = 0; row < PALETTE_ROWS; row++) {
    const tc = TEAM_COLORS[row];
    const team = tc ? rampFrom(tc.primary) : rampFrom(0x8a8a8a);
    const team2 = tc ? rampFrom(tc.secondary) : rampFrom(0xc8c8c8);
    for (let i = 0; i < PALETTE_WIDTH; i++) {
      let c = 0;
      let a = 255;
      if (i === 0) a = 0;
      else if (i === P.outline && tc) c = mix(tc.primary, 0x0a0610, 0.72);
      else if (FIXED[i] !== undefined) c = FIXED[i]!;
      else {
        const r = rampOf(i);
        if (r >= 0) {
          const shade = i - r;
          const ramp = r === R.team ? team : r === R.team2 ? team2 : RAMPS[r];
          if (ramp) c = ramp[shade]!;
          else a = 0;
        } else a = 0;
      }
      const k = (row * PALETTE_WIDTH + i) * 4;
      data[k] = (c >> 16) & 255;
      data[k + 1] = (c >> 8) & 255;
      data[k + 2] = c & 255;
      data[k + 3] = a;
    }
  }
  return data;
}

/** The colour of an index in a palette row (for UI thumbnails and the minimap). */
export function colorOf(data: Uint8Array, row: number, i: number): [number, number, number, number] {
  const k = (row * PALETTE_WIDTH + i) * 4;
  return [data[k]!, data[k + 1]!, data[k + 2]!, data[k + 3]!];
}
