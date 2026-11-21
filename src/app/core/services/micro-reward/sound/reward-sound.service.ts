import { Injectable, inject } from '@angular/core';
import { MICRO_REWARD_CONFIG } from '../micro-reward.config';

/**
 * The reward sounds, made in the browser with the Web Audio API (no files to ship).
 *
 * Coin: a slot-machine payout coin dropping into a metal tray. Three layers per coin:
 *  - Ring: a warm metallic "ding" around E6 (1.32 kHz). Its overtones sit close to whole multiples
 *    (2×, 3×, 4.2×), like a bell or a thick coin, and each is doubled a few hertz apart, so the two copies
 *    beat against each other: the shimmer of real metal. A low-pass at 6 kHz takes off the glassy top.
 *  - Tray: the dull thunk of the coin landing in the metal tray (band of noise around 700 Hz, 30 ms).
 *  - Click: the contact itself, short and soft (noise around 3.5 kHz, 6 ms).
 * The coin bounces once: the bounce comes 45 ms later at the restitution of the impact (0.38 × as loud).
 * Coins step through a payout pattern of pitches, a semitone apart, so a run sounds like coins pouring
 * out rather than one sample repeated. The last coin adds a higher "ka-ching" bell.
 *
 * Done: a short rising chime.
 *
 * Browsers only allow sound after a tap: `unlock()` must run inside the tap handler.
 */
@Injectable({ providedIn: 'root' })
export class RewardSoundService {
  private readonly config = inject(MICRO_REWARD_CONFIG);
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;

  /** Overtones of the ring: frequency ratio, loudness, ring time (s). */
  private readonly partials = [
    [1, 1, 0.26],
    [2.0, 0.42, 0.18],
    [3.0, 0.22, 0.12],
    [4.2, 0.12, 0.08],
  ] as const;
  /** Payout pitch pattern in semitones above E6. */
  private readonly pattern = [0, 2, 1, 3, 2, 4];
  private readonly restitution = 0.38;

  unlock(): void {
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  playDone(): void {
    if (!this.config.sound) return;
    if (this.config.soundFiles.done) return this.playFile(this.config.soundFiles.done);
    const ctx = this.ctx;
    if (!ctx) return;
    const start = ctx.currentTime + 0.01;
    [784, 1047, 1319, 1568].forEach((hz, i) => this.tone(hz, start + i * 0.075, 0.32, 0.8 * 0.22));
  }

  /** `index`: the coin's place in the run (0, 1, 2 …). `last`: the final coin of the reward. */
  playCoin(index: number, last = false): void {
    if (!this.config.sound) return;
    if (this.config.soundFiles.coin) return this.playFile(this.config.soundFiles.coin);
    const ctx = this.ctx;
    if (!ctx) return;

    const out = ctx.createBiquadFilter(); // takes the glassy top off
    out.type = 'lowpass';
    out.frequency.value = 6000;
    out.Q.value = 0.5;
    out.connect(ctx.destination);

    const f0 = 1319 * 2 ** (this.pattern[index % this.pattern.length] / 12);
    const at = ctx.currentTime + 0.005;
    this.coinHit(out, f0, at, 1);
    this.coinHit(out, f0, at + 0.045, this.restitution); // the bounce
    if (last) {
      // "ka-ching": a higher bell a fifth up, shortly after.
      this.ring(out, f0 * 1.5, at + 0.09, 0.75, 1.6);
      this.ring(out, f0 * 2, at + 0.14, 0.55, 1.8);
    }
  }

  private coinHit(out: AudioNode, f0: number, at: number, strength: number): void {
    this.ring(out, f0, at, strength, 1);
    this.burst(out, at, 700, 1.2, 0.03, 0.55 * strength); // tray thunk
    this.burst(out, at, 3500, 0.9, 0.006, 0.22 * strength); // contact click
  }

  /** The metallic ring: each overtone doubled a few hertz apart so the copies beat (shimmer). */
  private ring(out: AudioNode, f0: number, at: number, strength: number, length: number): void {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0.11 * strength;
    gain.connect(out);
    for (const [ratio, level, ring] of this.partials) {
      for (const detune of [-3, 3]) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.frequency.value = f0 * ratio + detune * ratio;
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(level, at + 0.002);
        env.gain.exponentialRampToValueAtTime(0.0001, at + ring * length);
        osc.connect(env).connect(gain);
        osc.start(at);
        osc.stop(at + ring * length + 0.02);
      }
    }
  }

  /** A short band of noise: the tray thunk or the contact click. */
  private burst(out: AudioNode, at: number, hz: number, q: number, length: number, level: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = hz;
    band.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(level, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(band).connect(env).connect(out);
    src.start(at);
    src.stop(at + length + 0.01);
  }

  /** 50 ms of noise from a fixed linear congruential sequence, so every hit sounds the same. */
  private noiseBuffer(): AudioBuffer {
    if (this.noise) return this.noise;
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 22695477;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 2 ** 31 - 1;
    }
    return (this.noise = buffer);
  }

  private tone(hz: number, at: number, length: number, level: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  private playFile(src: string): void {
    const audio = new Audio(src);
    void audio.play().catch(() => undefined);
  }
}
