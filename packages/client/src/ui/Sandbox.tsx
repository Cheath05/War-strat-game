import type { ReactNode } from 'react';
import { FACTIONS, faction, sandboxSlots, unitType, type ArmySlotDef, type ScenarioDef } from '@pl/sim';
import { Picker } from './controls';

const COUNTRIES = FACTIONS.map((f) => ({ v: f.id, label: f.name }));

/** Soldiers in a list of units at medium unit size. */
export const menIn = (units: string[]): number => units.reduce((n, id) => n + unitType(id).size, 0);

/** Past this many soldiers on the field, older laptops may struggle. */
const BIG = 3000;

/**
 * The sandbox's armies, side by side: each army's country and units, and room to add up to
 * four a side. Who may change what is up to the caller (the host, an army's own General, or
 * the player in a solo game).
 */
export function SandboxArmies({
  sc,
  choices,
  unitSize,
  unitsOf,
  canSetCountry,
  canEditUnits,
  canAddRemove,
  setChoices,
  editUnits,
  extra,
}: {
  sc: ScenarioDef;
  choices: Record<string, string>;
  unitSize: number;
  unitsOf: (sl: ArmySlotDef) => string[];
  canSetCountry: (sl: ArmySlotDef) => boolean;
  canEditUnits: (sl: ArmySlotDef) => boolean;
  canAddRemove: boolean;
  setChoices: (c: Record<string, string>) => void;
  editUnits: (sl: ArmySlotDef) => void;
  /** More for each army: who leads it, and buttons to take it. */
  extra?: (sl: ArmySlotDef) => ReactNode;
}) {
  const men = Math.round(sc.sides.flatMap((s) => s.slots).reduce((n, sl) => n + menIn(unitsOf(sl)), 0) * unitSize);
  return (
    <>
      <div className="sides">
        {sc.sides.map((side, si) => {
          const free = sandboxSlots(si).find((k) => (choices[k] ?? 'none') === 'none' && !side.slots.some((sl) => sl.key === k));
          // A new army brings a country not on the field yet, if there is one.
          const used = new Set(sc.sides.flatMap((s) => s.slots.map((sl) => sl.faction)));
          const next = FACTIONS.find((f) => !used.has(f.id))?.id ?? FACTIONS[0]!.id;
          return (
            <div key={si} className="col">
              <div className="side-head">
                Side {si + 1}: {side.name}
              </div>
              {side.slots.map((sl) => {
                const units = unitsOf(sl);
                return (
                  <div key={sl.key} className="slot">
                    <div className="slot-head">
                      <span>
                        {sl.name} <span className="dim">· {sl.title}</span>
                      </span>
                      {canAddRemove && side.slots.length > 1 && (
                        <button className="btn small ghost" title="Take this army out of the battle" onClick={() => setChoices({ ...choices, [sl.key]: 'none' })}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ margin: '6px 0' }}>
                      {canSetCountry(sl) ? (
                        <Picker options={COUNTRIES} value={sl.faction} onChange={(f) => setChoices({ ...choices, [sl.key]: f })} />
                      ) : (
                        <span className="dim">{faction(sl.faction).name}</span>
                      )}
                    </div>
                    <div className="slot-line">
                      <span className="units">
                        {summary(units)} <span className="dim">· {units.length} units, {Math.round(menIn(units) * unitSize)} men</span>
                      </span>
                      <span style={{ flex: 1 }} />
                      {canEditUnits(sl) && (
                        <button className="btn small" onClick={() => editUnits(sl)}>
                          Choose units
                        </button>
                      )}
                    </div>
                    {extra?.(sl)}
                  </div>
                );
              })}
              {canAddRemove && free && (
                <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setChoices({ ...choices, [free]: next })}>
                  + Add an army
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className={`hint ${men > BIG ? 'bad' : ''}`} style={{ marginTop: 10 }}>
        About {men} soldiers on the field.{men > BIG ? ' Battles this big may run slowly on older laptops: try a smaller unit size in the rules.' : ''}
      </p>
    </>
  );
}

export function summary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => `${n > 1 ? `${n}× ` : ''}${unitType(t).name}`).join(', ');
}
