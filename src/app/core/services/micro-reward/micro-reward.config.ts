import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

export type ConfettiStyle = 'burst' | 'rain' | 'both';

/**
 * Everything that can be tuned, in one place. Pass only what you want to change:
 *
 *   bootstrapApplication(App, { providers: [provideMicroReward({ confetti: 'rain', visibleCoins: 4 })] });
 *
 * Units: milliseconds for times, px and seconds for physics. The physics run "slowed down" so the eye
 * can follow them, but within one effect every law holds (constant gravity, quadratic air drag,
 * restitution, damped springs), so the motion reads as real.
 */
export interface MicroRewardConfig {
  /** Coin image used for the flying coins and the coin pill. */
  coinSrc: string;
  /** Confetti: pop from the middle, rain from the top, both, or none. */
  confetti: ConfettiStyle | false;
  /**
   * How many coins are drawn, whatever the reward (fewer if the reward is smaller). They stand for the
   * reward; the pill's number counts the real amount. Each drawn coin carries a share of it.
   */
  visibleCoins: number;
  /** Sounds on. Connect to the app's sound setting. */
  sound: boolean;
  /** Replace the built-in sounds with files, e.g. { coin: 'assets/sounds/coin.mp3' }. */
  soundFiles: { done?: string; coin?: string };
  /** Short vibrations (Android browsers; use @capacitor/haptics in the native app). */
  haptics: boolean;
  /** Always use the still version, whatever the device setting (for testing). */
  forceReducedMotion: boolean;

  /** Where the floating coin pill rests when the screen has no coin pill in view. */
  floatingPill: { top: number; right: number };

  timing: {
    /** Confetti starts this long after the trigger. */
    confettiDelay: number;
    /** First coin erupts from the card. */
    coinsDelay: number;
    /** Gap between two coins erupting from the card. */
    eruptInterval: number;
    /** All coins float above the card together for this long before they set off. */
    hoverHold: number;
    /** Gap between two coins setting off for the pill. */
    collectStagger: number;
    /** The floating pill stays this long after the last coin before it leaves. */
    pillHold: number;
  };

  physics: {
    /** Upward launch speed of an erupting coin, px/s. */
    eruptSpeed: number;
    /** How high above the card's coin icon the coins hover, px. */
    hoverHeight: number;
    /** Spring holding a hovering coin: natural frequency (rad/s) and damping ratio (0–1, lower = more bounce). */
    hoverOmega: number;
    hoverDamping: number;
    /** Constant pull towards the coin pill, px/s². Higher = faster, harder hit. */
    coinPull: number;
    /** Gravity for the floating pill dropping in, px/s². */
    pillGravity: number;
    /** Bounce of the floating pill when it lands (0 = dead stop, 1 = perfect bounce). */
    pillRestitution: number;
    /** Upward acceleration of the floating pill when it leaves, px/s². */
    pillLift: number;
    /** Gravity for the confetti, px/s². */
    confettiGravity: number;
    /** How hard the card is pushed out after the reward, px/s². */
    slideAcceleration: number;
    /** Stiffness of the list closing the gap (critically damped spring, rad/s). */
    collapseOmega: number;
  };
}

export const DEFAULT_MICRO_REWARD_CONFIG: MicroRewardConfig = {
  coinSrc: 'assets/micro-reward/coin.webp',
  confetti: 'both',
  visibleCoins: 5,
  sound: true,
  soundFiles: {},
  haptics: true,
  forceReducedMotion: false,
  floatingPill: { top: 12, right: 16 },
  timing: {
    confettiDelay: 150,
    coinsDelay: 180,
    eruptInterval: 150,
    hoverHold: 320,
    collectStagger: 75,
    pillHold: 650,
  },
  physics: {
    eruptSpeed: 650,
    hoverHeight: 56,
    hoverOmega: 16,
    hoverDamping: 0.45,
    coinPull: 3200,
    pillGravity: 3200,
    pillRestitution: 0.32,
    pillLift: 2400,
    confettiGravity: 1500,
    slideAcceleration: 9000,
    collapseOmega: 18,
  },
};

export const MICRO_REWARD_CONFIG = new InjectionToken<MicroRewardConfig>('MICRO_REWARD_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_MICRO_REWARD_CONFIG,
});

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

/** Overrides any part of the defaults for the whole app. Optional: without it the defaults apply. */
export function provideMicroReward(overrides: DeepPartial<MicroRewardConfig> = {}): EnvironmentProviders {
  const d = DEFAULT_MICRO_REWARD_CONFIG;
  return makeEnvironmentProviders([
    {
      provide: MICRO_REWARD_CONFIG,
      useValue: {
        ...d,
        ...overrides,
        soundFiles: { ...d.soundFiles, ...overrides.soundFiles },
        floatingPill: { ...d.floatingPill, ...overrides.floatingPill },
        timing: { ...d.timing, ...overrides.timing },
        physics: { ...d.physics, ...overrides.physics },
      } as MicroRewardConfig,
    },
  ]);
}
