// The player's name and preferences, kept in this browser.

const KEY = 'pl.profile';

export interface Profile {
  name: string;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { name: 'Commander', ...JSON.parse(raw) };
  } catch {
    // storage unavailable
  }
  return { name: '' };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
