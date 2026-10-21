import { armyCost, defaultArmy, groupDets, recruitable, roleOf, unitType, type UnitTypeDef } from '@pl/sim';
import { UnitIcon } from './UnitIcon';

const ROLE_NAMES = { line: 'Line infantry', missile: 'Missiles', horse: 'Cavalry' } as const;

function tip(t: UnitTypeDef): string {
  const m = t.missile ? ` · ${t.missile.kind}s, range ${t.missile.range} m` : '';
  return `${t.desc}\nAttack ${t.atk} · Defence ${t.def} · Armour ${t.armor} · Morale ${t.morale}${m}`;
}

/**
 * Recruiting an army with gold: the faction's units to add, the army so far (click a unit
 * to send it home), what's left to spend, and a quick balanced pick.
 */
export function RecruitPanel({
  title,
  factionId,
  budget,
  maxUnits,
  units,
  pal,
  onChange,
  onClose,
}: {
  title: string;
  factionId: string;
  budget: number;
  maxUnits: number;
  units: string[];
  pal: number;
  onChange: (units: string[]) => void;
  onClose: () => void;
}) {
  const spent = armyCost(units);
  const left = budget - spent;
  const full = units.length >= maxUnits;
  const types = recruitable(factionId);
  const dets = groupDets(units);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="window recruit" onClick={(e) => e.stopPropagation()}>
        <header className="window-head">
          <h2 className="heading">Recruit: {title}</h2>
          <div className="row" style={{ gap: 16 }}>
            <span>
              <span className="dim">Gold</span> <span className="gold">{left}</span> <span className="dim">of {budget}</span>
            </span>
            <span className="dim">
              {units.length}/{maxUnits} units
            </span>
          </div>
        </header>
        <div className="window-body">
          <section>
            <div className="label">Units</div>
            <p className="hint">Click a unit to add it. Gold you don't spend now buys reinforcements during the battle.</p>
            <div className="recruit-grid">
              {types.map((t) => {
                const can = !full && t.cost <= left;
                return (
                  <div key={t.id} className={`choice recruit-card ${can ? '' : 'off'}`} title={tip(t)} onClick={() => can && onChange([...units, t.id])}>
                    <UnitIcon type={t.id} pal={pal} />
                    <div>
                      <div>{t.name}</div>
                      <div className="dim" style={{ fontSize: 12 }}>
                        {ROLE_NAMES[roleOf(t)]} · {t.size} {t.mounted || t.cls === 'ele' || t.cls === 'chariot' ? 'riders' : 'men'}
                      </div>
                      <div className="gold" style={{ fontSize: 13 }}>
                        {t.cost} gold
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section>
            <div className="label">Your army</div>
            <p className="hint">{units.length ? 'Click a unit to send it home.' : "Empty: the AI picks a balanced army if you leave it so."}</p>
            {dets.map((d, i) => (
              <div key={i} className="det-row" style={{ flexWrap: 'wrap' }}>
                <span className="dim" style={{ minWidth: 110 }}>
                  {d.name}
                </span>
                {d.units.map((id, k) => (
                  <button key={k} className="btn small army-chip" title={`${unitType(id).name}: send home (+${unitType(id).cost} gold)`} onClick={() => onChange(without(units, id))}>
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
          <button className="btn" onClick={() => onChange(defaultArmy(factionId, budget, maxUnits))}>
            Balanced army
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
