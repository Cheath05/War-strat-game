import { useState } from 'react';
import { FACTIONS, armyCost, defaultArmy, groupDets, recruitable, roleOf, unitType, type UnitTypeDef } from '@pl/sim';
import { UnitIcon } from './UnitIcon';
import { Segmented } from './controls';

const COUNTRIES = FACTIONS.map((f) => ({ v: f.id, label: f.name }));
/** Soldiers in an army at medium unit size. */
const menIn = (units: string[]): number => units.reduce((n, id) => n + unitType(id).size, 0);

const ROLE_NAMES = { line: 'Line infantry', missile: 'Missiles', horse: 'Cavalry' } as const;

function tip(t: UnitTypeDef): string {
  const m = t.missile ? ` · ${t.missile.kind}s, range ${t.missile.range} m` : '';
  return `${t.desc}\nAttack ${t.atk} · Defence ${t.def} · Armour ${t.armor} · Morale ${t.morale}${m}`;
}

/**
 * Recruiting an army with gold: the faction's units to add, the army so far (click a unit
 * to send it home), what's left to spend, and a quick balanced pick. In a sandbox units are
 * free and come from any country: tabs pick the country to browse.
 */
export function RecruitPanel({
  title,
  factionId,
  budget,
  maxUnits,
  units,
  pal,
  sandbox = false,
  onChange,
  onClose,
}: {
  title: string;
  factionId: string;
  budget: number;
  maxUnits: number;
  units: string[];
  pal: number;
  sandbox?: boolean;
  onChange: (units: string[]) => void;
  onClose: () => void;
}) {
  const [country, setCountry] = useState(factionId);
  const spent = sandbox ? 0 : armyCost(units);
  const left = sandbox ? Infinity : budget - spent;
  const full = units.length >= maxUnits;
  const types = recruitable(sandbox ? country : factionId);
  const dets = groupDets(units);
  const count = (id: string): number => units.filter((u) => u === id).length;
  const add = (id: string, n: number): void => onChange([...units, ...Array<string>(Math.min(n, maxUnits - units.length)).fill(id)]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="window recruit" onClick={(e) => e.stopPropagation()}>
        <header className="window-head">
          <h2 className="heading">
            {sandbox ? 'Army' : 'Recruit'}: {title}
          </h2>
          <div className="row" style={{ gap: 16 }}>
            {!sandbox && (
              <span>
                <span className="dim">Gold</span> <span className="gold">{left}</span> <span className="dim">of {budget}</span>
              </span>
            )}
            <span className="dim">
              {units.length}/{maxUnits} units{sandbox ? ` · ${menIn(units)} men` : ''}
            </span>
          </div>
        </header>
        <div className="window-body">
          <section>
            <div className="label">Units</div>
            {sandbox ? (
              <>
                <p className="hint">Any country's units, as many as you like and free. Click a unit to add it, Shift-click to add five.</p>
                <div style={{ marginBottom: 10 }}>
                  <Segmented options={COUNTRIES} value={country} onChange={setCountry} />
                </div>
              </>
            ) : (
              <p className="hint">Click a unit to add it. Gold you don't spend now buys reinforcements during the battle.</p>
            )}
            <div className="recruit-grid">
              {types.map((t) => {
                const can = !full && t.cost <= left;
                const n = count(t.id);
                return (
                  <div key={t.id} className={`choice recruit-card ${can ? '' : 'off'} ${t.elite ? 'elite' : ''}`} title={tip(t)} onClick={(e) => can && add(t.id, sandbox && e.shiftKey ? 5 : 1)}>
                    <UnitIcon type={t.id} pal={pal} />
                    <div>
                      <div>
                        {t.name}
                        {t.elite && <span className="tag">Super unit</span>}
                      </div>
                      <div className="dim" style={{ fontSize: 12 }}>
                        {ROLE_NAMES[roleOf(t)]} · {t.size} {t.mounted || t.cls === 'ele' || t.cls === 'chariot' ? 'riders' : 'men'}
                      </div>
                      {sandbox ? (
                        n > 0 && (
                          <div className="gold" style={{ fontSize: 13 }}>
                            ×{n} in the army
                          </div>
                        )
                      ) : (
                        <div className="gold" style={{ fontSize: 13 }}>
                          {t.cost} gold
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <div className="label">{sandbox ? 'The army' : 'Your army'}</div>
            <p className="hint">{units.length ? 'Click a unit to send it home.' : 'Empty: a balanced army takes the field if you leave it so.'}</p>
            {dets.map((d, i) => (
              <div key={i} className="det-row" style={{ flexWrap: 'wrap' }}>
                <span className="dim" style={{ minWidth: 110 }}>
                  {d.name}
                </span>
                {d.units.map((id, k) => (
                  <button
                    key={k}
                    className="btn small army-chip"
                    title={sandbox ? `${unitType(id).name}: send home` : `${unitType(id).name}: send home (+${unitType(id).cost} gold)`}
                    onClick={() => onChange(without(units, id))}
                  >
                    <UnitIcon type={id} pal={pal} /> {unitType(id).name}
                  </button>
                ))}
              </div>
            ))}
          </section>
        </div>
        <footer className="window-foot">
          <button className="btn ghost" onClick={() => onChange([])}>
            Clear
          </button>
          <button className="btn" onClick={() => onChange(sandbox ? defaultArmy(country, 3000, 12) : defaultArmy(factionId, budget, maxUnits))}>
            Balanced army{sandbox ? ` of ${COUNTRIES.find((c) => c.v === country)?.label}` : ''}
          </button>
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

/** The list without one copy of id (the last one). */
function without(units: string[], id: string): string[] {
  const i = units.lastIndexOf(id);
  return i < 0 ? units : [...units.slice(0, i), ...units.slice(i + 1)];
}
