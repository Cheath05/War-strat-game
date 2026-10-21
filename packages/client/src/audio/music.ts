// The soundtrack: original tunes in a 16-bit style, written as note strings and played by
// a small look-ahead sequencer. A step is an eighth note.
//   "D4:3 A4:1"   D4 for three steps, then A4 for one
//   "D3+F3+A3:8"  a chord
//   "-:2"         a rest
//   "k:1 s:1 h:1" drums: kick, snare, hi-hat (the drum track only)

import { audio } from './engine';

type Inst = 'lead' | 'brass' | 'strings' | 'harp' | 'flute' | 'bass' | 'drums' | 'timpani';

interface Track {
  inst: Inst;
  vol: number;
  seq: string;
}

interface Song {
  bpm: number;
  loop: boolean;
  tracks: Track[];
}

export type SongName = 'title' | 'battle' | 'victory' | 'defeat';

// --- Note helpers --------------------------------------------------------------------------

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 69;
  return NAMES[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}

function freq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function noteName(m: number): string {
  const n = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((m % 12) + 12) % 12]!;
  return `${n}${Math.floor(m / 12) - 1}`;
}

/** Each chord held for a bar. */
function pads(chords: string[], steps = 8): string {
  return chords.map((c) => `${c}:${steps}`).join(' ');
}

/** A bass line: per bar, the pattern's semitone offsets from the bar's root, `len` steps each. */
function bassLine(roots: string[], pattern: number[], len: number): string {
  return roots.map((r) => pattern.map((o) => `${noteName(midi(r) + o)}:${len}`).join(' ')).join(' ');
}

/** Short brass stabs on beats one and three, an octave above the chord. */
function stabs(chords: string[]): string {
  return chords.map((c) => {
    const up = c.split('+').map((n) => noteName(midi(n) + 12)).join('+');
    return `${up}:1 -:3 ${up}:1 -:3`;
  }).join(' ');
}

function repeat(bar: string, n: number): string {
  return Array.from({ length: n }, () => bar).join(' ');
}

// --- The songs -----------------------------------------------------------------------------

// "Banners of the Legions": a marching theme in D minor for the menus.
const TITLE_CHORDS = ['D3+F3+A3', 'C3+E3+G3', 'Bb2+D3+F3', 'C3+E3+G3', 'F3+A3+C4', 'Bb2+D3+F3', 'A2+C#3+E3', 'D3+F3+A3', 'D3+F3+A3', 'C3+E3+G3', 'G2+Bb2+D3', 'A2+C#3+E3', 'Bb2+D3+F3', 'G2+Bb2+D3', 'A2+C#3+E3', 'D3+F3+A3'];
const TITLE: Song = {
  bpm: 100,
  loop: true,
  tracks: [
    {
      inst: 'lead',
      vol: 1,
      seq: [
        'D4:3 A4:1 A4:2 G4:1 F4:1',
        'E4:2 F4:2 G4:2 A4:2',
        'D5:3 C5:1 A4:2 F4:2',
        'G4:6 -:2',
        'F4:3 G4:1 A4:2 C5:2',
        'D5:2 C5:2 A4:2 G4:2',
        'F4:2 E4:2 D4:2 C#4:2',
        'D4:6 -:2',
        'A4:3 D5:1 D5:2 E5:1 F5:1',
        'E5:2 D5:2 C5:2 A4:2',
        'Bb4:3 A4:1 G4:2 Bb4:2',
        'A4:6 -:2',
        'D5:3 C5:1 Bb4:2 A4:2',
        'G4:2 A4:2 Bb4:2 G4:2',
        'A4:2 G4:2 F4:2 E4:2',
        'D4:8',
      ].join(' '),
    },
    { inst: 'strings', vol: 1, seq: pads(TITLE_CHORDS) },
    { inst: 'bass', vol: 1, seq: bassLine(['D2', 'C2', 'Bb1', 'C2', 'F2', 'Bb1', 'A1', 'D2', 'D2', 'C2', 'G1', 'A1', 'Bb1', 'G1', 'A1', 'D2'], [0, 12, 7, 12], 2) },
    { inst: 'drums', vol: 0.8, seq: repeat('k:2 s:2 k:1 k:1 s:2', 16) },
  ],
};

// "Clash at the Gates": the battle theme in A minor, with a driving bass and brass.
const BATTLE_CHORDS = ['A2+C3+E3', 'A2+C3+E3', 'G2+B2+D3', 'E2+G#2+B2', 'A2+C3+E3', 'C3+E3+G3', 'F2+A2+C3', 'A2+C3+E3', 'F2+A2+C3', 'G2+B2+D3', 'C3+E3+G3', 'E2+G#2+B2', 'D3+F3+A3', 'A2+C3+E3', 'E2+G#2+B2', 'A2+C3+E3'];
const BATTLE: Song = {
  bpm: 138,
  loop: true,
  tracks: [
    {
      inst: 'lead',
      vol: 0.9,
      seq: [
        'A4:2 A4:1 B4:1 C5:2 B4:1 A4:1',
        'E5:4 D5:2 C5:2',
        'B4:2 B4:1 C5:1 D5:2 C5:1 B4:1',
        'A4:4 G#4:2 E4:2',
        'A4:2 A4:1 B4:1 C5:2 D5:2',
        'E5:2 F5:2 E5:2 D5:2',
        'C5:2 B4:2 A4:2 G#4:2',
        'A4:6 -:2',
        'F5:3 E5:1 D5:2 C5:2',
        'D5:3 C5:1 B4:2 A4:2',
        'C5:3 B4:1 A4:2 G4:2',
        'E5:6 -:2',
        'F5:2 E5:2 D5:2 F5:2',
        'E5:2 D5:2 C5:2 E5:2',
        'D5:2 C5:2 B4:2 G#4:2',
        'A4:8',
      ].join(' '),
    },
    { inst: 'brass', vol: 0.8, seq: stabs(BATTLE_CHORDS) },
    { inst: 'strings', vol: 0.7, seq: pads(BATTLE_CHORDS) },
    { inst: 'bass', vol: 1, seq: bassLine(['A1', 'A1', 'G1', 'E1', 'A1', 'C2', 'F1', 'A1', 'F1', 'G1', 'C2', 'E1', 'D2', 'A1', 'E1', 'A1'], [0, 0, 12, 0, 0, 12, 0, 12], 1) },
    { inst: 'drums', vol: 0.9, seq: repeat('k:1 h:1 s:1 h:1 k:1 k:1 s:1 h:1', 16) },
    { inst: 'timpani', vol: 0.9, seq: repeat('A1:1 -:15 E1:1 -:7 E1:1 -:7', 4) },
  ],
};

const VICTORY: Song = {
  bpm: 112,
  loop: false,
  tracks: [
    { inst: 'lead', vol: 1, seq: 'G4:1 C5:1 E5:1 G5:3 E5:1 F5:1 G5:2 A5:2 B5:2 C6:2 C6:8' },
    { inst: 'brass', vol: 1, seq: 'C4+E4+G4:8 F3+A3+C4:4 G3+B3+D4:4 C4+E4+G4:8' },
    { inst: 'bass', vol: 1, seq: 'C2:4 G2:4 F2:4 G2:4 C2:8' },
    { inst: 'timpani', vol: 1, seq: 'C2:4 G1:4 C2:2 G1:2 C2:2 G1:2 C2:8' },
  ],
};

const DEFEAT: Song = {
  bpm: 66,
  loop: false,
  tracks: [
    { inst: 'flute', vol: 1, seq: 'A4:4 G4:2 F4:2 E4:6 D4:2 C#4:4 E4:4 D4:8' },
    { inst: 'strings', vol: 1, seq: pads(['D3+F3+A3', 'A2+C#3+E3', 'A2+C#3+G3', 'D3+F3+A3']) },
    { inst: 'bass', vol: 0.8, seq: 'D2:8 A1:8 A1:8 D2:8' },
  ],
};

const SONGS: Record<SongName, Song> = { title: TITLE, battle: BATTLE, victory: VICTORY, defeat: DEFEAT };

// --- Instruments ---------------------------------------------------------------------------

function play(inst: Inst, token: string, t: number, dur: number, vol: number): void {
  if (inst === 'drums') {
    for (const d of token.split('+')) {
      if (d === 'k') audio.note({ bus: 'music', wave: 'sine', freq: 120, to: 45, t, dur: 0.09, vol: 0.55 * vol, attack: 0.002, decay: 0.08, sustain: 0.3, release: 0.06 });
      else if (d === 's') {
        audio.note({ bus: 'music', wave: 'noise', freq: 0, t, dur: 0.07, vol: 0.22 * vol, attack: 0.002, decay: 0.08, sustain: 0.2, release: 0.08, filter: { type: 'bandpass', freq: 1900, q: 0.9 }, send: 0.25 });
        audio.note({ bus: 'music', wave: 'triangle', freq: 190, to: 140, t, dur: 0.05, vol: 0.12 * vol, attack: 0.002, decay: 0.05, sustain: 0.2, release: 0.04 });
      } else if (d === 'h') audio.note({ bus: 'music', wave: 'noise', freq: 0, t, dur: 0.02, vol: 0.06 * vol, attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.03, filter: { type: 'highpass', freq: 7000 } });
    }
    return;
  }
  for (const n of token.split('+')) {
    const f = freq(midi(n));
    switch (inst) {
      case 'lead':
        audio.note({ bus: 'music', wave: 'pulse25', freq: f, t, dur: dur * 0.9, vol: 0.13 * vol, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.1, vibrato: 0.006, send: 0.35 });
        break;
      case 'flute':
        audio.note({ bus: 'music', wave: 'sine', freq: f, t, dur: dur * 0.95, vol: 0.2 * vol, attack: 0.08, decay: 0.2, sustain: 0.85, release: 0.25, vibrato: 0.008, send: 0.5 });
        break;
      case 'brass':
        audio.note({ bus: 'music', wave: 'sawtooth', freq: f, t, dur: dur * 0.85, vol: 0.075 * vol, attack: 0.025, decay: 0.2, sustain: 0.75, release: 0.12, filter: { type: 'lowpass', freq: 2600, to: 1000, q: 1.2 }, send: 0.4 });
        break;
      case 'strings':
        for (const det of [-8, 8]) audio.note({ bus: 'music', wave: 'sawtooth', freq: f, t, dur, vol: 0.03 * vol, attack: 0.3, decay: 0.3, sustain: 0.9, release: 0.5, filter: { type: 'lowpass', freq: 1500, q: 0.4 }, detune: det, send: 0.6 });
        break;
      case 'harp':
        audio.note({ bus: 'music', wave: 'triangle', freq: f, t, dur: 0.02, vol: 0.13 * vol, attack: 0.003, decay: 0.5, sustain: 0.001, release: 0.4, send: 0.5 });
        break;
      case 'bass':
        audio.note({ bus: 'music', wave: 'triangle', freq: f, t, dur: dur * 0.85, vol: 0.3 * vol, attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.05 });
        break;
      case 'timpani':
        audio.note({ bus: 'music', wave: 'sine', freq: f * 1.04, to: f, t, dur: 0.1, vol: 0.45 * vol, attack: 0.003, decay: 0.6, sustain: 0.15, release: 0.5, send: 0.3 });
        audio.note({ bus: 'music', wave: 'noise', freq: 0, t, dur: 0.05, vol: 0.12 * vol, attack: 0.002, decay: 0.08, sustain: 0.1, release: 0.1, filter: { type: 'lowpass', freq: 320 } });
        break;
    }
  }
}

// --- The sequencer -------------------------------------------------------------------------

interface Ev {
  step: number;
  len: number;
  token: string;
}

function parse(seq: string): { evs: Ev[]; steps: number } {
  const evs: Ev[] = [];
  let step = 0;
  for (const tok of seq.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [what, n] = tok.split(':');
    const len = Number(n ?? 1) || 1;
    if (what && what !== '-') evs.push({ step, len, token: what });
    step += len;
  }
  return { evs, steps: step };
}

class MusicPlayer {
  private current: SongName | null = null;
  private tracks: { inst: Inst; vol: number; evs: Ev[]; next: number }[] = [];
  private loop = false;
  private loopSteps = 0;
  private stepSec = 0;
  private start = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Plays a song (looping ones until another is chosen); the same song keeps playing. */
  play(name: SongName): void {
    if (this.current === name) return;
    this.stop();
    this.current = name;
    audio.whenReady(() => {
      if (this.current === name) this.begin(SONGS[name]);
    });
  }

  stop(): void {
    this.current = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.tracks = [];
  }

  private begin(song: Song): void {
    this.tracks = song.tracks.map((t) => ({ inst: t.inst, vol: t.vol, evs: parse(t.seq).evs, next: 0 }));
    this.loopSteps = Math.max(...song.tracks.map((t) => parse(t.seq).steps));
    this.loop = song.loop;
    this.stepSec = 60 / song.bpm / 2;
    this.start = audio.now + 0.15;
    this.timer = setInterval(() => this.pump(), 50);
    this.pump();
  }

  private pump(): void {
    const horizon = audio.now + 0.3;
    for (let guard = 0; guard < 4; guard++) {
      let done = true;
      for (const tr of this.tracks) {
        while (tr.next < tr.evs.length) {
          const ev = tr.evs[tr.next]!;
          const t = this.start + ev.step * this.stepSec;
          if (t > horizon) {
            done = false;
            break;
          }
          if (t >= audio.now - 0.05) play(tr.inst, ev.token, t, ev.len * this.stepSec, tr.vol);
          tr.next++;
        }
      }
      if (!done) return;
      const end = this.start + this.loopSteps * this.stepSec;
      if (!this.loop) {
        if (audio.now > end + 2) this.stop();
        return;
      }
      if (end > horizon) return;
      // Next time round; after a long stall (a hidden tab), start over from now.
      this.start = end < audio.now - 1 ? audio.now + 0.05 : end;
      for (const tr of this.tracks) tr.next = 0;
    }
  }
}

export const music = new MusicPlayer();
