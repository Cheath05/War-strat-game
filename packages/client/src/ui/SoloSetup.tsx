import { useMemo, useState } from 'react';
import { armyCost, budgetFor, defaultSettings, faction, listScenarios, recruitedArmy, scenarioChoices, scenarioDef, slotSide, unitType, type BattleSetup, type Settings } from '@pl/sim';
import { RecruitPanel, ScenarioOptions, StrengthRow } from './Recruit';
import type { Screen } from '../app/App';
import { loadProfile } from '../app/profile';

const SIZES = [
  { v: 0.5, name: 'Small' },
  { v: 1, name: 'Medium' },
  { v: 1.5, name: 'Large' },
  { v: 2, name: 'Huge' },
];
const DIFFS = ['Easy', 'Normal', 'Hard', 'Legendary'];

/** Choose a battle, a side and a role; then fight it against the AI in this browser. */
export function SoloSetup({ go }: { go: (s: Screen) => void }) {
  const scenarios = useMemo(() => listScenarios().filter((s) => !s.hidden), []);
  const [scId, setScId] = useState(scenarios[0]?.id ?? 'field');
  const [choices, setChoices] = useState<Record<string, string>>(() => scenarioChoices(scenarios[0]?.id ?? 'field'));
  const raw = scenarios.find((s) => s.id === scId)!;
  const sc = scenarioDef(scId, choices);
  const [slot, setSlot] = useState(sc.sides[0].slots[0]!.key);
  const [role, setRole] = useState<{ k: 'general' } | { k: 'commander'; det: number }>({ k: 'general' });
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  // Recruited units for our army (gold modes); null keeps the scenario's own army.
  const [units, setUnits] = useState<string[] | null>(null);
  const [recruiting, setRecruiting] = useState(false);
  const set = (p: Partial<Settings>): void => setSettings({ ...settings, ...p });
  const side = slotSide(sc, slot);
  const slotDef = sc.sides[side]?.slots.find((s) => s.key === slot);
  const budget = role.k === 'general' ? budgetFor(sc, side) : 0;
  const army = units?.length ? units : (slotDef?.dets.flatMap((d) => d.units) ?? []);

  const start = (): void => {
    const recruited = units?.length && role.k === 'general' ? recruitedArmy(sc, slot, units) : null;
    const setup: BattleSetup = {
      seed: Math.floor(Math.random() * 1e9),
      scenario: sc.id,
      settings,
      options: choices,
      armies: recruited ? [recruited] : undefined,
      players: [{ id: 1, name: loadProfile().name || 'Commander', role: role.k, slot, det: role.k === 'commander' ? role.det : 0, gold: sc.recruit ? Math.max(0, budget - (budget ? armyCost(army) : 0)) : undefined }],
    };
    go({ k: 'battle', setup, playerId: 1 });
  };
  const pickScenario = (id: string, c: Record<string, string>): void => {
    setScId(id);
    setChoices(c);
    setSlot(scenarioDef(id, c).sides[0].slots[0]!.key);
    setRole({ k: 'general' });
    setUnits(null);
  };

  return (
    <div className="screen title-bg">
      <div className="ff-window setup" style={{ position: 'relative', zIndex: 1 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="ff-title">Solo battle</h2>
          <button className="ff-btn small" onClick={() => go({ k: 'title' })}>
            Back
          </button>
        </div>
        <section>
          <div className="dim">Battle</div>
          <div className="panel-list">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className={`ff-window choice ${s.id === scId ? 'on' : ''}`}
                onClick={() => pickScenario(s.id, scenarioChoices(s.id))}
              >
                <h3>
                  {s.name} {s.year ? <span className="dim">({s.year})</span> : null}
                </h3>
                <p>{s.blurb}</p>
              </div>
            ))}
          </div>
        </section>
        <ScenarioOptions sc={raw} choices={choices} onChange={(c) => pickScenario(scId, c)} />
        <section>
          <div className="dim">Choose your army. Every slot you don't take is led by the AI.</div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {sc.sides.map((side, si) => (
              <div key={si} className="col" style={{ flex: 1, minWidth: 280 }}>
                <div className="ff-title" style={{ fontSize: 18 }}>
                  {side.name} <span className="dim">· {side.role}</span>
                </div>
                {side.aiOnly && (
                  <div className="ff-window" style={{ padding: '8px 10px' }}>
                    {sc.waves ? `${sc.waves.count} waves of ${faction(side.faction).name}, each bigger than the last.` : 'Led by the AI.'}
                  </div>
                )}
                {side.slots
                  .filter(() => !side.aiOnly)
                  .map((sl) => {
                    const on = sl.key === slot;
                    return (
                      <div key={sl.key} className={`ff-window choice ${on ? 'on' : ''}`} onClick={() => (setSlot(sl.key), setRole({ k: 'general' }), setUnits(null))}>
                        <h3>
                          {sl.name} <span className="dim">· {sl.title}</span> {sl.reserve && <span className="tag">arrives mid-battle</span>}
                        </h3>
                        <p>
                          {faction(sl.faction).name}: {summary(on && units?.length ? units : sl.dets.flatMap((d) => d.units))}
                        </p>
                        {on && (
                          <div className="row" style={{ marginTop: 6 }}>
                            <button className={`ff-btn small ${role.k === 'general' ? 'on' : ''}`} onClick={(e) => (e.stopPropagation(), setRole({ k: 'general' }))}>
                              Lead as General
                            </button>
                            {role.k === 'general' && budget > 0 && (
                              <button className="ff-btn small" onClick={(e) => (e.stopPropagation(), setRecruiting(true))}>
                                Recruit army ({budget} gold)
                              </button>
                            )}
                            {sl.dets.map((d, i) => (
                              <button
                                key={i}
                                className={`ff-btn small ${role.k === 'commander' && role.det === i ? 'on' : ''}`}
                                title={`Serve under ${sl.name} as commander of the ${d.name}`}
                                onClick={(e) => (e.stopPropagation(), setRole({ k: 'commander', det: i }))}
                              >
                                Command {d.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="dim">Rules</div>
          <div className="row">
            {(['morale', 'fatigue', 'ammo', 'fog'] as const).map((k) => (
              <button key={k} className={`ff-btn small ${settings[k] ? 'on' : ''}`} onClick={() => set({ [k]: !settings[k] })}>
                {k === 'morale' ? 'Morale & routing' : k === 'fatigue' ? 'Fatigue' : k === 'ammo' ? 'Limited ammo' : 'Fog of war'}: {settings[k] ? 'on' : 'off'}
              </button>
            ))}
            <span className="dim">Unit size</span>
            {SIZES.map((z) => (
              <button key={z.v} className={`ff-btn small ${settings.unitSize === z.v ? 'on' : ''}`} onClick={() => set({ unitSize: z.v })}>
                {z.name}
              </button>
            ))}
            <span className="dim">AI</span>
            {DIFFS.map((d, i) => (
              <button key={d} className={`ff-btn small ${settings.difficulty === i ? 'on' : ''}`} onClick={() => set({ difficulty: i })}>
                {d}
              </button>
            ))}
          </div>
          <StrengthRow sc={sc} settings={settings} onChange={(strength) => set({ strength })} />
        </section>
        {recruiting && slotDef && (
          <RecruitPanel
            title={`${slotDef.name}, ${slotDef.title}`}
            factionId={slotDef.faction}
            budget={budget}
            maxUnits={sc.recruit?.maxUnits ?? 12}
            units={army}
            pal={side === 0 ? 0 : 2}
            onChange={setUnits}
            onClose={() => setRecruiting(false)}
          />
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="ff-btn big" style={{ minWidth: 180 }} onClick={start}>
            To battle!
          </button>
        </div>
      </div>
    </div>
  );
}

function summary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => `${n > 1 ? `${n}× ` : ''}${unitType(t).name}`).join(', ');
}
