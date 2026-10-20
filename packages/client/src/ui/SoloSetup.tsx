import { useMemo, useState } from 'react';
import { defaultSettings, faction, listScenarios, unitType, type BattleSetup, type Settings } from '@pl/sim';
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
  const sc = scenarios.find((s) => s.id === scId)!;
  const [slot, setSlot] = useState(sc.sides[0].slots[0]!.key);
  const [role, setRole] = useState<{ k: 'general' } | { k: 'commander'; det: number }>({ k: 'general' });
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const set = (p: Partial<Settings>): void => setSettings({ ...settings, ...p });

  const start = (): void => {
    const setup: BattleSetup = {
      seed: Math.floor(Math.random() * 1e9),
      scenario: sc.id,
      settings,
      players: [{ id: 1, name: loadProfile().name || 'Commander', role: role.k, slot, det: role.k === 'commander' ? role.det : 0 }],
    };
    go({ k: 'battle', setup, playerId: 1 });
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
                onClick={() => {
                  setScId(s.id);
                  setSlot(s.sides[0].slots[0]!.key);
                  setRole({ k: 'general' });
                }}
              >
                <h3>
                  {s.name} {s.year ? <span className="dim">({s.year})</span> : null}
                </h3>
                <p>{s.blurb}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="dim">Choose your army. Every slot you don't take is led by the AI.</div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {sc.sides.map((side, si) => (
              <div key={si} className="col" style={{ flex: 1, minWidth: 280 }}>
                <div className="ff-title" style={{ fontSize: 18 }}>
                  {side.name} <span className="dim">· {side.role}</span>
                </div>
                {side.slots
                  .filter((sl) => !sl.reserve)
                  .map((sl) => {
                    const on = sl.key === slot;
                    return (
                      <div key={sl.key} className={`ff-window choice ${on ? 'on' : ''}`} onClick={() => (setSlot(sl.key), setRole({ k: 'general' }))}>
                        <h3>
                          {sl.name} <span className="dim">· {sl.title}</span>
                        </h3>
                        <p>
                          {faction(sl.faction).name}: {summary(sl.dets.flatMap((d) => d.units))}
                        </p>
                        {on && (
                          <div className="row" style={{ marginTop: 6 }}>
                            <button className={`ff-btn small ${role.k === 'general' ? 'on' : ''}`} onClick={(e) => (e.stopPropagation(), setRole({ k: 'general' }))}>
                              Lead as General
                            </button>
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
            {(['morale', 'fatigue', 'ammo'] as const).map((k) => (
              <button key={k} className={`ff-btn small ${settings[k] ? 'on' : ''}`} onClick={() => set({ [k]: !settings[k] })}>
                {k === 'morale' ? 'Morale & routing' : k === 'fatigue' ? 'Fatigue' : 'Limited ammo'}: {settings[k] ? 'on' : 'off'}
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
        </section>
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
