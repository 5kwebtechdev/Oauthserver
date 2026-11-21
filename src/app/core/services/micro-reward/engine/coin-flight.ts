import { Point, dampedSpring, dampedSpringSettle, GOLDEN_ANGLE, phyllotaxis, sample } from './physics';

/**
 * The coins, in three beats. No Angular. Units: px and seconds.
 *
 * Only a handful of coins are drawn (5 by default), whatever the reward: they stand for the reward,
 * they do not count it. The pill's number shows the real amount.
 *
 * 1. Erupt. One after another, coins pop out of the card's coin icon into a loose swarm above it.
 *    Their places follow Vogel's spiral (sunflower seeds), so they never line up. Each is launched
 *    upward and held in place by a damped spring: it overshoots, swings back and settles; its flip
 *    slows with the same damping, so it rests face up.
 * 2. Hover. They float there for a moment, each drifting on its own small figure (two sine motions at
 *    different frequencies, a Lissajous curve), out of step with the others. Every coin is crisp,
 *    full size and fully opaque.
 * 3. Collect. They leave one right after another, pulled to the pill by a constant force: from rest,
 *    constant acceleration in a straight line (d = ½·a·t²). Only at the fastest part of the flight
 *    does a light motion blur appear (blur = speed × exposure time, at most 1.5 px); the coin is sharp
 *    again on impact. Each lands exactly on the pill's coin and merges.
 */

export interface CoinCollectOptions {
  layer: HTMLElement;
  /** Centre of the card's coin icon, in layer coordinates. */
  from: Point;
  /** Centre of the pill's coin, in layer coordinates. Read when the coins set off. */
  to: () => Point;
  /** Size of the pill's coin (px): the flying coin grows to it as it merges. */
  targetSize: number;
  count: number;
  coinSrc: string;
  eruptInterval: number; // ms between two coins erupting
  hoverHold: number; // ms all coins float together before setting off
  collectStagger: number; // ms between two coins setting off
  eruptSpeed: number; // px/s upward launch
  hoverHeight: number; // px above the icon
  springOmega: number; // rad/s
  springDamping: number; // ζ
  pull: number; // px/s² towards the pill
  /** A coin has left the card. */
  onErupt?: (index: number) => void;
  /** A coin has hit the pill. */
  onLand: (index: number) => void;
}

const COIN = 24; // px
/** Swarm spacing (px) and its horizontal stretch: wider than tall. */
const SWARM = { spacing: 17, stretch: 1.6 };
/** Hover drift: amplitudes (px) and the two frequencies (Hz) of the Lissajous figure. */
const DRIFT = { x: 4, y: 3, fx: 0.9, fy: 1.35 };
/** Camera exposure (s): motion blur = speed × exposure. Capped so a coin never turns into a smear. */
const EXPOSURE = 1 / 400;
const MAX_MOTION_BLUR = 1.5;

interface Swarm {
  slot: Point;
}

/** When the coins set off for the pill, in ms after the call (so a floating pill can be there first). */
export function collectStartTime(
  o: Pick<CoinCollectOptions, 'count' | 'eruptInterval' | 'hoverHold' | 'springOmega' | 'springDamping'>,
): number {
  return (o.count - 1) * o.eruptInterval + dampedSpringSettle(o.springOmega, o.springDamping) * 1000 * 0.6 + o.hoverHold;
}

/** Resolves when the last coin has merged into the pill. */
export function eruptAndCollect(o: CoinCollectOptions): Promise<void> {
  const start = collectStartTime(o);
  return Promise.all(
    swarm(o).map((place, i) =>
      wait(i * o.eruptInterval).then(() => {
        o.onErupt?.(i);
        return flyOne(o, i, place, (start + i * o.collectStagger - i * o.eruptInterval) / 1000);
      }),
    ),
  ).then(() => undefined);
}

/** A loose swarm above the icon: Vogel's spiral, stretched sideways, kept on screen. */
function swarm(o: CoinCollectOptions): Swarm[] {
  const width = o.layer.getBoundingClientRect().width;
  const places = Array.from({ length: o.count }, (_, i) => {
    const p = phyllotaxis(i + 0.5, SWARM.spacing);
    return { x: p.x * SWARM.stretch, y: p.y };
  });
  const reach = Math.max(0, ...places.map((p) => Math.abs(p.x))) + COIN / 2 + 16;
  const centre = { x: Math.min(Math.max(o.from.x, reach), width - reach), y: o.from.y - o.hoverHeight };
  return places.map((p) => ({ slot: { x: centre.x + p.x, y: centre.y + p.y } }));
}

function filter(blur: number): string {
  // not in design tokens: shadow Neutral900 at 30%
  return `blur(${blur.toFixed(2)}px) drop-shadow(0 2px 3px rgba(40, 37, 39, 0.3))`;
}

async function flyOne(o: CoinCollectOptions, index: number, place: Swarm, hoverFor: number): Promise<void> {
  const coin = o.layer.ownerDocument.createElement('img');
  coin.src = o.coinSrc;
  coin.alt = '';
  // Later coins are drawn in front of earlier ones.
  Object.assign(coin.style, {
    position: 'absolute',
    left: `${-COIN / 2}px`,
    top: `${-COIN / 2}px`,
    width: `${COIN}px`,
    height: `${COIN}px`,
    zIndex: String(2 + index),
    willChange: 'transform, opacity, filter',
  });
  o.layer.appendChild(coin);

  // 1–2. Erupt into its place on a damped spring, then drift until it is this coin's turn to go.
  const { springOmega: w, springDamping: z } = o;
  const { slot } = place;
  const x0 = o.from.x - slot.x;
  const y0 = o.from.y - slot.y;
  const phase = index * GOLDEN_ANGLE;
  const position = (t: number): Point => {
    const driftIn = 1 - Math.exp(-t / 0.3);
    return {
      x: slot.x + dampedSpring(x0, 0, w, z, t) + DRIFT.x * driftIn * Math.sin(2 * Math.PI * DRIFT.fx * t + phase),
      y:
        slot.y +
        dampedSpring(y0, -o.eruptSpeed, w, z, t) +
        DRIFT.y * driftIn * Math.sin(2 * Math.PI * DRIFT.fy * t + 2 * phase),
    };
  };
  const motionBlur = (speed: number) => Math.min(MAX_MOTION_BLUR, speed * EXPOSURE);

  const hover = sample(hoverFor, (t) => {
    const p = position(t);
    const flip = 720 * (1 - Math.exp(-z * w * t)); // two turns, slowing to rest face up
    const grow = Math.min(1, t / 0.08);
    return {
      transform: `translate(${p.x}px, ${p.y}px) scale(${0.5 + 0.5 * grow}) rotateY(${flip}deg)`,
      filter: filter(0),
    };
  });
  await coin.animate(hover, { duration: hoverFor * 1000, easing: 'linear', fill: 'forwards' }).finished;

  // 3. Pulled to the pill: constant acceleration from rest, straight line. It grows to the pill coin's
  // size and, only while fast, streaks lightly with its speed.
  const from = position(hoverFor);
  const to = o.to();
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const travel = Math.sqrt((2 * distance) / o.pull);
  const endScale = o.targetSize / COIN;
  const pull = sample(travel, (t) => {
    const s = (t / travel) ** 2; // d = ½·a·t², as a fraction of the way
    const speed = o.pull * t; // v = a·t
    const arriving = Math.max(0, (t - travel * 0.85) / (travel * 0.15)); // sharp again on impact
    return {
      transform: `translate(${from.x + (to.x - from.x) * s}px, ${from.y + (to.y - from.y) * s}px) scale(${1 + (endScale - 1) * s})`,
      filter: filter(motionBlur(speed) * (1 - arriving)),
    };
  });
  await coin.animate(pull, { duration: travel * 1000, easing: 'linear', fill: 'forwards' }).finished;

  // Merge: it sits exactly on the pill's coin and dissolves into it.
  o.onLand(index);
  await coin.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'ease-out', fill: 'forwards' }).finished;
  coin.remove();
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
