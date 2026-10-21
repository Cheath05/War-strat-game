import { STRENGTHS, type ScenarioDef, type Settings } from '@pl/sim';
import { Segmented, Toggle, type SegOption } from './controls';

const SWITCHES: { k: 'morale' | 'fatigue' | 'ammo' | 'fog'; name: string; title: string }[] = [
  { k: 'morale', name: 'Morale & routing', title: 'Units waver, rout, then rally or shatter' },
  { k: 'fatigue', name: 'Fatigue', title: 'Running and fighting tire soldiers out' },
  { k: 'ammo', name: 'Limited ammo', title: 'Archers, slingers and javelins can run out' },
  { k: 'fog', name: 'Fog of war', title: 'You only see enemies your troops can see' },
];

const SIZES: SegOption<number>[] = [
  { v: 0.5, label: 'Small' },
  { v: 1, label: 'Medium' },
  { v: 1.5, label: 'Large' },
  { v: 2, label: 'Huge' },
];

const DIFFS: SegOption<number>[] = ['Easy', 'Normal', 'Hard', 'Legendary'].map((label, v) => ({ v, label }));

const STRENGTH_OPTIONS: SegOption<number>[] = STRENGTHS.map((v) => ({ v, label: `×${v}` }));

/** The battle rules: switches, unit size, the AI's skill and each side's strength. Read-only without onChange. */
export function RulesEditor({ sc, settings, onChange }: { sc: ScenarioDef; settings: Settings; onChange?: (p: Partial<Settings>) => void }) {
  const strength = settings.strength ?? [1, 1];
  return (
    <div className="rules">
      <div className="rule-row">
        <span className="rule-name">Realism</span>
        <div className="row">
          {SWITCHES.map((s) => (
            <Toggle key={s.k} on={settings[s.k]} label={s.name} title={s.title} onChange={onChange && ((on: boolean) => onChange({ [s.k]: on }))} />
          ))}
        </div>
      </div>
      <div className="rule-row">
        <span className="rule-name">Unit size</span>
        <div>
          <Segmented options={SIZES} value={settings.unitSize} onChange={onChange && ((unitSize: number) => onChange({ unitSize }))} />
        </div>
      </div>
      <div className="rule-row">
        <span className="rule-name">AI</span>
        <div>
          <Segmented options={DIFFS} value={settings.difficulty} onChange={onChange && ((difficulty: number) => onChange({ difficulty }))} />
        </div>
      </div>
      {/* Strength per side (a handicap): every soldier's health and damage are multiplied, so at ×2 each man fights like two. */}
      {sc.sides.map((side, i) => (
        <div key={i} className="rule-row">
          <span className="rule-name" title="Health and damage of every soldier on this side">
            {side.name} strength
          </span>
          <div>
            <Segmented
              options={STRENGTH_OPTIONS}
              value={strength[i] ?? 1}
              onChange={onChange && ((v: number) => onChange({ strength: strength.map((x, k) => (k === i ? v : x)) }))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A scenario's lobby choices (map, factions...): read-only without onChange. */
export function ScenarioOptions({ sc, choices, onChange }: { sc: ScenarioDef; choices: Record<string, string>; onChange?: (c: Record<string, string>) => void }) {
  if (!sc.options?.length) return null;
  return (
    <div className="rules" style={{ marginTop: 10 }}>
      {sc.options.map((o) => (
        <div key={o.id} className="rule-row">
          <span className="rule-name">{o.name}</span>
          <div>
            <Segmented
              options={o.choices.map((c) => ({ v: c.id, label: c.name }))}
              value={choices[o.id] ?? ''}
              onChange={onChange && ((id: string) => onChange({ ...choices, [o.id]: id }))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
