/**
 * Minimal Web Audio guitar-pluck engine — zero dependencies, no bundled samples.
 *
 * Uses the classic Karplus–Strong plucked-string algorithm: seed a short delay
 * line with noise, then repeatedly average-and-decay it. This synthesizes a
 * convincingly guitar-like tone from pure math, so we don't ship audio assets.
 *
 * The AudioContext is created lazily on first playback (browsers require a user
 * gesture) and every call degrades to a no-op when Web Audio is unavailable
 * (SSR, jsdom tests, locked-down browsers) — callers never need to guard.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterVolume = 0.7;

const PLUCK_SECONDS = 1.6;
const STRING_DAMPING = 0.996; // higher = longer sustain
const STRUM_SPACING_MS = 22; // stagger between chord tones for a strummed feel

type AudioContextCtor = typeof AudioContext;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      master = null;
    }
  }
  return ctx;
}

/** Set the master output volume (0–1). Applies immediately if the engine is live. */
export function setVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = masterVolume;
}

/** Build a Karplus–Strong plucked-string waveform for one frequency. */
function makePluckBuffer(context: BaseAudioContext, frequency: number): AudioBuffer {
  const sr = context.sampleRate;
  const n = Math.max(2, Math.floor(sr / frequency)); // delay-line length
  const total = Math.floor(sr * PLUCK_SECONDS);
  const buffer = context.createBuffer(1, total, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < total; i++) {
    if (i < n) {
      data[i] = Math.random() * 2 - 1; // initial noise burst
    } else {
      data[i] = STRING_DAMPING * 0.5 * (data[i - n] + data[i - n + 1]); // average + decay
    }
  }
  return buffer;
}

/**
 * Pluck a set of frequencies, lightly staggered so a chord reads as a strum.
 * No-op when Web Audio is unavailable or the list is empty.
 */
export function playFrequencies(freqs: number[]): void {
  const context = getContext();
  if (!context || !master) return;
  if (context.state === 'suspended') void context.resume().catch(() => {});

  const now = context.currentTime;
  freqs.forEach((f, idx) => {
    if (!Number.isFinite(f) || f <= 0) return;
    const src = context.createBufferSource();
    src.buffer = makePluckBuffer(context, f);
    const g = context.createGain();
    g.gain.value = 0.9;
    src.connect(g);
    g.connect(master!);
    const at = now + (idx * STRUM_SPACING_MS) / 1000;
    src.start(at);
    src.stop(at + PLUCK_SECONDS);
  });
}
