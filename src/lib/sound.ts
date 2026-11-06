// Lightweight synthesized sound effects (Web Audio API) — no binary assets needed.
import { useProgress } from "../store/progress";

export type SoundName =
  | "move"
  | "capture"
  | "castle"
  | "promote"
  | "check"
  | "correct"
  | "wrong"
  | "gameStart"
  | "win"
  | "lose"
  | "draw";

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.3);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private tone(ctx: AudioContext, time: number, freq: number, duration: number, opts: ToneOpts = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, time);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, time + duration);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(opts.gain ?? 0.2, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  /** A short filtered noise burst — reads as a wooden "tock"/"click". */
  private click(ctx: AudioContext, time: number, duration: number, freq: number, gainPeak = 0.3) {
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainPeak, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(time);
    src.stop(time + duration + 0.02);
  }

  play(name: SoundName) {
    if (!useProgress.getState().soundEnabled) return;
    try {
      const ctx = this.ensureCtx();
      const t = ctx.currentTime;
      switch (name) {
        case "move":
          this.click(ctx, t, 0.07, 900, 0.22);
          this.tone(ctx, t, 180, 0.08, { gain: 0.1 });
          break;
        case "capture":
          this.click(ctx, t, 0.09, 600, 0.32);
          this.click(ctx, t + 0.02, 0.07, 1500, 0.16);
          break;
        case "castle":
          this.click(ctx, t, 0.06, 900, 0.2);
          this.click(ctx, t + 0.09, 0.06, 900, 0.2);
          break;
        case "promote":
          [660, 880, 1100].forEach((f, i) => this.tone(ctx, t + i * 0.07, f, 0.12, { type: "triangle", gain: 0.16 }));
          break;
        case "check":
          this.tone(ctx, t, 700, 0.09, { type: "square", gain: 0.1 });
          this.tone(ctx, t + 0.1, 950, 0.12, { type: "square", gain: 0.1 });
          break;
        case "correct":
          this.tone(ctx, t, 523, 0.1, { gain: 0.16 });
          this.tone(ctx, t + 0.09, 659, 0.1, { gain: 0.16 });
          this.tone(ctx, t + 0.18, 784, 0.18, { gain: 0.18 });
          break;
        case "wrong":
          this.tone(ctx, t, 220, 0.24, { type: "sawtooth", gain: 0.13, glideTo: 130 });
          break;
        case "gameStart":
          this.tone(ctx, t, 523, 0.12, { gain: 0.14 });
          this.tone(ctx, t + 0.1, 784, 0.18, { gain: 0.14 });
          break;
        case "win":
          [523, 659, 784, 1046].forEach((f, i) => this.tone(ctx, t + i * 0.09, f, 0.18, { type: "triangle", gain: 0.16 }));
          break;
        case "lose":
          [440, 370, 294].forEach((f, i) => this.tone(ctx, t + i * 0.12, f, 0.24, { gain: 0.14 }));
          break;
        case "draw":
          this.tone(ctx, t, 392, 0.2, { gain: 0.13 });
          this.tone(ctx, t + 0.15, 392, 0.2, { gain: 0.13 });
          break;
      }
    } catch {
      // Audio unavailable (e.g. blocked before a user gesture) — fail silently.
    }
  }
}

export const sound = new SoundEngine();
