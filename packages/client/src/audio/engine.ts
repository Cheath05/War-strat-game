// 16-bit, SNES-style sound, all synthesised with Web Audio: pulse waves, filtered saws and
// noise through a shared hall reverb. No sample files. Music and effects each have a volume
// setting; browsers only allow sound after the first click or key press.

export interface AudioPrefs {
  music: number;
  sfx: number;
}

const KEY = 'pl.audio';

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<AudioPrefs> | null;
    return { music: raw?.music ?? 0.5, sfx: raw?.sfx ?? 0.7 };
  } catch {
    return { music: 0.5, sfx: 0.7 };
  }
}

export function saveAudioPrefs(p: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // fine: the defaults come back next time
  }
}

export type Wave = OscillatorType | 'pulse12' | 'pulse25' | 'noise';

export interface NoteSpec {
  bus: 'music' | 'sfx';
  wave: Wave;
  /** Hz (ignored for noise). */
  freq: number;
  /** Start, in AudioContext seconds. */
  t: number;
  /** Held length before the release, seconds. */
  dur: number;
  vol: number;
  attack?: number;
  decay?: number;
  /** Sustain level as a fraction of vol. */
  sustain?: number;
  release?: number;
  /** Frequency at the end of the note (pitch slide). */
  to?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number; to?: number };
  detune?: number;
  pan?: number;
  /** Reverb send, 0..1. */
  send?: number;
  vibrato?: number;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  prefs = loadAudioPrefs();
  private master!: GainNode;
  private buses!: Record<'music' | 'sfx', GainNode>;
  private reverbIn!: GainNode;
  private pulses = new Map<string, PeriodicWave>();
  private noise: AudioBuffer | null = null;
  private listeners: (() => void)[] = [];

  /** Starts audio on the first click or key press (browsers block it before that). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp);
    this.buses = { music: ctx.createGain(), sfx: ctx.createGain() };
    this.buses.music.connect(this.master);
    this.buses.sfx.connect(this.master);
    this.applyPrefs();
    // The hall: a convolution with two seconds of decaying stereo noise.
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    this.reverbIn = ctx.createGain();
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverbIn.connect(conv);
    conv.connect(wet);
    wet.connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    for (const fn of this.listeners) fn();
    this.listeners = [];
  }

  /** Runs fn once audio is available (now, or after the first click). */
  whenReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.listeners.push(fn);
  }

  setPrefs(p: AudioPrefs): void {
    this.prefs = p;
    saveAudioPrefs(p);
    this.applyPrefs();
  }

  private applyPrefs(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.buses.music.gain.setTargetAtTime(this.prefs.music * 0.55, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(this.prefs.sfx, t, 0.05);
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** A pulse wave with the given duty cycle (the NES/SNES lead sound), from its Fourier series. */
  private pulse(duty: number): PeriodicWave {
    const key = String(duty);
    let w = this.pulses.get(key);
    if (!w) {
      const n = 48;
      const re = new Float32Array(n);
      const im = new Float32Array(n);
      for (let k = 1; k < n; k++) {
        const th = 2 * Math.PI * k * duty;
        re[k] = Math.sin(th) / (Math.PI * k);
        im[k] = (1 - Math.cos(th)) / (Math.PI * k);
      }
      w = this.ctx!.createPeriodicWave(re, im);
      this.pulses.set(key, w);
    }
    return w;
  }

  /** Plays one synthesised note. */
  note(n: NoteSpec): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const bus = this.buses[n.bus];
    if (bus.gain.value < 0.001) return;
    const a = n.attack ?? 0.005;
    const d = n.decay ?? 0.08;
    const s = n.sustain ?? 0.7;
    const r = n.release ?? 0.08;
    const t0 = Math.max(ctx.currentTime, n.t);
    const t1 = t0 + Math.max(n.dur, a + 0.001);
    let src: AudioScheduledSourceNode;
    let freqParam: AudioParam | null = null;
    if (n.wave === 'noise') {
      const b = ctx.createBufferSource();
      b.buffer = this.noise;
      b.loop = true;
      src = b;
      b.start(t0, Math.random() * 1.5);
    } else {
      const o = ctx.createOscillator();
      if (n.wave === 'pulse12') o.setPeriodicWave(this.pulse(0.125));
      else if (n.wave === 'pulse25') o.setPeriodicWave(this.pulse(0.25));
      else o.type = n.wave;
      o.frequency.setValueAtTime(n.freq, t0);
      if (n.to) o.frequency.exponentialRampToValueAtTime(Math.max(1, n.to), t1);
      if (n.detune) o.detune.value = n.detune;
      freqParam = o.frequency;
      src = o;
      o.start(t0);
    }
    if (n.vibrato && freqParam) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t0);
      depth.gain.linearRampToValueAtTime(n.freq * n.vibrato, t0 + Math.min(0.3, n.dur));
      lfo.connect(depth);
      depth.connect(freqParam);
      lfo.start(t0);
      lfo.stop(t1 + r + 0.05);
    }
    let node: AudioNode = src;
    if (n.filter) {
      const f = ctx.createBiquadFilter();
      f.type = n.filter.type;
      f.frequency.setValueAtTime(n.filter.freq, t0);
      if (n.filter.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, n.filter.to), t1 + r);
      f.Q.value = n.filter.q ?? 0.8;
      node.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(n.vol, t0 + a);
    g.gain.setTargetAtTime(n.vol * s, t0 + a, Math.max(0.005, d / 3));
    g.gain.setValueAtTime(n.vol * s, t1);
    g.gain.linearRampToValueAtTime(0, t1 + r);
    node.connect(g);
    let out: AudioNode = g;
    if (n.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, n.pan));
      g.connect(p);
      out = p;
    }
    out.connect(bus);
    if (n.send) {
      const sg = ctx.createGain();
      sg.gain.value = n.send;
      out.connect(sg);
      sg.connect(this.reverbIn);
    }
    src.stop(t1 + r + 0.02);
  }
}

export const audio = new AudioEngine();

/** Frequency of a note name such as "A4", "C#5" or "Bb3". */
export function hz(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 440;
  const base: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const semi = base[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semi / 12);
}
