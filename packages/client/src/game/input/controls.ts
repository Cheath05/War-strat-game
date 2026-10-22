// The player's control preferences, kept in this browser.

export interface ControlSettings {
  /** Right button selects and left button commands (move, attack, draw a line). */
  swapMouse: boolean;
}

const KEY = 'pl.controls';

let cached: ControlSettings | null = null;

export function loadControls(): ControlSettings {
  if (cached) return { ...cached };
  let c: ControlSettings = { swapMouse: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) c = { ...c, ...JSON.parse(raw) };
  } catch {
    // storage unavailable: defaults
  }
  cached = c;
  return { ...c };
}

export function saveControls(c: ControlSettings): void {
  cached = { ...c };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // ignore
  }
}

/** The names of the mouse buttons that select and that command, for help and hints. */
export function mouseNames(): { pick: string; act: string } {
  return loadControls().swapMouse ? { pick: 'Right', act: 'Left' } : { pick: 'Left', act: 'Right' };
}
