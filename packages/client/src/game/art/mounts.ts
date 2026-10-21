// Horses, elephants and chariots, with their riders drawn by the soldier doll on top.
// Horses are 48x48 frames, elephants 64x64, chariots 64x48.

import type { SpriteSpec } from '@pl/sim';
import { P, R, mid, dark, light } from './palette';
import { Px } from './px';
import { drawSoldier, type Pose, type View } from './doll';

function coat(kind: SpriteSpec['mount']): number {
  return kind === 'darkhorse' ? R.horseDark : kind === 'greyhorse' ? R.horseGrey : R.horse;
}

/** Leg swing per pose for a 4-beat walk/gallop: [front pair, back pair] offsets. */
function gait(pose: Pose): [number, number] {
  switch (pose) {
    case 'walk0':
      return [2, -2];
    case 'walk1':
      return [0, 0];
    case 'walk2':
      return [-2, 2];
    case 'walk3':
      return [0, 0];
    case 'atk1':
      return [3, -1];
    default:
      return [0, 0];
  }
}

export function drawHorseman(px: Px, spec: SpriteSpec, view: View, pose: Pose): void {
  const c = coat(spec.mount);
  const body = mid(c);
  const mane = mid(R.horseDark === c ? R.black : R.horseDark);
  const [fa, ba] = gait(pose);
  const bob = pose === 'walk1' || pose === 'walk3' || pose === 'idle1' ? 1 : 0;
  if (pose === 'dead') {
    // Horse down on its side, rider fallen beside it.
    px.ellipse(22, 40, 11, 4, body);
    px.ellipse(34, 37, 4, 3, body);
    px.rect(10, 42, 14, 2, dark(c), true);
    drawSoldier(px, spec, 0, 'dead', 26, 47);
    return;
  }
  if (view === 2) {
    // Profile, facing right: a long body, a neck reaching up and forward, a long head.
    const y = 26 + bob;
    // Legs (two pairs swinging) and hooves.
    px.rect(14 + ba, y + 6, 2, 9, dark(c));
    px.rect(17 - ba, y + 6, 2, 9, body);
    px.rect(28 + fa, y + 6, 2, 9, dark(c));
    px.rect(31 - fa, y + 6, 2, 9, body);
    for (const x of [14 + ba, 17 - ba, 28 + fa, 31 - fa]) px.rect(x, y + 15, 2, 1, P.outline, true);
    // Body and deep chest.
    px.ellipse(23, y + 2, 11, 5, body);
    px.ellipse(31, y + 1, 4, 5, body);
    // Neck, head and muzzle.
    for (let i = 0; i < 7; i++) px.rect(31 + (i >> 1), y - 1 - i, 5, 2, body);
    px.ellipse(38, y - 8, 3.5, 2.5, body);
    px.rect(39, y - 8, 4, 3, body);
    px.rect(41, y - 6, 2, 1, light(c));
    px.set(37, y - 9, P.eye, true);
    px.rect(35, y - 11, 1, 2, body);
    px.rect(37, y - 11, 1, 2, body);
    // Mane along the neck, tail behind.
    for (let i = 0; i < 7; i++) px.set(31 + (i >> 1), y - 2 - i, mane);
    px.rect(11, y - 1, 2, 3, mane);
    px.rect(10, y + 2, 2, 7, mane);
    // Saddle cloth in team colours.
    px.rect(18, y - 3, 9, 5, mid(R.team));
    px.hline(18, 26, y + 2, mid(R.team2), true);
    drawSoldier(px, spec, 2, pose, 22, y + 7, true);
    return;
  }
  // Front (toward the camera) and back views. The rider sits high with his legs down the
  // horse's flanks, and the horse's head and neck (front) or rump and tail (back) come in
  // front of him, so a horseman never reads as a man on foot.
  const y = 26 + bob;
  const front = view === 0;
  // Far legs, then near legs.
  px.rect(19 - ba, y + 6, 2, 11, dark(c));
  px.rect(27 + ba, y + 6, 2, 11, dark(c));
  px.rect(18 + fa, y + 7, 2, 12, body);
  px.rect(28 - fa, y + 7, 2, 12, body);
  for (const x of [18 + fa, 28 - fa]) px.rect(x, y + 19, 2, 1, P.outline, true);
  // Barrel and saddle cloth, wider than the rider.
  px.ellipse(24, y + 3, 8, 6, body);
  px.rect(15, y - 1, 18, 4, mid(R.team));
  px.hline(15, 32, y + 3, mid(R.team2), true);
  drawSoldier(px, spec, view, pose, 24, y + 8, true);
  // The rider's legs down the flanks.
  px.rect(15, y, 2, 6, mid(R.leather));
  px.rect(31, y, 2, 6, mid(R.leather));
  if (front) {
    px.rect(21, y - 3, 6, 8, body);
    px.ellipse(24, y + 7, 3.5, 4.5, body);
    px.ellipse(24, y + 10, 2.5, 2, light(c));
    px.set(22, y + 5, P.eye, true);
    px.set(26, y + 5, P.eye, true);
    px.rect(21, y - 5, 2, 3, mane);
    px.rect(25, y - 5, 2, 3, mane);
    px.rect(23, y - 3, 2, 6, mane);
  } else {
    px.ellipse(24, y + 4, 7, 5, body);
    px.rect(23, y + 3, 2, 10, mane);
    px.set(24, y + 13, mane);
  }
}

export function drawElephant(px: Px, spec: SpriteSpec, view: View, pose: Pose): void {
  const g = mid(R.elephant);
  const [fa, ba] = gait(pose);
  const bob = pose === 'walk1' || pose === 'walk3' ? 1 : 0;
  if (pose === 'dead') {
    px.ellipse(30, 52, 20, 7, g);
    px.ellipse(50, 50, 7, 6, g);
    px.line(55, 52, 60, 56, mid(R.ivory));
    return;
  }
  const y = 34 + bob;
  if (view === 2) {
    for (const [x, o] of [[18, ba], [24, -ba], [38, fa], [44, -fa]] as const) px.rect(x + o, y + 10, 5, 16, x === 24 || x === 44 ? g : dark(R.elephant));
    px.ellipse(31, y + 4, 18, 11, g);
    px.ellipse(50, y - 2, 8, 8, g);
    // Ear, trunk, tusk.
    px.ellipse(46, y - 1, 4, 6, dark(R.elephant));
    px.rect(56, y, 3, 14, g);
    px.rect(54, y + 12, 3, 3, g);
    px.line(55, y + 4, 60, y + 8, mid(R.ivory));
    px.set(52, y - 4, P.eye, true);
    // Tower and drapery.
    px.rect(20, y - 9, 18, 6, mid(R.team));
    px.rect(22, y - 15, 14, 7, mid(R.wood));
    px.rect(22, y - 15, 14, 1, mid(R.team2));
    drawSoldier(px, spec, 2, pose, 29, y - 9, true);
    return;
  }
  const front = view === 0;
  for (const [x, o] of [[20, fa], [38, -fa], [24, ba], [34, -ba]] as const) px.rect(x + o, y + 8, 6, 16, x === 24 || x === 34 ? dark(R.elephant) : g);
  px.ellipse(32, y + 2, 15, 11, g);
  if (front) {
    px.ellipse(32, y + 2, 8, 8, light(R.elephant));
    px.ellipse(20, y, 6, 8, dark(R.elephant));
    px.ellipse(44, y, 6, 8, dark(R.elephant));
    px.rect(30, y + 6, 4, 16, g);
    px.line(27, y + 8, 24, y + 14, mid(R.ivory));
    px.line(36, y + 8, 39, y + 14, mid(R.ivory));
    px.set(28, y, P.eye, true);
    px.set(35, y, P.eye, true);
  }
  px.rect(23, y - 12, 18, 7, mid(R.wood));
  px.rect(23, y - 12, 18, 1, mid(R.team2));
  px.rect(20, y - 6, 24, 4, mid(R.team));
  drawSoldier(px, spec, view, pose, 32, y - 6, true);
}

export function drawChariot(px: Px, spec: SpriteSpec, view: View, pose: Pose): void {
  const [fa, ba] = gait(pose);
  if (pose === 'dead') {
    px.ellipse(26, 38, 8, 3, mid(R.wood));
    px.ellipse(38, 40, 5, 5, dark(R.wood));
    px.ellipse(46, 36, 9, 4, mid(R.horse));
    return;
  }
  const y = 24;
  if (view === 2) {
    // Two horses ahead (right), car behind with scythed wheel.
    for (const hx of [40, 44]) {
      px.rect(hx - 6 + ba, y + 8, 2, 9, dark(R.horse));
      px.rect(hx + 4 + fa, y + 8, 2, 9, mid(R.horse));
      px.ellipse(hx, y + 5, 8, 4, mid(R.horse));
      px.rect(hx + 6, y - 4, 4, 8, mid(R.horse));
      px.ellipse(hx + 10, y - 4, 3, 2.5, mid(R.horse));
    }
    px.rect(14, y + 2, 16, 8, mid(R.wood));
    px.rect(14, y + 2, 16, 2, mid(R.team));
    px.ellipse(22, y + 14, 6, 6, dark(R.wood));
    px.ellipse(22, y + 14, 3, 3, mid(R.wood));
    px.line(22, y + 14, 12, y + 15, mid(R.iron));
    px.set(11, y + 15, P.shine, true);
    px.hline(29, 36, y + 6, mid(R.wood));
    drawSoldier(px, spec, 2, pose, 22, y + 8, true);
    return;
  }
  // From behind, the team pulls away beyond the car: rumps and tails above its rim.
  if (view === 1) {
    for (const hx of [24, 40]) {
      px.rect(hx - 3, y + 2, 2, 6, dark(R.horse));
      px.rect(hx + 1, y + 2, 2, 6, dark(R.horse));
      px.ellipse(hx, y + 1, 5, 4, mid(R.horse));
      px.rect(hx - 1, y, 2, 6, dark(R.horse));
    }
  }
  px.rect(18, y + 4, 28, 8, mid(R.wood));
  px.rect(18, y + 4, 28, 2, mid(R.team));
  px.ellipse(16, y + 12, 3, 6, dark(R.wood));
  px.ellipse(48, y + 12, 3, 6, dark(R.wood));
  px.line(13, y + 13, 6, y + 13, mid(R.iron));
  px.line(51, y + 13, 58, y + 13, mid(R.iron));
  drawSoldier(px, spec, view, pose, 32, y + 10, true);
  // From the front, the team comes toward us ahead of the car: heads, chests and legs.
  if (view === 0) {
    for (const hx of [26, 38]) {
      px.rect(hx - 3 + fa, y + 15, 2, 7, dark(R.horse));
      px.rect(hx + 1 - fa, y + 15, 2, 7, dark(R.horse));
      px.ellipse(hx, y + 14, 4.5, 3, mid(R.horse));
      px.rect(hx - 2, y + 6, 4, 7, mid(R.horse));
      px.ellipse(hx, y + 11, 2.5, 3.5, mid(R.horse));
      px.ellipse(hx, y + 14, 2, 1.5, light(R.horse));
      px.set(hx - 1, y + 9, P.eye, true);
      px.set(hx + 1, y + 9, P.eye, true);
      px.rect(hx - 2, y + 4, 1, 2, dark(R.horse));
      px.rect(hx + 1, y + 4, 1, 2, dark(R.horse));
    }
  }
}
