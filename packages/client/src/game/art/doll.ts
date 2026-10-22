// The paper-doll soldier generator. Every unit type's sprite spec (helmet, crest, shield,
// weapon, armour, cloth, skin) is drawn procedurally in three views (front, back, side) and
// eleven poses into a 32x36 indexed frame (room above the head for tall crests), then
// shaded and outlined. Chibi proportions: a big head about 2.5 heads tall, like Octopath
// Traveler / Final Fantasy Resonance.

import type { Material, SpriteSpec, TintPart } from '@pl/sim';
import { P, R, mid, dark, light } from './palette';
import { Px } from './px';

export type View = 0 | 1 | 2; // 0 front (facing the camera), 1 back, 2 side (facing right)
export const POSES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'atk0', 'atk1', 'atk2', 'hit', 'dead'] as const;
export type Pose = (typeof POSES)[number];

interface Look {
  skin: number;
  cloth: number;
  armor: number;
  armorPattern: 'plain' | 'mail' | 'scale' | 'muscle' | 'linen' | 'segmentata';
  helm: number;
  crest: number;
  shieldFace: number;
  shieldRim: number;
  emblem: number;
  cape: number;
  hair: number;
  /** Greaves on the shins (0: bare legs). */
  greaves: number;
  /** Gold (or other) edging on armour, helmet and shield (0: none). */
  trim: number;
}

const MATERIALS: Record<Material, number> = {
  team: R.team,
  team2: R.team2,
  bronze: R.bronze,
  iron: R.iron,
  silver: R.silver,
  steel: R.steel,
  gold: R.gold,
  red: R.red,
  black: R.black,
  white: R.white,
  purple: R.purple,
  linen: R.linen,
  leather: R.leather,
};

/** Shields of these get a glint of polished metal. */
const METALS = new Set<number>([R.bronze, R.iron, R.silver, R.steel, R.gold]);

function look(s: SpriteSpec): Look {
  const tint = (part: TintPart, usual: number): number => {
    const m = s.tint?.[part];
    return m ? MATERIALS[m] : usual;
  };
  const skin = s.skin === 'tan' || s.skin === 'brown' ? R.skinTan : s.skin === 'dark' ? R.skinDark : s.skin === 'light' ? R.skinLight : R.skinOlive;
  // Bare-chested men (Gallic fanatics) have their skin where the tunic would be.
  const cloth = tint('cloth', s.cloth === 'linen' ? R.linen : s.cloth === 'dark' ? R.darkCloth : s.cloth === 'bare' ? skin : R.team);
  const hair = s.hair === 'fair' ? R.hairFair : s.hair === 'auburn' ? R.horse : s.hair === 'grey' ? R.stone : R.hair;
  let armor: number = cloth;
  let armorPattern: Look['armorPattern'] = 'plain';
  switch (s.armor) {
    case 'linen':
    case 'quilted':
      armor = R.linen;
      armorPattern = 'linen';
      break;
    case 'bronze':
      armor = R.bronze;
      armorPattern = 'muscle';
      break;
    case 'mail':
      armor = R.iron;
      armorPattern = 'mail';
      break;
    case 'scale':
      armor = R.gold;
      armorPattern = 'scale';
      break;
    case 'leather':
      armor = R.leather;
      break;
    case 'segmentata':
      armor = R.silver;
      armorPattern = 'segmentata';
      break;
  }
  armor = tint('armor', armor);
  const clothHelm = s.helmet === 'tiara' || s.helmet === 'cap' || s.helmet === 'turban' || s.helmet === 'hood' || s.helmet === 'kausia';
  const helm = tint(
    'helm',
    s.helmet === 'crown'
      ? R.gold
      : s.helmet === 'wolfpelt'
        ? R.horse
        : s.helmet === 'lionpelt'
          ? R.wicker
          : s.helmet === 'galea' || s.helmet === 'conical'
            ? R.iron
            : s.helmet === 'nemes'
              ? R.linen
              : clothHelm
              ? s.cloth === 'team'
                ? R.team2
                : R.team
              : s.helmet === 'pilos'
                ? R.leather
                : R.bronze,
  );
  const trim = s.tint?.trim ? MATERIALS[s.tint.trim] : 0;
  const shieldFace = tint('shield', s.shield === 'spara' ? R.wicker : s.shield === 'pelte' ? R.wicker : s.shield === 'small' ? R.bronze : R.team);
  const shieldRim = trim || (s.shield === 'aspis' || s.shield === 'scutum' ? R.bronze : s.shield === 'thureos' || s.shield === 'oval' ? R.team2 : R.leather);
  return {
    skin,
    cloth,
    armor,
    armorPattern,
    helm,
    crest: tint('crest', R.team),
    shieldFace,
    shieldRim,
    emblem: tint('emblem', s.emblem === 'lambda' || s.emblem === 'owl' ? R.team2 : R.gold),
    cape: tint('cape', s.cape === 'red' ? R.red : R.team),
    hair,
    greaves: s.greaves ? (armorPattern === 'muscle' || armorPattern === 'segmentata' ? armor : R.bronze) : 0,
    trim,
  };
}

interface Frame {
  /** Vertical bob (pixels down). */
  bob: number;
  /** Leg offsets [left, right] for walking (front/back views: up; side: forward). */
  legA: number;
  legB: number;
  /** Weapon arm phase: 0 rest, 1 windup, 2 strike, 3 recover. */
  arm: number;
  hit: boolean;
}

function frameOf(pose: Pose): Frame {
  switch (pose) {
    case 'idle0':
      return { bob: 0, legA: 0, legB: 0, arm: 0, hit: false };
    case 'idle1':
      return { bob: 1, legA: 0, legB: 0, arm: 0, hit: false };
    case 'walk0':
      return { bob: 0, legA: 2, legB: -2, arm: 0, hit: false };
    case 'walk1':
      return { bob: 1, legA: 0, legB: 0, arm: 0, hit: false };
    case 'walk2':
      return { bob: 0, legA: -2, legB: 2, arm: 0, hit: false };
    case 'walk3':
      return { bob: 1, legA: 0, legB: 0, arm: 0, hit: false };
    case 'atk0':
      return { bob: 0, legA: 0, legB: 1, arm: 1, hit: false };
    case 'atk1':
      return { bob: 0, legA: 1, legB: -1, arm: 2, hit: false };
    case 'atk2':
      return { bob: 0, legA: 0, legB: 0, arm: 3, hit: false };
    case 'hit':
      return { bob: 1, legA: 0, legB: 0, arm: 0, hit: true };
    case 'dead':
      return { bob: 0, legA: 0, legB: 0, arm: 0, hit: false };
  }
}

/** Draws one soldier frame into px with its feet at (cx, footY). */
export function drawSoldier(px: Px, spec: SpriteSpec, view: View, pose: Pose, cx = 16, footY = 34, riding = false): void {
  const L = look(spec);
  if (pose === 'dead') {
    drawDead(px, spec, L, cx, footY);
    return;
  }
  const f = frameOf(pose);
  const y0 = footY - 30 + f.bob + (f.hit ? 0 : 0);
  if (view === 0) drawFront(px, spec, L, f, cx, y0, riding);
  else if (view === 1) drawBack(px, spec, L, f, cx, y0, riding);
  else drawSide(px, spec, L, f, cx, y0, riding);
}

// --- Shared parts (coordinates relative to cx and y0, where y0 + 30 is the feet) --------

function legs(px: Px, L: Look, cx: number, y0: number, f: Frame, side: boolean): void {
  const skin = mid(L.skin);
  const sandal = mid(R.leather);
  if (side) {
    // Profile: one leg forward, one back.
    const a = f.legA;
    px.rect(cx - 1 + a, y0 + 24, 2, 5, skin);
    px.rect(cx - 2 + a, y0 + 29, 4, 1, sandal);
    px.rect(cx - 1 - a, y0 + 24, 2, 5, dark(L.skin));
    px.rect(cx - 2 - a, y0 + 29, 4, 1, dark(R.leather), true);
    if (L.greaves) {
      px.rect(cx - 1 + a, y0 + 25, 2, 4, mid(L.greaves));
      px.rect(cx - 1 - a, y0 + 25, 2, 4, dark(L.greaves), true);
    }
    return;
  }
  const la = Math.max(0, -f.legA);
  const lb = Math.max(0, -f.legB);
  px.rect(cx - 3, y0 + 24, 2, 5 - la, skin);
  px.rect(cx - 4, y0 + 29 - la, 3, 1, sandal);
  px.rect(cx + 1, y0 + 24, 2, 5 - lb, skin);
  px.rect(cx + 1, y0 + 29 - lb, 3, 1, sandal);
  if (L.greaves) {
    px.rect(cx - 3, y0 + 25, 2, 4 - la, mid(L.greaves));
    px.rect(cx + 1, y0 + 25, 2, 4 - lb, mid(L.greaves));
    if (L.trim) {
      px.hline(cx - 3, cx - 2, y0 + 25, mid(L.trim), true);
      px.hline(cx + 1, cx + 2, y0 + 25, mid(L.trim), true);
    }
  }
}

function skirt(px: Px, L: Look, cx: number, y0: number, wide: number): void {
  // Tunic hem / pteruges below the belt.
  px.rect(cx - 4 - wide, y0 + 21, 8 + wide * 2, 3, mid(L.cloth));
  for (let x = cx - 4 - wide; x < cx + 4 + wide; x += 2) px.set(x, y0 + 23, dark(L.cloth), true);
}

function torso(px: Px, L: Look, spec: SpriteSpec, cx: number, y0: number, back: boolean): void {
  const a = mid(L.armor);
  px.rect(cx - 4, y0 + 15, 8, 6, a);
  px.rect(cx - 5, y0 + 15, 10, 2, a); // shoulders
  if (back && L.armor !== L.cloth && L.armorPattern !== 'segmentata') {
    // From behind, the tunic shows between the shoulder straps and below the armour.
    px.rect(cx - 3, y0 + 17, 6, 4, mid(L.cloth));
    px.rect(cx - 5, y0 + 15, 2, 2, mid(L.cloth));
    px.rect(cx + 3, y0 + 15, 2, 2, mid(L.cloth));
  }
  if (L.armorPattern === 'mail') {
    for (let y = y0 + 16; y < y0 + 21; y++) for (let x = cx - 4 + ((y + cx) % 2); x < cx + 4; x += 2) px.set(x, y, dark(L.armor), true);
  } else if (L.armorPattern === 'scale') {
    for (let y = y0 + 16; y < y0 + 21; y += 2) for (let x = cx - 4 + (y % 4 === 0 ? 1 : 0); x < cx + 4; x += 2) px.set(x, y, dark(L.armor), true);
  } else if (L.armorPattern === 'muscle' && !back) {
    px.set(cx - 2, y0 + 17, light(L.armor), true);
    px.set(cx + 1, y0 + 17, light(L.armor), true);
    px.set(cx - 1, y0 + 19, dark(L.armor), true);
    px.set(cx, y0 + 19, dark(L.armor), true);
  } else if (L.armorPattern === 'linen') {
    // Linothorax with coloured shoulder flaps.
    px.rect(cx - 5, y0 + 15, 2, 2, mid(R.team));
    px.rect(cx + 3, y0 + 15, 2, 2, mid(R.team));
  } else if (L.armorPattern === 'segmentata') {
    // Lorica segmentata: hoops of plate round the body, plates over the shoulders, brass buckles.
    px.hline(cx - 4, cx + 3, y0 + 17, dark(L.armor), true);
    px.hline(cx - 4, cx + 3, y0 + 19, dark(L.armor), true);
    px.hline(cx - 5, cx - 3, y0 + 16, dark(L.armor), true);
    px.hline(cx + 2, cx + 4, y0 + 16, dark(L.armor), true);
    if (!back) {
      px.set(cx - 2, y0 + 18, mid(R.gold), true);
      px.set(cx + 1, y0 + 18, mid(R.gold), true);
    }
  }
  // Belt.
  px.hline(cx - 4, cx + 3, y0 + 21, mid(R.leather));
  if (spec.body === 'heavy') px.set(cx, y0 + 21, mid(R.gold), true);
  if (spec.body === 'robe') px.rect(cx - 5, y0 + 21, 10, 6, mid(L.cloth));
  if (L.trim) {
    // Gilded edges: a gold neckline, medallions on the shoulders and a gold belt.
    px.hline(cx - 2, cx + 1, y0 + 15, mid(L.trim), true);
    px.rect(cx - 5, y0 + 15, 2, 2, mid(L.trim), true);
    px.rect(cx + 3, y0 + 15, 2, 2, mid(L.trim), true);
    px.hline(cx - 4, cx + 3, y0 + 21, mid(L.trim), true);
    if (!back) px.hline(cx - 1, cx, y0 + 21, light(L.trim), true);
  }
}

/** The legionary's belt apron: leather straps with brass studs. */
function apron(px: Px, cx: number, y0: number): void {
  for (const x of [cx - 2, cx, cx + 2]) {
    px.vline(x, y0 + 22, y0 + 24, dark(R.leather), true);
    px.set(x, y0 + 23, mid(R.gold), true);
  }
}

function head(px: Px, L: Look, spec: SpriteSpec, cx: number, y0: number, view: View): void {
  const hy = y0 + 10.5;
  const skin = mid(L.skin);
  // Face / back of head.
  px.ellipse(cx - 0.5, hy, 4.5, 4.3, view === 1 ? mid(L.hair) : skin);
  if (view === 0) {
    // Hair fringe, eyes, beard.
    px.rect(cx - 5, y0 + 6, 9, 2, mid(L.hair));
    px.set(cx - 3, y0 + 11, P.eye, true);
    px.set(cx - 3, y0 + 12, P.eye, true);
    px.set(cx + 1, y0 + 11, P.eye, true);
    px.set(cx + 1, y0 + 12, P.eye, true);
    if (spec.beard) {
      px.rect(cx - 3, y0 + 14, 5, 1, mid(L.hair));
      px.set(cx - 1, y0 + 15, mid(L.hair));
    }
  } else if (view === 2) {
    // Profile: hair at the back, eye and nose at the front.
    px.rect(cx - 5, y0 + 7, 4, 6, mid(L.hair));
    px.set(cx + 2, y0 + 11, P.eye, true);
    px.set(cx + 2, y0 + 12, P.eye, true);
    px.set(cx + 4, y0 + 12, skin);
    if (spec.beard) px.rect(cx + 1, y0 + 14, 3, 1, mid(L.hair));
  }
  helmet(px, L, spec, cx, y0, view);
  crest(px, L, spec, cx, y0, view);
}

function helmet(px: Px, L: Look, spec: SpriteSpec, cx: number, y0: number, view: View): void {
  const h = mid(L.helm);
  const hd = dark(L.helm);
  const ey = y0 + 11;
  switch (spec.helmet) {
    case 'none':
    case 'headband':
      if (spec.helmet === 'headband') px.hline(cx - 5, cx + 3, y0 + 8, mid(R.team2));
      return;
    case 'corinthian': {
      // Full bronze helmet; the face shows through a T-shaped slot.
      px.ellipse(cx - 0.5, y0 + 10, 5, 5, h);
      if (view === 0) {
        px.hline(cx - 4, cx - 2, ey, P.eye, true);
        px.hline(cx + 1, cx + 3, ey, P.eye, true);
        px.vline(cx - 1, ey, y0 + 14, h);
        px.rect(cx - 1, y0 + 13, 2, 2, mid(L.skin));
        if (spec.beard) px.rect(cx - 1, y0 + 15, 2, 1, mid(L.hair));
      } else if (view === 2) {
        px.hline(cx + 1, cx + 4, ey, P.eye, true);
        px.rect(cx + 2, y0 + 12, 2, 2, mid(L.skin));
        px.set(cx - 5, y0 + 14, hd, true);
      }
      px.hline(cx - 5, cx + 4, y0 + 7, L.trim ? mid(L.trim) : light(L.helm), true);
      return;
    }
    case 'galea': {
      // Imperial Gallic helmet: a rounded bowl, a brow ridge, hinged cheek guards and a
      // broad neck guard at the back.
      px.ellipse(cx - 0.5, y0 + 8.5, 5, 3.8, h);
      px.rect(cx - 5, y0 + 8, 10, 2, h);
      px.hline(cx - 5, cx + 4, y0 + 9, L.trim ? mid(L.trim) : light(L.helm), true);
      if (view === 0) {
        px.rect(cx - 5, y0 + 10, 2, 5, h);
        px.rect(cx + 3, y0 + 10, 2, 5, h);
        px.set(cx - 4, y0 + 12, L.trim ? mid(L.trim) : light(L.helm), true);
        px.set(cx + 3, y0 + 12, L.trim ? mid(L.trim) : light(L.helm), true);
      } else if (view === 2) {
        px.rect(cx - 1, y0 + 10, 2, 4, h);
        px.rect(cx - 7, y0 + 11, 4, 2, h);
        px.set(cx - 8, y0 + 12, h);
      } else {
        px.rect(cx - 5, y0 + 10, 10, 3, h);
        px.hline(cx - 6, cx + 5, y0 + 13, h);
      }
      px.rect(cx - 1, y0 + 4, 2, 1, L.trim ? mid(L.trim) : h);
      return;
    }
    case 'lionpelt': {
      // A lion's head worn as a hood: ears and eyes above the brow, the mane round the face,
      // the pelt hanging down the back.
      const mane = mid(R.horse);
      px.ellipse(cx - 0.5, y0 + 8, 5, 3.5, h);
      px.set(cx - 4, y0 + 4, h);
      px.set(cx + 3, y0 + 4, h);
      if (view === 0) {
        px.set(cx - 2, y0 + 7, P.eye, true);
        px.set(cx + 1, y0 + 7, P.eye, true);
        px.hline(cx - 1, cx, y0 + 9, light(L.helm), true);
        px.rect(cx - 6, y0 + 8, 2, 8, mane);
        px.rect(cx + 4, y0 + 8, 2, 8, mane);
      } else if (view === 2) {
        px.set(cx + 2, y0 + 7, P.eye, true);
        px.rect(cx + 3, y0 + 8, 2, 1, h);
        px.rect(cx - 6, y0 + 7, 4, 9, mane);
      } else {
        px.rect(cx - 6, y0 + 8, 12, 4, mane);
        px.rect(cx - 5, y0 + 12, 10, 9, h);
        for (let y = y0 + 13; y < y0 + 21; y += 2) px.hline(cx - 4, cx + 3, y, dark(L.helm), true);
      }
      return;
    }
    case 'attic':
    case 'chalcidian':
    case 'montefortino':
    case 'boeotian':
    case 'pilos': {
      // A dome over the top of the head, with cheek guards.
      px.ellipse(cx - 0.5, y0 + 8.5, 5, 3.5, h);
      px.rect(cx - 5, y0 + 8, 10, 2, h);
      if (view !== 1) {
        px.rect(cx - 5, y0 + 10, 2, view === 2 ? 1 : 4, h);
        if (view === 0) px.rect(cx + 3, y0 + 10, 2, 4, h);
      } else {
        px.rect(cx - 5, y0 + 10, 10, 3, h);
      }
      if (spec.helmet === 'montefortino') {
        px.set(cx - 1, y0 + 4, h);
        px.set(cx, y0 + 4, h);
        px.set(cx - 1, y0 + 3, mid(R.gold));
      }
      if (spec.helmet === 'attic') px.hline(cx - 4, cx + 3, y0 + 8, mid(R.gold), true);
      if (spec.helmet === 'boeotian') px.hline(cx - 7, cx + 6, y0 + 9, h);
      if (spec.helmet === 'pilos') {
        px.rect(cx - 3, y0 + 3, 5, 3, h);
        px.rect(cx - 2, y0 + 1, 3, 2, h);
      }
      return;
    }
    case 'phrygian': {
      // Tall cap curving forward at the top.
      px.ellipse(cx - 0.5, y0 + 8, 5, 3.5, h);
      px.rect(cx - 5, y0 + 8, 10, 2, h);
      px.rect(cx - 2, y0 + 3, 4, 3, h);
      px.set(view === 1 ? cx - 3 : cx + 2, y0 + 3, h);
      if (view !== 1) px.rect(cx - 5, y0 + 10, 2, 4, h);
      return;
    }
    case 'tiara':
    case 'hood':
    case 'cap':
    case 'turban': {
      // Soft cloth cap; the Persian tiara also wraps the chin.
      px.ellipse(cx - 0.5, y0 + 8.5, 5, 3.8, h);
      if (spec.helmet === 'turban') for (let x = cx - 5; x <= cx + 4; x += 2) px.set(x, y0 + 8, dark(L.helm), true);
      if (spec.helmet === 'tiara' || spec.helmet === 'hood') {
        if (view === 0) {
          px.rect(cx - 5, y0 + 10, 2, 5, h);
          px.rect(cx + 3, y0 + 10, 2, 5, h);
          px.rect(cx - 3, y0 + 14, 6, 2, h);
        } else if (view === 2) {
          px.rect(cx - 5, y0 + 9, 4, 7, h);
          px.rect(cx, y0 + 14, 4, 2, h);
        } else {
          px.rect(cx - 5, y0 + 9, 10, 6, h);
        }
        px.rect(cx - 1, y0 + 3, 2, 2, h);
      }
      return;
    }
    case 'kausia':
      px.ellipse(cx - 0.5, y0 + 7.5, 6, 2.5, h);
      px.hline(cx - 6, cx + 5, y0 + 9, hd, true);
      return;
    case 'wolfpelt': {
      // A wolf's head worn as a cap, ears up.
      px.ellipse(cx - 0.5, y0 + 8, 5, 3.5, h);
      px.set(cx - 4, y0 + 4, h);
      px.set(cx - 4, y0 + 5, h);
      px.set(cx + 3, y0 + 4, h);
      px.set(cx + 3, y0 + 5, h);
      if (view !== 0) px.rect(cx - 5, y0 + 9, 10, 6, h);
      else {
        px.set(cx - 2, y0 + 8, P.eye, true);
        px.set(cx + 1, y0 + 8, P.eye, true);
      }
      return;
    }
    case 'crown':
      px.rect(cx - 5, y0 + 6, 10, 2, h);
      for (let x = cx - 5; x <= cx + 4; x += 3) px.set(x, y0 + 5, h);
      return;
    case 'nemes': {
      // The striped headcloth of Egypt: over the crown, lappets falling to the shoulders.
      const stripe = L.trim ? mid(L.trim) : mid(R.team);
      px.ellipse(cx - 0.5, y0 + 8.5, 5, 3.8, h);
      for (let x = cx - 4; x <= cx + 3; x += 2) px.set(x, y0 + 6, stripe, true);
      if (view === 0) {
        px.rect(cx - 6, y0 + 9, 2, 8, h);
        px.rect(cx + 4, y0 + 9, 2, 8, h);
        for (let y = y0 + 10; y < y0 + 17; y += 2) {
          px.hline(cx - 6, cx - 5, y, stripe, true);
          px.hline(cx + 4, cx + 5, y, stripe, true);
        }
      } else if (view === 2) {
        px.rect(cx - 6, y0 + 8, 4, 8, h);
        for (let y = y0 + 9; y < y0 + 16; y += 2) px.hline(cx - 6, cx - 3, y, stripe, true);
      } else {
        px.rect(cx - 6, y0 + 8, 12, 7, h);
        px.rect(cx - 1, y0 + 15, 2, 3, h);
        for (let y = y0 + 9; y < y0 + 15; y += 2) px.hline(cx - 6, cx + 5, y, stripe, true);
      }
      return;
    }
    case 'conical': {
      // A pointed iron helmet with a band round the brow (Babylon, Assyria, the steppe).
      px.ellipse(cx - 0.5, y0 + 8.5, 5, 3.2, h);
      px.rect(cx - 3, y0 + 4, 6, 3, h);
      px.rect(cx - 2, y0 + 2, 4, 2, h);
      px.rect(cx - 1, y0, 2, 2, h);
      px.hline(cx - 5, cx + 4, y0 + 9, L.trim ? mid(L.trim) : dark(L.helm), true);
      if (view === 1) px.rect(cx - 5, y0 + 10, 10, 2, h);
      else if (view === 2) px.rect(cx - 5, y0 + 10, 2, 3, h);
      return;
    }
  }
}

// Horsehair crests as pixel templates: c is the crest colour (shaded by the light pass),
// D and L its dark and light strands. Front views also serve for the back.
const CREST_ART: Record<string, { front: string[]; side: string[]; fx: number; fy: number; sx: number; sy: number }> = {
  // Sparta's crest: tall and bushy, front to back, its tail falling down the neck.
  great: {
    front: ['..cccc..', '.cLLccc.', 'cLLcDccc', 'ccDccDcc', 'cDccDccD', '.cDccDc.', '..cDcc..', '...cc...'],
    fx: -4,
    fy: -3,
    side: [
      '....cccc.....',
      '..ccLLLccc...',
      '.cLLccDccDc..',
      'cLccDccDcccc.',
      'ccDccDccDccc.',
      'cDccDccDccc..',
      'cDcDcc.ccc...',
      'cDcc...cc....',
      'cDc..........',
      'ccD..........',
      '.cD..........',
      '.cc..........',
      '..c..........',
    ],
    sx: -8,
    sy: -3,
  },
  // A smaller front-to-back crest (hoplites and others).
  long: {
    front: ['.ccc.', 'cLccc', 'cDcDc', '.cDc.', '..c..'],
    fx: -3,
    fy: 0,
    side: ['...cccc...', '.ccLLccc..', 'cLccDccDc.', 'cDcDccc...', 'cDc..cc...', 'cc........', '.c........'],
    sx: -7,
    sy: 0,
  },
  // Side to side, like a centurion's: wide from the front, thin in profile.
  transverse: {
    front: ['..ccccccccc..', '.cLLLLLLLLLc.', 'cLcDcDcDcDccc', 'ccDcDcDcDcDcc', '..cc.....cc..', '......c......'],
    fx: -7,
    fy: -1,
    side: ['.cc.', 'cLcc', 'cDcc', 'ccDc', '.cc.', '..c.'],
    sx: -2,
    sy: -1,
  },
  // An upright tuft on the crown (Roman legionaries).
  plume: {
    front: ['.cc.', 'cLcc', 'cLDc', 'ccDc', '.cc.', '.c..'],
    fx: -2,
    fy: -2,
    side: ['.ccc.', 'cLLcc', 'cLcDc', 'cDcDc', '.cDc.', '..cc.'],
    sx: -3,
    sy: -2,
  },
};

function crest(px: Px, L: Look, spec: SpriteSpec, cx: number, y0: number, view: View): void {
  const c = mid(L.crest);
  const key = { c, D: dark(L.crest), L: light(L.crest) };
  const art = CREST_ART[spec.crest];
  if (art) {
    if (view === 2) px.stamp(art.side, cx + art.sx, y0 + art.sy, key);
    else px.stamp(art.front, cx + art.fx, y0 + art.fy, key, view === 1);
    // From behind, the great crest's tail falls down the back of the helmet.
    if (spec.crest === 'great' && view === 1) px.stamp(['cD', 'Dc', 'cD', 'Dc', 'cD', 'Dc', 'cc', '.c'], cx - 1, y0 + 5, key);
    return;
  }
  if (spec.crest === 'feathers') {
    // Three tall feathers (hastati): dark and team-coloured.
    if (view === 2) {
      for (let i = 0; i < 3; i++) px.vline(cx - 2 + i, y0 + 1, y0 + 4, i === 1 ? c : mid(R.black));
    } else {
      px.vline(cx - 3, y0 + 1, y0 + 4, mid(R.black));
      px.vline(cx - 1, y0 + 0, y0 + 4, c);
      px.vline(cx + 1, y0 + 1, y0 + 4, mid(R.black));
    }
  }
}

function cape(px: Px, L: Look, spec: SpriteSpec, cx: number, y0: number, view: View): void {
  if (!spec.cape || spec.cape === 'none') return;
  const c = mid(L.cape);
  if (view === 1) {
    px.rect(cx - 5, y0 + 15, 10, 11, c);
    px.rect(cx - 4, y0 + 26, 8, 1, c);
    for (let y = y0 + 18; y < y0 + 26; y += 3) px.set(cx - 1, y, dark(L.cape), true);
  } else if (view === 2) {
    px.rect(cx - 5, y0 + 15, 3, 10, c);
  } else {
    px.rect(cx - 6, y0 + 15, 1, 8, c);
    px.rect(cx + 5, y0 + 15, 1, 8, c);
  }
}

// --- Shields ------------------------------------------------------------------------------

function shield(px: Px, L: Look, spec: SpriteSpec, sx: number, sy: number, view: View, front: boolean): void {
  if (spec.shield === 'none') return;
  const face = front ? mid(L.shieldFace) : mid(R.wood);
  const rim = mid(L.shieldRim);
  switch (spec.shield) {
    case 'aspis':
      px.ellipse(sx, sy, 6, 6, rim);
      px.ellipse(sx, sy, 4.8, 4.8, face);
      if (front) {
        emblem(px, L, spec, sx, sy);
        if (METALS.has(L.shieldFace)) px.set(sx - 3, sy - 3, P.shine, true);
      }
      break;
    case 'scutum':
      // Tall curved rectangle with a brass edge and an iron boss.
      px.rect(sx - 4, sy - 7, 9, 15, rim);
      px.rect(sx - 3, sy - 6, 7, 13, face);
      px.set(sx - 4, sy - 7, 0);
      px.set(sx + 4, sy - 7, 0);
      px.set(sx - 4, sy + 7, 0);
      px.set(sx + 4, sy + 7, 0);
      if (front) {
        if (spec.emblem === 'wings') {
          // Jupiter's thunderbolts and wings, radiating from the boss.
          px.stamp(SCUTUM_WINGS, sx - 3, sy - 6, { G: mid(L.emblem), B: mid(R.iron), S: P.shine });
        } else {
          px.rect(sx - 1, sy - 1, 3, 3, mid(R.iron));
          px.set(sx, sy, P.shine, true);
        }
      }
      break;
    case 'thureos':
    case 'oval':
      px.ellipse(sx, sy, 4.3, 6.8, rim);
      px.ellipse(sx, sy, 3.3, 5.8, face);
      if (front) px.vline(sx, sy - 5, sy + 5, spec.shield === 'thureos' ? mid(R.iron) : mid(R.team2));
      break;
    case 'parma':
    case 'small':
      px.ellipse(sx, sy, spec.shield === 'small' ? 3 : 4, spec.shield === 'small' ? 3 : 4, rim);
      px.ellipse(sx, sy, spec.shield === 'small' ? 2 : 3, spec.shield === 'small' ? 2 : 3, face);
      if (front) px.set(sx, sy, P.shine, true);
      break;
    case 'pelte':
      // Crescent-shaped light shield.
      px.ellipse(sx, sy, 4.5, 3.6, rim);
      px.ellipse(sx, sy, 3.5, 2.6, face);
      px.rect(sx - 1, sy - 4, 3, 2, 0);
      if (front) px.hline(sx - 2, sx + 2, sy + 1, mid(R.team), true);
      break;
    case 'spara':
      // Tall wicker shield of the Persian front rank.
      px.rect(sx - 4, sy - 8, 9, 17, rim);
      px.rect(sx - 3, sy - 7, 7, 15, face);
      for (let y = sy - 6; y < sy + 8; y += 2) px.hline(sx - 3, sx + 3, y, dark(R.wicker), true);
      break;
  }
}

const SCUTUM_WINGS = ['.......', '...G...', '..G....', '...G...', 'G..G..G', '.GGBGG.', '..BSB..', '.GGBGG.', 'G..G..G', '...G...', '....G..', '...G...', '.......'];

function emblem(px: Px, L: Look, spec: SpriteSpec, sx: number, sy: number): void {
  const e = mid(L.emblem);
  switch (spec.emblem) {
    case 'lambda':
      // Sparta's Λ from rim to rim, with a heavier right stroke.
      px.line(sx, sy - 4, sx - 3, sy + 3, e, true);
      px.line(sx, sy - 4, sx + 3, sy + 3, e, true);
      px.line(sx + 1, sy - 3, sx + 4, sy + 2, e, true);
      break;
    case 'owl':
      px.set(sx - 1, sy - 1, e, true);
      px.set(sx + 1, sy - 1, e, true);
      px.set(sx, sy + 1, e, true);
      break;
    case 'star':
    case 'sun':
      px.set(sx, sy, e, true);
      for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]] as const) px.set(sx + dx, sy + dy, e, true);
      break;
    case 'crescent':
      px.line(sx - 2, sy - 1, sx, sy + 2, e, true);
      px.line(sx, sy + 2, sx + 2, sy - 1, e, true);
      break;
    case 'lion':
    case 'boss':
    case 'eagle':
      px.ellipse(sx, sy, 1.2, 1.2, e, true);
      break;
    default:
      px.set(sx, sy, mid(R.bronze), true);
  }
}

// --- Weapons ------------------------------------------------------------------------------

/** Draws the weapon held in the hand at (hx, hy). dir: 1 points right (side view), 0 upright. */
function weapon(px: Px, spec: SpriteSpec, hx: number, hy: number, f: Frame, view: View): void {
  const wood = mid(R.wood);
  const iron = mid(R.iron);
  switch (spec.weapon) {
    case 'spear':
    case 'lance':
    case 'pike': {
      const len = spec.weapon === 'pike' ? 30 : 22;
      if (view === 2) {
        if (f.arm === 0) {
          // Upright, resting.
          px.vline(hx, hy - len + 9, hy + 6, wood);
          px.rect(hx, hy - len + 7, 1, 2, iron);
          px.set(hx, hy - len + 6, P.shine, true);
        } else {
          // Levelled and thrust forward.
          const reach = f.arm === 2 ? 5 : f.arm === 1 ? -3 : 1;
          const tip = hx + len - 8 + reach;
          px.hline(hx - 8 + reach, tip, hy - 2, wood);
          px.hline(tip, tip + 2, hy - 2, iron);
          px.set(tip + 3, hy - 2, P.shine, true);
        }
      } else {
        const lift = f.arm === 1 ? -3 : f.arm === 2 ? 2 : 0;
        px.vline(hx, hy - len + 9 + lift, hy + 6 + lift, wood);
        px.rect(hx, hy - len + 6 + lift, 1, 3, iron);
        if (view === 0) px.set(hx, hy - len + 5 + lift, P.shine, true);
      }
      return;
    }
    case 'sword':
    case 'falcata':
    case 'axe': {
      if (f.arm === 1) {
        px.vline(hx, hy - 9, hy - 3, iron);
        px.set(hx, hy - 10, P.shine, true);
      } else if (f.arm === 2) {
        const d = view === 2 ? 1 : -1;
        px.line(hx, hy, hx + d * 6, hy + 4, iron);
        px.set(hx + d * 6, hy + 4, P.shine, true);
      } else {
        px.vline(hx, hy + 1, hy + 6, iron);
        px.set(hx, hy, mid(R.gold));
      }
      if (spec.weapon === 'axe' && f.arm !== 2) px.rect(hx - 1, f.arm === 1 ? hy - 9 : hy + 4, 3, 2, iron);
      return;
    }
    case 'javelin': {
      if (f.arm === 2) return; // just thrown
      const lift = f.arm === 1 ? -4 : 0;
      if (view === 2 && f.arm === 1) {
        px.hline(hx - 7, hx + 7, hy - 4, wood);
        px.set(hx + 8, hy - 4, iron);
      } else {
        px.vline(hx, hy - 12 + lift, hy + 4 + lift, wood);
        px.set(hx, hy - 13 + lift, iron);
      }
      return;
    }
    case 'bow': {
      // Held in the off hand; drawn on the strike frame.
      const bx = view === 2 ? hx + 3 : hx;
      px.line(bx, hy - 7, bx + (view === 2 ? 2 : 1), hy - 3, wood);
      px.line(bx + (view === 2 ? 2 : 1), hy - 3, bx + (view === 2 ? 2 : 1), hy + 3, wood);
      px.line(bx + (view === 2 ? 2 : 1), hy + 3, bx, hy + 7, wood);
      const pull = f.arm === 2 ? 3 : f.arm === 1 ? 1 : 0;
      px.line(bx - pull, hy - 6, bx - pull, hy + 6, mid(R.linen));
      if (f.arm === 1 || f.arm === 2) px.hline(bx - pull, bx + 5, hy, mid(R.wood));
      return;
    }
    case 'rhomphaia': {
      // A long haft with a heavy curved blade, swung two-handed.
      if (f.arm === 2) {
        const d = view === 2 ? 1 : -1;
        px.line(hx, hy, hx + d * 4, hy + 3, wood);
        px.line(hx + d * 4, hy + 3, hx + d * 10, hy + 4, iron);
        px.set(hx + d * 11, hy + 3, iron);
        px.set(hx + d * 10, hy + 4, P.shine, true);
        return;
      }
      const lift = f.arm === 1 ? -4 : 0;
      px.vline(hx, hy - 8 + lift, hy + 6 + lift, wood);
      px.vline(hx, hy - 15 + lift, hy - 9 + lift, iron);
      px.set(hx + 1, hy - 15 + lift, iron);
      px.set(hx + 1, hy - 16 + lift, iron);
      px.set(hx, hy - 14 + lift, P.shine, true);
      return;
    }
    case 'khopesh': {
      // The sickle-sword: a straight grip, then a blade curving out into a hook.
      if (f.arm === 1) {
        px.vline(hx, hy - 7, hy - 3, iron);
        px.set(hx + 1, hy - 8, iron);
        px.set(hx + 1, hy - 9, P.shine, true);
      } else if (f.arm === 2) {
        const d = view === 2 ? 1 : -1;
        px.line(hx, hy, hx + d * 5, hy + 3, iron);
        px.set(hx + d * 6, hy + 2, iron);
        px.set(hx + d * 6, hy + 1, P.shine, true);
      } else {
        px.vline(hx, hy + 1, hy + 5, iron);
        px.set(hx + 1, hy + 6, iron);
        px.set(hx, hy, mid(R.gold));
      }
      return;
    }
    case 'sling': {
      if (f.arm === 1) {
        px.ellipse(hx, hy - 9, 2, 2, mid(R.leather));
        px.set(hx, hy - 9, 0);
      } else {
        px.vline(hx, hy, hy + 4, mid(R.leather));
        px.set(hx, hy + 5, mid(R.stone));
      }
      return;
    }
  }
}

// --- Views --------------------------------------------------------------------------------

function drawFront(px: Px, spec: SpriteSpec, L: Look, f: Frame, cx: number, y0: number, riding: boolean): void {
  const lean = f.hit ? 1 : 0;
  const y = y0 + lean;
  if (!riding) legs(px, L, cx, y, f, false);
  cape(px, L, spec, cx, y, 0);
  skirt(px, L, cx, y, spec.body === 'heavy' ? 1 : 0);
  torso(px, L, spec, cx, y, false);
  if (L.armorPattern === 'segmentata') apron(px, cx, y);
  // Arms: weapon arm on the viewer's left, shield arm on the right.
  const armUp = f.arm === 1 ? -4 : 0;
  px.rect(cx - 6, y + 15 + armUp, 2, 5, mid(L.skin));
  px.rect(cx + 4, y + 15, 2, 5, mid(L.skin));
  head(px, L, spec, cx, y, 0);
  const archer = spec.weapon === 'bow';
  if (archer) {
    weapon(px, spec, cx + 6, y + 18, f, 0);
    if (spec.shield !== 'none') shield(px, L, spec, cx - 6, y + 19, 0, false);
  } else {
    weapon(px, spec, cx - 6, y + 20 + armUp, f, 0);
    shield(px, L, spec, cx + 4, y + 19, 0, true);
  }
}

function drawBack(px: Px, spec: SpriteSpec, L: Look, f: Frame, cx: number, y0: number, riding: boolean): void {
  const y = y0;
  // The shield hangs on the left arm, mostly hidden behind the body.
  if (spec.weapon !== 'bow') shield(px, L, spec, cx - 6, y + 19, 1, false);
  if (!riding) legs(px, L, cx, y, f, false);
  skirt(px, L, cx, y, spec.body === 'heavy' ? 1 : 0);
  torso(px, L, spec, cx, y, true);
  const armUp = f.arm === 1 ? -4 : 0;
  px.rect(cx + 4, y + 15 + armUp, 2, 5, mid(L.skin));
  px.rect(cx - 6, y + 15, 2, 5, mid(L.skin));
  cape(px, L, spec, cx, y, 1);
  head(px, L, spec, cx, y, 1);
  if (spec.weapon === 'bow') weapon(px, spec, cx - 7, y + 18, f, 1);
  else weapon(px, spec, cx + 5, y + 20 + armUp, f, 1);
}

function drawSide(px: Px, spec: SpriteSpec, L: Look, f: Frame, cx: number, y0: number, riding: boolean): void {
  const y = y0 + (f.hit ? 1 : 0);
  const x = cx - (f.hit ? 1 : 0);
  // Spear-armed men level their spear over the shield; draw it first so it sits behind.
  const spear = spec.weapon === 'spear' || spec.weapon === 'pike' || spec.weapon === 'lance';
  if (spear && f.arm !== 0) weapon(px, spec, x + 1, y + 16, f, 2);
  if (!riding) legs(px, L, x, y, f, true);
  cape(px, L, spec, x, y, 2);
  px.rect(x - 3, y + 21, 7, 3, mid(L.cloth));
  px.rect(x - 3, y + 15, 7, 6, mid(L.armor));
  px.hline(x - 3, x + 3, y + 21, mid(R.leather));
  head(px, L, spec, x, y, 2);
  if (spec.weapon === 'bow') {
    weapon(px, spec, x + 2, y + 18, f, 2);
  } else {
    // Weapon arm reaches forward on a strike.
    const ax = f.arm === 2 ? x + 4 : x + 1;
    px.rect(ax, y + 16, 2, 4, mid(L.skin));
    if (!spear || f.arm === 0) weapon(px, spec, ax + 1, y + 20 - (f.arm === 1 ? 4 : 0), f, 2);
    shield(px, L, spec, x + 2, y + 19, 2, true);
  }
}

function drawDead(px: Px, spec: SpriteSpec, L: Look, cx: number, footY: number): void {
  // Lying on his back, seen from the side: legs to the right.
  const y = footY - 3;
  px.rect(cx - 2, y - 1, 9, 3, mid(L.armor));
  px.rect(cx + 7, y, 6, 2, mid(L.skin));
  px.ellipse(cx - 6, y, 3.5, 3, spec.helmet === 'none' ? mid(L.hair) : mid(L.helm));
  px.set(cx - 5, y - 1, mid(L.skin));
  if (spec.shield !== 'none') {
    px.ellipse(cx + 3, y - 3, 3.5, 1.5, mid(L.shieldFace));
  }
  if (spec.weapon === 'spear' || spec.weapon === 'pike' || spec.weapon === 'javelin' || spec.weapon === 'lance') {
    px.line(cx - 12, y + 2, cx + 12, y + 1, mid(R.wood));
  }
}
