import {
  EASE_CONSTANT_ACCELERATION,
  accelerationTime,
  criticallyDamped,
  criticallyDampedSettle,
  dropAndBounce,
  sample,
} from './physics';

/**
 * Element motions used by the reward, as plain Web Animations. No Angular.
 */

/** Drops an element in from above: free fall from rest, then small bounces that die out (restitution e). */
export function dropIn(el: HTMLElement, distance: number, gravity: number, restitution: number): Promise<void> {
  const fall = dropAndBounce(distance, gravity, restitution);
  const frames = sample(fall.duration, (t) => ({ transform: `translateY(${fall.at(t)}px)` }));
  return el.animate(frames, { duration: fall.duration * 1000, easing: 'linear', fill: 'both' }).finished.then(() => undefined);
}

/** Lifts an element away upward from rest with constant acceleration, fading as it goes. */
export function riseOut(el: HTMLElement, distance: number, acceleration: number): Promise<void> {
  const duration = accelerationTime(distance, acceleration);
  return el
    .animate(
      [
        { transform: 'translateY(0)', opacity: 1, easing: EASE_CONSTANT_ACCELERATION },
        { transform: `translateY(${-distance}px)`, opacity: 0 },
      ],
      { duration: duration * 1000, fill: 'forwards' },
    )
    .finished.then(() => undefined);
}

/**
 * Pushes an element out sideways and closes the gap it leaves.
 *  1. Slide: constant acceleration from rest (it is pushed, so it speeds up), d = ½·a·t².
 *  2. Collapse: its height (and bottom spacing) closes like a critically damped spring, so the list
 *     below moves up as fast as it can without overshooting.
 */
export async function slideOutAndCollapse(el: HTMLElement, acceleration: number, omega: number): Promise<void> {
  const distance = el.getBoundingClientRect().width + 24;
  const slide = accelerationTime(distance, acceleration);
  await el.animate(
    [
      { transform: 'translateX(0)', opacity: 1, easing: EASE_CONSTANT_ACCELERATION },
      { transform: `translateX(${distance}px)`, opacity: 0.6 },
    ],
    { duration: slide * 1000, fill: 'forwards' },
  ).finished;

  const style = getComputedStyle(el);
  const height = el.getBoundingClientRect().height;
  const spacing = { paddingBottom: parseFloat(style.paddingBottom), marginBottom: parseFloat(style.marginBottom) };
  el.style.overflow = 'hidden';
  el.style.opacity = '0';
  const settle = criticallyDampedSettle(omega);
  await el.animate(
    sample(settle, (t) => {
      const keep = 1 - criticallyDamped(t, omega);
      return {
        height: `${height * keep}px`,
        paddingBottom: `${spacing.paddingBottom * keep}px`,
        marginBottom: `${spacing.marginBottom * keep}px`,
        boxSizing: 'border-box',
      };
    }),
    { duration: settle * 1000, easing: 'linear', fill: 'forwards' },
  ).finished;
}
