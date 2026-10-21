// Formation geometry and modifiers. Slots are implicit: a soldier's slot is its position
// in unit.sol (officer excluded), so when men fall the rear ranks step up.

import type { UnitTypeDef } from '../data/types';
import type { FormationKind, Unit } from '../types';

export interface FormInfo {
  name: string;
  /** Spacing between files and ranks in metres (infantry; scaled for mounts). */
  spX: number;
  spY: number;
  atk: number;
  def: number;
  /** Extra defence against attacks from the front. */
  frontDef: number;
  /** Extra chance (%) to block missiles from the front and above. */
  missileBlock: number;
  speed: number;
  /** Braced against charges from the front. */
  brace: boolean;
  /** Can't run in this formation. */
  noRun: boolean;
  chargeBonus: number;
}

export const FORM: Record<FormationKind, FormInfo> = {
  line: { name: 'Line', spX: 1.15, spY: 1.35, atk: 0, def: 0, frontDef: 0, missileBlock: 0, speed: 1, brace: false, noRun: false, chargeBonus: 0 },
  loose: { name: 'Loose', spX: 2.3, spY: 2.4, atk: -2, def: -4, frontDef: 0, missileBlock: 0, speed: 1.05, brace: false, noRun: false, chargeBonus: 0 },
  phalanx: { name: 'Phalanx', spX: 0.95, spY: 1.1, atk: 0, def: 0, frontDef: 8, missileBlock: 5, speed: 0.8, brace: true, noRun: true, chargeBonus: 0 },
  testudo: { name: 'Testudo', spX: 0.85, spY: 0.9, atk: -10, def: 6, frontDef: 6, missileBlock: 55, speed: 0.55, brace: false, noRun: true, chargeBonus: 0 },
  shieldwall: { name: 'Shield wall', spX: 0.95, spY: 1.1, atk: -4, def: 6, frontDef: 6, missileBlock: 15, speed: 0.8, brace: true, noRun: true, chargeBonus: 0 },
  wedge: { name: 'Wedge', spX: 1.5, spY: 1.7, atk: 2, def: -4, frontDef: 0, missileBlock: 0, speed: 1, brace: false, noRun: false, chargeBonus: 14 },
  column: { name: 'Column', spX: 1.15, spY: 1.35, atk: -4, def: -4, frontDef: 0, missileBlock: 0, speed: 1.05, brace: false, noRun: false, chargeBonus: 0 },
};

/** Spacing scale for a unit type: mounted men and beasts need more room. */
export function spacingScale(t: UnitTypeDef): [number, number] {
  if (t.cls === 'ele') return [4.2, 4.6];
  if (t.cls === 'chariot') return [3.6, 4.8];
  if (t.mounted) return [1.9, 2.5];
  return [1, 1];
}

export function spacing(t: UnitTypeDef, form: FormationKind): [number, number] {
  const f = FORM[form];
  const [kx, ky] = spacingScale(t);
  return [f.spX * kx, f.spY * ky];
}

/** Default frontage: about three times as wide as deep. */
export function defaultWidth(n: number, t: UnitTypeDef): number {
  if (t.cls === 'ele' || t.cls === 'chariot') return Math.max(1, n);
  const w = Math.ceil(Math.sqrt(n * (t.mounted ? 2.5 : 3)));
  return Math.max(1, Math.min(n, w));
}

/**
 * Slot offset for slot k of n non-officer soldiers: [lateral, back] in metres, where
 * lateral is along the unit's right vector and back is behind the front rank.
 */
export function slotOffset(u: Unit, t: UnitTypeDef, k: number, n: number, width: number): [number, number] {
  const [sx, sy] = spacing(t, u.form);
  if (u.form === 'wedge') {
    // Rows of 1, 3, 5, ... soldiers: the tip leads.
    let r = 0;
    let first = 0;
    while (first + (2 * r + 1) <= k) {
      first += 2 * r + 1;
      r++;
    }
    const f = k - first;
    const rowN = Math.min(2 * r + 1, n - first);
    return [(f - (rowN - 1) / 2) * sx, r * sy];
  }
  const w = Math.max(1, Math.min(width, n));
  const r = Math.floor(k / w);
  const f = k - r * w;
  const rowN = Math.min(w, n - r * w);
  return [(f - (rowN - 1) / 2) * sx, r * sy];
}

/** Depth of the formation in metres (front rank to rear rank). */
export function depthOf(u: Unit, t: UnitTypeDef, n: number, width: number): number {
  const [, sy] = spacing(t, u.form);
  if (u.form === 'wedge') {
    let r = 0;
    let c = 0;
    while (c < n) {
      c += 2 * r + 1;
      r++;
    }
    return (r - 1) * sy;
  }
  return (Math.ceil(n / Math.max(1, width)) - 1) * sy;
}

/** Frontage in metres. */
export function frontageOf(t: UnitTypeDef, form: FormationKind, width: number): number {
  const [sx] = spacing(t, form);
  return Math.max(0, width - 1) * sx;
}
