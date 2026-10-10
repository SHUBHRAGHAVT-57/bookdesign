export type SoundKind = 'key' | 'error' | 'turn' | 'success' | 'chime';

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (context === null) {
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(ctx: AudioContext, freq: number, type: OscillatorType, start: number, duration: number, volume: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function paperRustle(ctx: AudioContext, start: number, duration: number): void {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(900, start);
  filter.frequency.exponentialRampToValueAtTime(3200, start + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.06, start + duration * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

/** Generated with the Web Audio API; only ever called from user-driven handlers. */
export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getContext();
  if (ctx === null) return;
  const now = ctx.currentTime;
  switch (kind) {
    case 'key':
      tone(ctx, 1500, 'triangle', now, 0.03, 0.025);
      break;
    case 'error':
      tone(ctx, 190, 'sine', now, 0.09, 0.05);
      break;
    case 'turn':
      paperRustle(ctx, now, 0.7);
      break;
    case 'success':
      tone(ctx, 523.25, 'sine', now, 0.28, 0.07);
      tone(ctx, 659.25, 'sine', now + 0.12, 0.34, 0.07);
      break;
    case 'chime':
      tone(ctx, 784, 'sine', now, 0.4, 0.06);
      break;
  }
}
