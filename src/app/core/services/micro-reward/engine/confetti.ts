import { ConfettiStyle } from '../micro-reward.config';
import { GOLDEN_ANGLE, halton } from './physics';

/**
 * Confetti on one <canvas>. No Angular. Units: px and seconds.
 *
 * The physics of real confetti, slowed down to be watched:
 *  - Gravity pulls every piece down at the same rate.
 *  - Air drag grows with the square of the speed (F = ½·ρ·Cd·A·v²). Written as an acceleration it is
 *    g·(v / vt)², so each piece settles at its terminal speed vt where drag equals gravity.
 *    Paper is light for its area and falls slowest; ribbons cut through the air edge-on and fall faster;
 *    sequins (the dots) are denser plastic and fall fastest.
 *  - A burst leaves the cannon as a clump that is heavy for its area (high terminal speed), so it
 *    flies up far. The clump separates within a fraction of a second; each piece then feels its own
 *    drag and stalls. That is why real confetti shoots up, stops sharply and then drifts down.
 *  - A falling sheet flutters: it rocks from side to side at the frequency vortices peel off it,
 *    f = St·v / L (Strouhal number St ≈ 0.2, L the size of the piece). Small pieces rock faster.
 *    The rocking tilts the sheet (drawn as its 3D flip) and the tilt glides it sideways.
 * Pieces are spread with Halton sequences, not random numbers: an even fan, the same every time.
 */

type Shape = 'paper' | 'ribbon' | 'sequin';

/** Terminal speed (px/s) and how strongly the shape glides sideways when it rocks. */
const SHAPES: Record<Shape, { terminal: number; glide: number }> = {
  paper: { terminal: 170, glide: 0.55 },
  ribbon: { terminal: 240, glide: 0.35 },
  sequin: { terminal: 300, glide: 0.15 },
};
/** Terminal speed of a burst before it separates, and how fast it separates (s). */
const CLUMP_TERMINAL = 1400;
const CLUMP_SEPARATION = 0.22;
const STROUHAL = 0.2;
/** The rocking is shown at 30 % of its real rate, matching the slowed-down fall, so the eye can follow it. */
const ROCK_PLAYBACK = 0.3;
const MAX_LIFE = 6;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: Shape;
  size: number;
  color: string;
  /** Rocking phase (radians): drives the tilt and the sideways glide. */
  phase: number;
  /** Resting angle in the plane of the screen. */
  angle: number;
  age: number;
  delay: number;
  clumped: boolean;
}

export interface ConfettiShot {
  style: ConfettiStyle;
  colors: string[];
  gravity: number;
  /** 1 = normal; more pieces for a bigger moment. */
  intensity?: number;
  /** Where the burst pops, as a fraction of the height (0 top, 1 bottom). */
  burstY?: number;
}

export class Confetti {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private pieces: Piece[] = [];
  private frame = 0;
  private last = 0;
  private width = 0;
  private height = 0;
  private gravity = 1500;
  private waiters: (() => void)[] = [];

  constructor(private readonly layer: HTMLElement) {
    this.canvas = layer.ownerDocument.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    layer.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Fires one shot. Resolves when the last piece has left the screen. */
  fire(shot: ConfettiShot): Promise<void> {
    this.resize();
    this.gravity = shot.gravity;
    const intensity = shot.intensity ?? 1;

    if (shot.style !== 'rain') {
      const count = Math.round(120 * intensity);
      const origin = { x: this.width / 2, y: this.height * (shot.burstY ?? 0.45) };
      const reach = Math.sqrt(this.height / 852); // same arc on any screen height
      for (let i = 0; i < count; i++) {
        // A fan 150° wide pointing up; speeds spread evenly between 650 and 1250 px/s.
        const angle = -Math.PI / 2 + (halton(i, 2) - 0.5) * (Math.PI * 0.83);
        const speed = (650 + 600 * halton(i, 3)) * reach;
        this.pieces.push(
          this.piece(i, shot.colors, origin.x, origin.y, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            delay: (i / count) * 0.08, // the cannon empties over 80 ms
            clumped: true,
          }),
        );
      }
    }

    if (shot.style !== 'burst') {
      // Already falling at terminal speed when they enter, staggered by height rather than by time.
      const count = Math.round(80 * intensity);
      for (let i = 0; i < count; i++) {
        const p = this.piece(i + 7, shot.colors, halton(i, 2) * this.width, -20 - halton(i, 3) * this.height * 0.35, {
          vx: 0,
          vy: 0,
          delay: shot.style === 'both' ? 0.15 : 0,
          clumped: false,
        });
        p.vy = SHAPES[p.shape].terminal;
        this.pieces.push(p);
      }
    }

    const done = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
    return done;
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pieces = [];
    this.canvas.remove();
    this.release();
  }

  private release(): void {
    this.waiters.splice(0).forEach((resolve) => resolve());
  }

  private piece(
    i: number,
    colors: string[],
    x: number,
    y: number,
    motion: Pick<Piece, 'vx' | 'vy' | 'delay' | 'clumped'>,
  ): Piece {
    const pick = halton(i, 7);
    const shape: Shape = pick < 0.6 ? 'paper' : pick < 0.8 ? 'ribbon' : 'sequin';
    return {
      x,
      y,
      ...motion,
      shape,
      size: 7 + 4 * halton(i, 5),
      color: colors[i % colors.length],
      phase: i * GOLDEN_ANGLE,
      angle: (i * GOLDEN_ANGLE * 2) % (Math.PI * 2),
      age: 0,
    };
  }

  private resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.layer.getBoundingClientRect();
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private step(p: Piece, dt: number): void {
    const g = this.gravity;
    const own = SHAPES[p.shape];
    // While clumped the burst is "heavier" for its area; it separates exponentially.
    const together = p.clumped ? Math.exp(-p.age / CLUMP_SEPARATION) : 0;
    const terminal = own.terminal + (CLUMP_TERMINAL - own.terminal) * together;

    const speed = Math.hypot(p.vx, p.vy);
    const drag = (g * speed) / (terminal * terminal); // |a| = g·(v/vt)², opposite to the motion
    // Rocking: frequency from the Strouhal number; the tilt glides the piece sideways (not while clumped).
    p.phase += ((2 * Math.PI * STROUHAL * Math.max(speed, own.terminal * 0.6)) / p.size) * dt * ROCK_PLAYBACK;
    const glide = own.glide * g * Math.cos(p.phase) * (1 - together);

    p.vx += (-drag * p.vx + glide) * dt;
    p.vy += (g - drag * p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  private readonly tick = (now: number) => {
    const elapsed = Math.min((now - this.last) / 1000, 1 / 20); // a hidden tab must not teleport pieces
    this.last = now;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    this.pieces = this.pieces.filter((p) => {
      if (p.delay > 0) {
        p.delay -= elapsed;
        return true;
      }
      // Two half steps keep the fast early burst stable.
      for (let k = 0; k < 2; k++) this.step(p, elapsed / 2);
      p.age += elapsed;
      if (p.y > this.height + 24 || p.age > MAX_LIFE) return false;

      const fade = Math.min(1, (MAX_LIFE - p.age) / 0.6);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + 0.5 * Math.sin(p.phase));
      ctx.scale(1, Math.cos(p.phase)); // the rocking tilt, seen edge-on at the extremes
      ctx.fillStyle = p.color;
      if (p.shape === 'sequin') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-p.size * 0.22, -p.size, p.size * 0.44, p.size * 2);
      } else {
        ctx.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
      }
      ctx.restore();
      return true;
    });

    if (this.pieces.length) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.frame = 0;
      ctx.clearRect(0, 0, this.width, this.height);
      this.release();
    }
  };
}
