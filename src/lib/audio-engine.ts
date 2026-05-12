// Lightweight cinematic audio engine using Web Audio API.
// No external assets, mobile-optimized, all sounds synthesized on demand.

export type SoundCategory = "boot" | "scan" | "execute" | "profit" | "loss" | "ui";

export type SoundSettings = {
  master: boolean;
  volume: number;     // 0..1
  ambience: boolean;  // scan loop
  profit: boolean;    // profit/loss/execute trade sounds
  voice: boolean;     // reserved (not used yet)
};

const KEY = "hifex.sound.v1";
const DEFAULTS: SoundSettings = {
  master: true,
  volume: 0.35,
  ambience: true,
  profit: true,
  voice: false,
};

let cachedCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let scanNodes: { osc: OscillatorNode; lfo: OscillatorNode; lfoGain: GainNode; gain: GainNode } | null = null;

function readSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function getSoundSettings(): SoundSettings { return readSettings(); }

export function setSoundSettings(patch: Partial<SoundSettings>) {
  const next = { ...readSettings(), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
    if (masterGain) masterGain.gain.value = next.master ? next.volume : 0;
    window.dispatchEvent(new CustomEvent("hifex:sound-settings", { detail: next }));
  }
  return next;
}

export function subscribeSoundSettings(cb: (s: SoundSettings) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<SoundSettings>).detail);
  window.addEventListener("hifex:sound-settings", handler);
  return () => window.removeEventListener("hifex:sound-settings", handler);
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!cachedCtx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    cachedCtx = new Ctor();
    masterGain = cachedCtx.createGain();
    const s = readSettings();
    masterGain.gain.value = s.master ? s.volume : 0;
    masterGain.connect(cachedCtx.destination);
  }
  if (cachedCtx.state === "suspended") cachedCtx.resume().catch(() => {});
  return cachedCtx;
}

function shouldPlay(cat: SoundCategory): boolean {
  const s = readSettings();
  if (!s.master) return false;
  if (cat === "scan" && !s.ambience) return false;
  if ((cat === "profit" || cat === "loss" || cat === "execute") && !s.profit) return false;
  return true;
}

// --- Helpers --------------------------------------------------------------

function tone(opts: {
  freq: number; type?: OscillatorType; duration: number;
  attack?: number; release?: number; gain?: number;
  freqEnd?: number; delay?: number; filterFreq?: number;
}) {
  const ctx = ensureCtx(); if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const dur = opts.duration;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqEnd), t0 + dur);
  const g = ctx.createGain();
  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let last: AudioNode = osc;
  if (opts.filterFreq) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = opts.filterFreq; f.Q.value = 0.7;
    osc.connect(f); last = f;
  }
  last.connect(g); g.connect(masterGain);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noiseBurst(opts: { duration: number; gain?: number; filterFreq?: number; delay?: number; type?: BiquadFilterType }) {
  const ctx = ensureCtx(); if (!ctx || !masterGain) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const dur = opts.duration;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = opts.type ?? "bandpass";
  filt.frequency.value = opts.filterFreq ?? 1200; filt.Q.value = 0.9;
  const g = ctx.createGain();
  const peak = opts.gain ?? 0.08;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt); filt.connect(g); g.connect(masterGain);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

// --- Public sounds --------------------------------------------------------

export function playBoot() {
  if (!shouldPlay("boot")) return;
  // Soft Jarvis-like rising pulse + airy whoosh
  tone({ freq: 220, freqEnd: 660, duration: 0.55, type: "sine",     gain: 0.16, attack: 0.02, filterFreq: 2400 });
  tone({ freq: 330, freqEnd: 990, duration: 0.55, type: "triangle", gain: 0.10, delay: 0.04, filterFreq: 3000 });
  noiseBurst({ duration: 0.6, gain: 0.05, filterFreq: 2200, type: "bandpass" });
  tone({ freq: 880,            duration: 0.18, type: "sine", gain: 0.12, delay: 0.5, filterFreq: 4000 });
  tone({ freq: 1320,           duration: 0.22, type: "sine", gain: 0.08, delay: 0.55, filterFreq: 5200 });
}

export function startScanLoop() {
  if (!shouldPlay("scan")) return;
  const ctx = ensureCtx(); if (!ctx || !masterGain) return;
  if (scanNodes) return;
  const osc = ctx.createOscillator();
  osc.type = "sine"; osc.frequency.value = 180;
  const lfo = ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.value = 0.4;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 60; // freq sweep depth
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.025, ctx.currentTime + 0.6);
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = 1200;
  osc.connect(filt); filt.connect(gain); gain.connect(masterGain);
  osc.start(); lfo.start();
  scanNodes = { osc, lfo, lfoGain, gain };
}

export function stopScanLoop() {
  const ctx = ensureCtx(); if (!ctx || !scanNodes) return;
  const t = ctx.currentTime;
  try {
    scanNodes.gain.gain.cancelScheduledValues(t);
    scanNodes.gain.gain.setValueAtTime(scanNodes.gain.gain.value, t);
    scanNodes.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    scanNodes.osc.stop(t + 0.45);
    scanNodes.lfo.stop(t + 0.45);
  } catch { /* noop */ }
  scanNodes = null;
}

export function playExecute() {
  if (!shouldPlay("execute")) return;
  // Crisp pro confirmation click
  tone({ freq: 1200, freqEnd: 1800, duration: 0.07, type: "square",   gain: 0.08, filterFreq: 3500 });
  tone({ freq: 660,                 duration: 0.18, type: "sine",     gain: 0.10, delay: 0.04, filterFreq: 2400 });
  noiseBurst({ duration: 0.05, gain: 0.04, filterFreq: 4000 });
}

export function playProfit() {
  if (!shouldPlay("profit")) return;
  // Elegant rising minor 3rd → 5th chime
  tone({ freq: 523.25, duration: 0.35, type: "sine",     gain: 0.16, filterFreq: 4000 }); // C5
  tone({ freq: 659.25, duration: 0.45, type: "sine",     gain: 0.14, delay: 0.10, filterFreq: 4000 }); // E5
  tone({ freq: 783.99, duration: 0.55, type: "triangle", gain: 0.12, delay: 0.22, filterFreq: 4500 }); // G5
}

export function playLoss() {
  if (!shouldPlay("loss")) return;
  // Calm low-tone descending pulse — controlled, not dramatic
  tone({ freq: 330, freqEnd: 220, duration: 0.45, type: "sine", gain: 0.10, filterFreq: 1400 });
  tone({ freq: 220, freqEnd: 165, duration: 0.55, type: "sine", gain: 0.07, delay: 0.08, filterFreq: 1200 });
}

export function playUiTap() {
  if (!shouldPlay("ui")) return;
  tone({ freq: 1400, duration: 0.05, type: "sine", gain: 0.05, filterFreq: 4000 });
}

// Initialise audio after first user gesture (mobile autoplay policy)
export function primeAudio() { ensureCtx(); }
