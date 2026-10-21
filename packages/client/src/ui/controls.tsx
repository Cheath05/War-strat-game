// Small shared controls: a segmented choice (one option on) and an on/off switch.

export interface SegOption<T> {
  v: T;
  label: string;
  title?: string;
}

/** A row of options of which exactly one is on. Read-only without onChange. */
export function Segmented<T extends string | number>({ options, value, onChange }: { options: SegOption<T>[]; value: T; onChange?: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={o.v === value}
          className={`seg-opt ${o.v === value ? 'on' : ''}`}
          disabled={!onChange}
          title={o.title}
          onClick={() => onChange?.(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** An on/off switch: a lamp that lights up, and its label. Read-only without onChange. */
export function Toggle({ on, label, title, onChange }: { on: boolean; label: string; title?: string; onChange?: (on: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} className={`toggle ${on ? 'on' : ''}`} disabled={!onChange} title={title} onClick={() => onChange?.(!on)}>
      <span className="lamp" />
      {label}
    </button>
  );
}
