// Sound effects: battle sounds placed by where they happen (quieter far from the camera,
// panned left or right), and interface blips. A big melee makes hundreds of events a
// second, so each kind of sound is rationed per tenth of a second.

import { PROJ_KIND, type SimEvent } from '@pl/sim';
import { audio, hz, type NoteSpec } from './engine';

type Play = (t: number, vol: number, pan: number) => void;

const fx = (n: Omit<NoteSpec, 'bus'>): void => audio.note({ bus: 'sfx', ...n });
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** A brass call: notes in sequence (names), each `len` seconds. */
function horn(t: number, vol: number, pan: number, notes: string[], len: number, last = len * 2): void {
  notes.forEach((n, i) => {
    const f = hz(n);
    const end = i === notes.length - 1;
    fx({ wave: 'sawtooth', freq: f * 0.985, to: f, t: t + i * len, dur: end ? last : len * 0.9, vol: 0.11 * vol, attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.2, filter: { type: 'lowpass', freq: 1800, q: 1 }, pan, send: 0.55, vibrato: end ? 0.006 : 0 });
  });
}

export const SFX: Record<string, Play> = {
  clash: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.025, vol: 0.3 * v, attack: 0.001, decay: 0.03, sustain: 0.2, release: 0.05, filter: { type: 'bandpass', freq: rnd(2600, 4200), q: 1.8 }, pan, send: 0.15 });
    fx({ wave: 'square', freq: rnd(1600, 2600), t, dur: 0.015, vol: 0.045 * v, attack: 0.001, decay: 0.06, sustain: 0.1, release: 0.08, filter: { type: 'highpass', freq: 1200 }, pan, send: 0.3 });
  },
  thud: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.04, vol: 0.3 * v, attack: 0.002, decay: 0.05, sustain: 0.2, release: 0.06, filter: { type: 'lowpass', freq: 700 }, pan });
    fx({ wave: 'sine', freq: 140, to: 70, t, dur: 0.06, vol: 0.25 * v, attack: 0.002, decay: 0.06, sustain: 0.2, release: 0.05, pan });
  },
  block: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.03, vol: 0.25 * v, attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.05, filter: { type: 'lowpass', freq: 1100 }, pan });
    fx({ wave: 'triangle', freq: rnd(900, 1300), t, dur: 0.02, vol: 0.08 * v, attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.06, pan, send: 0.2 });
  },
  death: (t, v, pan) => {
    const f = rnd(150, 230);
    fx({ wave: 'sawtooth', freq: f, to: f * 0.45, t, dur: 0.22, vol: 0.07 * v, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.1, filter: { type: 'lowpass', freq: 900, q: 2 }, pan, send: 0.2 });
  },
  arrows: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.55, vol: 0.18 * v, attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.3, filter: { type: 'bandpass', freq: 2600, to: 700, q: 1.4 }, pan, send: 0.2 });
  },
  javelins: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.3, vol: 0.16 * v, attack: 0.03, decay: 0.2, sustain: 0.5, release: 0.15, filter: { type: 'bandpass', freq: 1400, to: 500, q: 1.6 }, pan, send: 0.15 });
  },
  sling: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.2, vol: 0.14 * v, attack: 0.02, decay: 0.12, sustain: 0.4, release: 0.1, filter: { type: 'bandpass', freq: 3200, to: 1800, q: 3 }, pan });
  },
  land: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.03, vol: 0.18 * v, attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.04, filter: { type: 'lowpass', freq: 500 }, pan });
  },
  charge: (t, v, pan) => {
    horn(t, v, pan, ['D4', 'A4'], 0.18, 0.6);
    fx({ wave: 'noise', freq: 0, t: t + 0.2, dur: 1.2, vol: 0.2 * v, attack: 0.3, decay: 0.4, sustain: 0.8, release: 0.6, filter: { type: 'lowpass', freq: 180 }, pan });
  },
  impact: (t, v, pan) => {
    fx({ wave: 'noise', freq: 0, t, dur: 0.18, vol: 0.45 * v, attack: 0.002, decay: 0.15, sustain: 0.3, release: 0.25, filter: { type: 'lowpass', freq: 1400, to: 300 }, pan, send: 0.3 });
    fx({ wave: 'sine', freq: 90, to: 40, t, dur: 0.2, vol: 0.4 * v, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.15, pan });
  },
  braced: (t, v, pan) => {
    SFX.impact!(t, v * 0.8, pan);
    for (let i = 0; i < 3; i++) SFX.clash!(t + i * 0.03, v, pan);
  },
  rout: (t, v, pan) => horn(t, v * 0.7, pan, ['A3', 'F3', 'D3'], 0.22, 0.5),
  rally: (t, v, pan) => horn(t, v, pan, ['D4', 'F#4', 'A4', 'D5'], 0.13, 0.5),
  shatter: (t, v, pan) => horn(t, v * 0.6, pan, ['E3', 'C3'], 0.3, 0.6),
  // Interface and battle-wide cues (not placed on the map).
  click: (t) => fx({ wave: 'pulse25', freq: 1320, t, dur: 0.02, vol: 0.05, attack: 0.001, decay: 0.03, sustain: 0.3, release: 0.02 }),
  select: (t) => fx({ wave: 'triangle', freq: 660, to: 990, t, dur: 0.04, vol: 0.1, attack: 0.002, decay: 0.04, sustain: 0.5, release: 0.03 }),
  order: (t) => {
    fx({ wave: 'pulse25', freq: 523, t, dur: 0.04, vol: 0.06, attack: 0.002, decay: 0.03, sustain: 0.6, release: 0.03 });
    fx({ wave: 'pulse25', freq: 784, t: t + 0.05, dur: 0.05, vol: 0.06, attack: 0.002, decay: 0.03, sustain: 0.6, release: 0.04 });
  },
  chime: (t) => ['C6', 'E6', 'G6'].forEach((n, i) => fx({ wave: 'sine', freq: hz(n), t: t + i * 0.09, dur: 0.05, vol: 0.09, attack: 0.002, decay: 0.5, sustain: 0.05, release: 0.6, send: 0.6 })),
  bell: (t) => {
    for (const f of [hz('E5'), hz('E5') * 2.76, hz('B5')]) fx({ wave: 'sine', freq: f, t, dur: 0.05, vol: 0.08, attack: 0.002, decay: 1.2, sustain: 0.05, release: 1, send: 0.7 });
  },
  drums: (t) => {
    for (let i = 0; i < 3; i++) fx({ wave: 'sine', freq: 110, to: 60, t: t + i * 0.16, dur: 0.1, vol: 0.3, attack: 0.002, decay: 0.12, sustain: 0.2, release: 0.1, send: 0.3 });
  },
  doom: (t) => {
    for (let i = 0; i < 5; i++) fx({ wave: 'sine', freq: 75, to: 55, t: t + i * 0.09, dur: 0.08, vol: 0.35, attack: 0.002, decay: 0.12, sustain: 0.3, release: 0.1, send: 0.4 });
    horn(t + 0.5, 1, 0, ['D3', 'F3', 'A2'], 0.35, 0.9);
  },
};

/** Plays an interface sound right now. */
export function ui(name: 'click' | 'select' | 'order' | 'chime'): void {
  if (audio.ctx) SFX[name]!(audio.now, 1, 0);
}

/** How many of each sound may start per tenth of a second. */
const RATION: Record<string, number> = { clash: 5, thud: 2, block: 2, death: 3, arrows: 2, javelins: 2, sling: 2, land: 3, charge: 1, impact: 2, braced: 1, rout: 1, rally: 1, shatter: 1 };

export interface Listener {
  tx: number;
  ty: number;
  dist: number;
  yaw: number;
}

/** Turns a tick's battle events into sound around the camera. */
export class BattleSounds {
  private used = new Map<string, number>();
  private windowAt = 0;

  onEvents(events: SimEvent[], cam: Listener, mySide: number, me: number): void {
    if (!audio.ctx) return;
    const now = audio.now;
    if (now - this.windowAt > 0.1) {
      this.windowAt = now;
      this.used.clear();
    }
    for (const e of events) {
      switch (e.k) {
        case 'hit':
          this.at(e.big ? 'thud' : 'clash', e.x, e.y, cam);
          break;
        case 'block':
          this.at('block', e.x, e.y, cam);
          break;
        case 'death':
          this.at('death', e.x, e.y, cam);
          break;
        case 'fire':
          this.at(e.kind === PROJ_KIND.arrow ? 'arrows' : e.kind === PROJ_KIND.stone ? 'sling' : 'javelins', e.x, e.y, cam, Math.min(1.3, 0.6 + e.n / 30));
          break;
        case 'land':
          if (e.hit) this.at('land', e.x, e.y, cam);
          break;
        case 'charge':
          this.at('charge', e.x, e.y, cam);
          break;
        case 'impact':
          this.at(e.braced ? 'braced' : 'impact', e.x, e.y, cam);
          break;
        case 'ability':
          if (e.a === 'rally' || e.a === 'inspire') this.at('rally', e.x, e.y, cam);
          break;
        case 'genDead':
          SFX.doom!(now, 1, 0);
          break;
        case 'objective':
          SFX.bell!(now, 1, 0);
          break;
        case 'arrive':
          SFX.drums!(now, 1, 0);
          break;
        case 'msg':
          if (e.tone === 'epic' && (e.side < 0 || e.side === mySide) && (!e.to || e.to === me)) SFX.chime!(now, 1, 0);
          break;
      }
    }
  }

  private at(kind: string, x: number, y: number, cam: Listener, gain = 1): void {
    const n = this.used.get(kind) ?? 0;
    if (n >= (RATION[kind] ?? 2)) return;
    // Quieter with distance from the camera's focus, and when zoomed out.
    const dx = x - cam.tx;
    const dy = y - cam.ty;
    const d = Math.sqrt(dx * dx + dy * dy) + cam.dist * 0.45;
    const v = Math.max(0, 1 - d / 260);
    if (v < 0.04) return;
    this.used.set(kind, n + 1);
    const pan = Math.max(-0.8, Math.min(0.8, (dx * Math.cos(cam.yaw) - dy * Math.sin(cam.yaw)) / 110));
    SFX[kind]!(audio.now + Math.random() * 0.04, v * v * gain, pan);
  }
}
