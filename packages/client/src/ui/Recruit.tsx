import { armyCost, defaultArmy, groupDets, recruitable, roleOf, unitType, type ScenarioDef, type UnitTypeDef } from '@pl/sim';
import { UnitIcon } from './UnitIcon';

const ROLE_NAMES = { line: 'Line infantry', missile: 'Missiles', horse: 'Cavalry' } as const;

/** A scenario's lobby choices (map, factions...): buttons for whoever may change them. */
export function ScenarioOptions({ sc, choices, onChange }: { sc: ScenarioDef; choices: Record<string, string>; onChange?: (c: Record<string, string>) => void }) {
  if (!sc.options?.length) return null;
  return (
    <div className="col" style={{ gap: 4, marginTop: 6 }}>
      {sc.options.map((o) => (
        <div key={o.id} className="row" style={{ gap: 6 }}>
          <span className="dim" style={{ minWidth: 110 }}>
            {o.name}
          </span>
          {o.choices.map((c) => (
            <button
              key={c.id}
              disabled={!onChange}
              className={`ff-btn small ${choices[o.id] === c.id ? 'on' : ''}`}
              onClick={() => onChange?.({ ...choices, [o.id]: c.id })}
            >
              {c.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

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
      <div className="ff-window recruit" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ff-title" style={{ margin: 0 }}>
            Recruit: {title}
          </h2>
          <div className="row">
            <span>
              Gold <b style={{ color: 'var(--gold)' }}>{left}</b> <span className="dim">of {budget}</span>
            </span>
            <span className="dim">
              {units.length}/{maxUnits} units
            </span>
            <button className="ff-btn small" onClick={() => onChange(defaultArmy(factionId, budget, maxUnits))}>
              Balanced army
            </button>
            <button className="ff-btn small" onClick={() => onChange([])}>
              Clear
            </button>
            <button className="ff-btn small on" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
        <div className="dim" style={{ marginTop: 6 }}>
          Click a unit to add it. Gold you don't spend now buys reinforcements during the battle.
        </div>
        <div className="recruit-grid">
          {types.map((t) => {
            const can = !full && t.cost <= left;
            return (
              <div key={t.id} className={`ff-window choice recruit-card ${can ? '' : 'off'}`} title={tip(t)} onClick={() => can && onChange([...units, t.id])}>
                <UnitIcon type={t.id} pal={pal} />
                <div>
                  <b>{t.name}</b>
                  <div className="dim" style={{ fontSize: 12 }}>
                    {ROLE_NAMES[roleOf(t)]} · {t.size} {t.mounted || t.cls === 'ele' || t.cls === 'chariot' ? 'riders' : 'men'}
                  </div>
                  <div style={{ color: 'var(--gold)', fontSize: 13 }}>{t.cost} gold</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="dim" style={{ marginTop: 8 }}>
          Your army {units.length ? '(click a unit to send it home)' : '(empty: the AI picks a balanced army if you leave it so)'}
        </div>
        <div className="col" style={{ gap: 4, marginTop: 4 }}>
          {dets.map((d, i) => (
            <div key={i} className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span className="dim" style={{ minWidth: 110 }}>
                {d.name}
              </span>
              {d.units.map((id, k) => (
                <button key={k} className="ff-btn small army-chip" title={`${unitType(id).name}: send home (+${unitType(id).cost} gold)`} onClick={() => onChange(without(units, id))}>
                  <UnitIcon type={id} pal={pal} /> {unitType(id).name}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The list without one copy of id (the last one). */
function without(units: string[], id: string): string[] {
  const i = units.lastIndexOf(id);
  return i < 0 ? units : [...units.slice(0, i), ...units.slice(i + 1)];
}
