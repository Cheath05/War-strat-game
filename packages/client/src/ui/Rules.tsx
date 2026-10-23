import { STRENGTHS, type ScenarioDef, type Settings } from '@pl/sim';
import { Picker, Segmented, Toggle, type SegOption } from './controls';

const SWITCHES: { k: 'morale' | 'fatigue' | 'ammo' | 'fog'; name: string; on: string; off: string }[] = [
  {
    k: 'morale',
    name: 'Morale & routing',
    on: 'Losses, charges and attacks from the flank or rear shake a unit until it wavers and runs; it may rally or flee the field. Battles turn on breaking the enemy.',
    off: 'Nobody ever runs: every unit fights to the last man, so battles are longer and bloodier.',
  },
  {
    k: 'fatigue',
    name: 'Fatigue',
    on: 'Running, charging and fighting tire soldiers out, and tired men move and fight worse. Rest your troops and keep a reserve.',
    off: 'Everyone stays fresh all battle long.',
  },
  {
    k: 'ammo',
    name: 'Limited ammo',
    on: 'Archers, slingers and javelin men run out of missiles and must close in or step back.',
    off: 'Missile troops shoot all battle long.',
  },
  {
    k: 'fog',
    name: 'Fog of war',
    on: 'You only see the enemies your own troops can see: scouting matters, and woods can hide an ambush.',
    off: 'The whole enemy army is always in sight.',
  },
];

const SIZES: SegOption<number>[] = [
  { v: 0.5, label: 'Small' },
  { v: 1, label: 'Medium' },
  { v: 1.5, label: 'Large' },
  { v: 2, label: 'Huge' },
];

const SIZE_DESC: Record<number, string> = {
  0.5: 'Half the men in every unit: quick, nimble battles that run well on any laptop.',
  1: 'The usual number of men in every unit.',
  1.5: 'Half as many men again in every unit: grander battles that ask more of older laptops.',
  2: 'Twice the men in every unit: the most epic battles, and the hardest work for the computer.',
};

const DIFFS: SegOption<number>[] = ['Easy', 'Normal', 'Hard', 'Legendary'].map((label, v) => ({ v, label }));

const DIFF_DESC = [
  'The AI reacts slowly, never flanks with its horse and never uses its generals’ abilities. Its men fight a little worse.',
  'A fair fight: the AI flanks and rallies its men like a sensible general.',
  'The AI thinks faster, and its men fight harder than yours. Last Stand waves are bigger.',
  'The AI reacts at once and its men fight much harder. Last Stand waves are biggest. For veterans.',
];

const STRENGTH_OPTIONS: SegOption<number>[] = STRENGTHS.map((v) => ({ v, label: `×${v}` }));

/** The battle rules: switches, unit size, the AI's skill and each side's strength. Read-only without onChange. */
export function RulesEditor({ sc, settings, onChange }: { sc: ScenarioDef; settings: Settings; onChange?: (p: Partial<Settings>) => void }) {
  const strength = settings.strength ?? [1, 1];
  return (
    <div className="rules">
      {SWITCHES.map((s) => (
        <div key={s.k} className="rule-row">
          <span className="rule-name">{s.name}</span>
          <div>
            <Toggle on={settings[s.k]} label={settings[s.k] ? 'On' : 'Off'} onChange={onChange && ((on: boolean) => onChange({ [s.k]: on }))} />
            <p className="rule-desc">{settings[s.k] ? s.on : s.off}</p>
          </div>
        </div>
      ))}
      <div className="rule-row">
        <span className="rule-name">Unit size</span>
        <div>
          <Segmented options={SIZES} value={settings.unitSize} onChange={onChange && ((unitSize: number) => onChange({ unitSize }))} />
          <p className="rule-desc">{SIZE_DESC[settings.unitSize] ?? ''}</p>
        </div>
      </div>
      <div className="rule-row">
        <span className="rule-name">AI</span>
        <div>
          <Segmented options={DIFFS} value={settings.difficulty} onChange={onChange && ((difficulty: number) => onChange({ difficulty }))} />
          <p className="rule-desc">{DIFF_DESC[settings.difficulty] ?? ''} Its fighting edge only counts on sides with no human player.</p>
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
            {i === sc.sides.length - 1 && (
              <p className="rule-desc">
                The health and damage of every soldier on a side: at ×2 each man fights like two. Use it to even out a mismatch, or to stage a hopeless last stand.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A scenario's lobby choices (map, factions...): read-only without onChange. */
export function ScenarioOptions({ sc, choices, onChange }: { sc: ScenarioDef; choices: Record<string, string>; onChange?: (c: Record<string, string>) => void }) {
  // Army slots' countries are picked on the armies themselves (sandbox).
  const shown = (sc.options ?? []).filter((o) => !o.slot);
  if (!shown.length) return null;
  return (
    <div className="rules" style={{ marginTop: 10 }}>
      {shown.map((o) => {
        const picked = o.choices.find((c) => c.id === choices[o.id]);
        const desc = [picked?.desc, o.desc].filter(Boolean).join(' ');
        return (
          <div key={o.id} className="rule-row">
            <span className="rule-name">{o.name}</span>
            <div>
              {o.choices.length > 7 ? (
                <Picker options={o.choices.map((c) => ({ v: c.id, label: c.name }))} value={choices[o.id] ?? ''} onChange={onChange && ((id: string) => onChange({ ...choices, [o.id]: id }))} />
              ) : (
                <Segmented
                  options={o.choices.map((c) => ({ v: c.id, label: c.name }))}
                  value={choices[o.id] ?? ''}
                  onChange={onChange && ((id: string) => onChange({ ...choices, [o.id]: id }))}
                />
              )}
              {desc && <p className="rule-desc">{desc}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
