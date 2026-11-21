/**
 * The physics behind every movement of the reward. Units: px and seconds.
 *
 * Nothing here is random. Where many objects need to look varied (confetti, a handful of coins),
 * they are spread with low-discrepancy sequences (Halton) and the golden angle: the same sequences
 * nature uses for seeds in a sunflower. They cover the range evenly, without the clumps and holes that
 * random numbers give, and every run looks the same.
 */

export interface Point {
  x: number;
  y: number;
}

/** The golden angle, ≈ 137.5°. Successive multiples never line up, so points spread evenly. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Halton sequence: the i-th value in [0, 1) for a prime base. Different bases are independent. */
export function halton(index: number, base: number): number {
  let fraction = 1;
  let result = 0;
  for (let i = index + 1; i > 0; i = Math.floor(i / base)) {
    fraction /= base;
    result += fraction * (i % base);
  }
  return result;
}

/** Vogel's spiral (sunflower seeds): point i of a disc packed evenly, `spacing` px apart. */
export function phyllotaxis(index: number, spacing: number): Point {
  const r = spacing * Math.sqrt(index);
  const a = index * GOLDEN_ANGLE;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/**
 * A projectile thrown from `from` that peaks `apex` px above the higher of the two points and falls
 * into `to` (screen y grows downward). Constant gravity, no drag (a coin is heavy and small).
 *   rise time  √(2·rise/g), fall time √(2·fall/g), horizontal speed constant.
 */
export function ballistic(from: Point, to: Point, g: number, apex: number) {
  const top = Math.min(from.y, to.y) - apex;
  const tUp = Math.sqrt((2 * (from.y - top)) / g);
  const tDown = Math.sqrt((2 * (to.y - top)) / g);
  const duration = tUp + tDown;
  const vx = (to.x - from.x) / duration;
  const vy = -g * tUp;
  return {
    duration,
    at: (t: number): Point => ({ x: from.x + vx * t, y: from.y + vy * t + 0.5 * g * t * t }),
  };
}

/**
 * Drop from rest through `distance` px, then bounce on the floor with coefficient of restitution `e`
 * (each bounce leaves with e × the impact speed, so it rises e² as high). Returns the offset from the
 * resting position over time: −distance at the start, 0 on the floor.
 */
export function dropAndBounce(distance: number, g: number, e: number) {
  const segments: { start: number; v0: number; from: number; length: number }[] = [];
  const tFall = Math.sqrt((2 * distance) / g);
  segments.push({ start: 0, v0: 0, from: -distance, length: tFall });
  let t = tFall;
  for (let v = g * tFall * e; v > 40; v *= e) {
    const length = (2 * v) / g;
    segments.push({ start: t, v0: -v, from: 0, length });
    t += length;
  }
  return {
    duration: t,
    at: (time: number) => {
      let s = segments[0];
      for (const seg of segments) if (time >= seg.start) s = seg;
      const local = Math.min(time - s.start, s.length);
      return Math.min(0, s.from + s.v0 * local + 0.5 * g * local * local);
    },
  };
}

/** Time to cover `distance` from rest under constant acceleration: d = ½·a·t². */
export function accelerationTime(distance: number, acceleration: number): number {
  return Math.sqrt((2 * distance) / acceleration);
}

/**
 * The CSS easing that is exactly d = ½·a·t² (constant acceleration from rest): with these control
 * points the Bézier's x(s) = s and y(s) = s².
 */
export const EASE_CONSTANT_ACCELERATION = 'cubic-bezier(0.333, 0, 0.667, 0.333)';

/**
 * Damped spring (mass on a spring with friction), 0 < ζ < 1: the displacement from rest at time t,
 * starting at x0 with speed v0. It overshoots, swings back and settles; ω is the natural frequency.
 *   x(t) = e^(−ζωt)·(x0·cos(ωd·t) + (v0 + ζω·x0)/ωd · sin(ωd·t)),  ωd = ω·√(1 − ζ²)
 */
export function dampedSpring(x0: number, v0: number, omega: number, zeta: number, t: number): number {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return Math.exp(-zeta * omega * t) * (x0 * Math.cos(wd * t) + ((v0 + zeta * omega * x0) / wd) * Math.sin(wd * t));
}

/** Time for a damped spring's swing to shrink to 2 % (its envelope e^(−ζωt) = 0.02). */
export function dampedSpringSettle(omega: number, zeta: number): number {
  return 3.9 / (zeta * omega);
}

/** Critically damped spring, progress 0 → 1: fastest return without overshoot. */
export function criticallyDamped(t: number, omega: number): number {
  return 1 - (1 + omega * t) * Math.exp(-omega * t);
}

/** Time for a critically damped spring to be within 0.5 % of rest: (1 + ωt)·e^(−ωt) = 0.005. */
export function criticallyDampedSettle(omega: number): number {
  return 7.43 / omega;
}

/** Samples f(t) over [0, duration] at 60 per second into Web Animations keyframes. */
export function sample(duration: number, frame: (t: number) => Keyframe): Keyframe[] {
  const steps = Math.max(2, Math.ceil(duration * 60));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * duration;
    return { ...frame(t), offset: i / steps };
  });
}
