// Small shared controls: a segmented choice (one option on), a pick-from-a-grid choice for
// long lists, and an on/off switch.

import { useEffect, useRef, useState } from 'react';

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

/**
 * One of many (countries, say): a button naming the current choice that opens a grid of all
 * of them. Read-only without onChange.
 */
export function Picker<T extends string | number>({ options, value, onChange }: { options: SegOption<T>[]; value: T; onChange?: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', away);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  const cur = options.find((o) => o.v === value);
  return (
    <span className="picker" ref={box}>
      <button className={`picker-btn ${open ? 'open' : ''}`} disabled={!onChange} title={cur?.title} onClick={() => setOpen(!open)}>
        {cur?.label ?? '—'}
        {onChange && <span className="picker-caret">▾</span>}
      </button>
      {open && (
        <span className="picker-menu" role="listbox">
          {options.map((o) => (
            <button
              key={String(o.v)}
              role="option"
              aria-selected={o.v === value}
              className={`seg-opt ${o.v === value ? 'on' : ''}`}
              title={o.title}
              onClick={() => {
                setOpen(false);
                onChange?.(o.v);
              }}
            >
              {o.label}
            </button>
          ))}
        </span>
      )}
    </span>
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
