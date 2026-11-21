import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import { CoinPillComponent, CoinTarget } from './coin-pill/coin-pill.component';
import { collectStartTime, eruptAndCollect } from './engine/coin-flight';
import { Confetti } from './engine/confetti';
import { dropIn, riseOut, slideOutAndCollapse } from './engine/motion';
import { Point } from './engine/physics';
import { ConfettiStyle, MICRO_REWARD_CONFIG } from './micro-reward.config';
import { RewardSoundService } from './sound/reward-sound.service';

export interface CelebrateOptions {
  /** Where the coins come from: the coin icon on the card (or any element / rectangle). */
  from: HTMLElement | DOMRect;
  /** Coins earned. */
  coins: number;
  /**
   * The user's coin total before this reward. Shown by the floating pill, which counts up from it.
   * Not needed while a screen pill (`<mr-coin-pill>`) is in view.
   */
  balance?: number;
  /**
   * Which pill the coins fly to.
   *  'auto'     the screen's pill if it is fully in view, otherwise a floating pill (default)
   *  'screen'   always the screen's pill
   *  'floating' always a floating pill
   */
  pill?: 'auto' | 'screen' | 'floating';
  /** Override the app-wide confetti for this reward (false = none). */
  confetti?: ConfettiStyle | false;
  screenCoin?: HTMLElement | null;
  /** Bigger confetti, e.g. for the last activity of the day. */
  big?: boolean;
  /** Each coin as it erupts from `from`: its place in the run. */
  onCoinErupted?: (index: number) => void;
  /** Each coin as it lands: its place in the run and what it was worth. */
  onCoinLanded?: (index: number, amount: number) => void;
  /** Everything has finished: coins landed and the floating pill (if any) has gone. */
  onFinished?: () => void;
}

interface FloatingPill {
  ref: ComponentRef<CoinPillComponent>;
  box: HTMLElement;
  coin: Point;
  ready: Promise<void>;
  dropDuration: number;
  closeTimer: number;
  users: number;
}

/** Confetti colours: design tokens, read at run time so theme changes are followed. */
const CONFETTI_TOKENS = [
  '--sm-v1-accentnew2',
  '--sm-v1-accentnew300',
  '--sm-v1-warning500main',
  '--sm-v1-warning300',
  '--sm-v1-success300',
  '--sm-v1-success500main',
  '--sm-v1-accent300',
  '--sm-v1-tutor400',
  '--sm-v1-tutor200',
];

/**
 * The micro reward: confetti + coins flying into the coin pill + sounds, on any screen.
 *
 *   private readonly rewards = inject(MicroRewardService);
 *   onConfirm() { this.rewards.celebrate({ from: coinIconOnCard, coins: 5, balance: this.userCoins }); }
 *
 * It draws on its own layer above the app, so it needs nothing in the screen's template.
 * If the screen shows a `<mr-coin-pill>` in view, the coins land there. Otherwise (no pill on the
 * screen, or it is scrolled away) a pill drops in at the top right, receives the coins and lifts away.
 */
@Injectable({ providedIn: 'root' })
export class MicroRewardService {
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly sound = inject(RewardSoundService);
  private readonly config = inject(MICRO_REWARD_CONFIG);

  /** True while coins are flying. */
  readonly playing = signal(false);

  private pill: CoinTarget | null = null;
  private host: HTMLElement | null = null;
  private layer: HTMLElement | null = null;
  private confetti: Confetti | null = null;
  private floating: FloatingPill | null = null;

  // ---- Trigger --------------------------------------------------------------------------------------

  /**
   * Allows the reward's sound. Browsers only play sound started from a tap; when the reward plays
   * later (e.g. as a result screen appears), call this in the tap that led there (the "Check" button).
   */
  unlockSound(): void {
    this.sound.unlock();
  }

  /**
   * Plays the reward. Call it straight from the tap that confirms (sound is only allowed in a tap).
   * Resolves when the last coin has landed: update the user's total then.
   */
  async celebrate(options: CelebrateOptions): Promise<void> {
    if (this.playing() || !Number.isFinite(options.coins) || options.coins <= 0 || !this.document.defaultView) return;
    const { timing, physics } = this.config;
    this.sound.unlock();
    this.sound.playDone();
    this.vibrate(14);
    this.playing.set(true);

    const amounts = splitReward(options.coins, this.config.visibleCoins);
    const layer = this.ensureLayer();
    const screenCoin = options.screenCoin;
    const rect = screenCoin?.getBoundingClientRect();
    const visible = rect && rect.width > 0 && rect.height > 0 && rect.top >= 0
      && rect.bottom <= this.document.documentElement.clientHeight;
    const screenPill = screenCoin && visible && options.pill !== 'floating'
      ? { coin: () => screenCoin, begin: () => undefined, receive: () => {
          if (!this.reducedMotion()) screenCoin.animate?.(
            [{ filter: 'brightness(1.4)' }, { filter: 'brightness(1)' }], 220,
          );
        } }
      : this.pickScreenPill(options.pill ?? 'auto');
    const reduced = this.reducedMotion();
    let floating: FloatingPill | null = null;
    let target: CoinTarget | null = screenPill;
    /** No pill in view: one drops in at the top right, timed to land just before the coins set off. */
    const ensureTarget = (): CoinTarget => {
      if (!target) {
        floating = this.openFloatingPill(options.balance ?? 0);
        target = floating.ref.instance;
        target.begin();
      }
      return target;
    };
    screenPill?.begin();

    const land = (i: number) => {
      this.sound.playCoin(i, i === amounts.length - 1);
      if (i % 3 === 0) this.vibrate(5);
      ensureTarget().receive(amounts[i], i === amounts.length - 1);
      options.onCoinLanded?.(i, amounts[i]);
    };

    try {
      if (reduced) {
        // Still version: no confetti, nothing flies; the total counts up with the coin sounds.
        ensureTarget();
        await wait(timing.coinsDelay);
        for (let i = 0; i < amounts.length; i++) {
          land(i);
          await wait(110);
        }
        return;
      }

      const style = options.confetti ?? this.config.confetti;
      if (style) {
        void wait(timing.confettiDelay).then(() =>
          this.confetti!.fire({
            style,
            colors: this.colors(),
            gravity: physics.confettiGravity,
            intensity: options.big ? 1.8 : 1,
          }),
        );
      }

      const coins = {
        count: amounts.length,
        eruptInterval: timing.eruptInterval,
        hoverHold: timing.hoverHold,
        springOmega: physics.hoverOmega,
        springDamping: physics.hoverDamping,
      };
      if (!target) {
        const { pillGravity } = this.config.physics;
        const dropTime = Math.sqrt((2 * 90) / pillGravity) * 1000; // ≈ the pill's fall from above the top
        const openAt = timing.coinsDelay + collectStartTime(coins) - dropTime - 120;
        void wait(Math.max(0, openAt)).then(ensureTarget);
      }

      const from = this.centre(options.from);
      await wait(timing.coinsDelay);
      await eruptAndCollect({
        ...coins,
        layer,
        from,
        to: () => (floating ? floating.coin : this.centre(ensureTarget().coin())),
        targetSize: 28,
        coinSrc: this.config.coinSrc,
        collectStagger: timing.collectStagger,
        eruptSpeed: physics.eruptSpeed,
        hoverHeight: physics.hoverHeight,
        pull: physics.coinPull,
        onErupt: (i) => options.onCoinErupted?.(i),
        onLand: land,
      });
    } finally {
      const open = floating as FloatingPill | null;
      if (open) await new Promise<void>(resolve => this.closeFloatingPill(open, resolve));
      this.playing.set(false);
      options.onFinished?.();
    }
  }

  /** The same slide-out for any element, without Angular's leave animation. */
  slideOut(el: HTMLElement): Promise<void> {
    if (this.reducedMotion()) return Promise.resolve();
    return slideOutAndCollapse(el, this.config.physics.slideAcceleration, this.config.physics.collapseOmega);
  }

  /**
   * Where the effect layer goes. Default: the whole page (document.body). Set it to a container to
   * keep the effect inside it, as the preview does with its 393 px screen.
   */
  setHost(host: HTMLElement | null): void {
    this.layer?.remove();
    this.layer = null;
    this.confetti = null;
    this.host = host;
  }

  // ---- Screen pill ------------------------------------------------------------------------------------

  registerPill(pill: CoinTarget): void {
    this.pill = pill;
  }

  unregisterPill(pill: CoinTarget): void {
    if (this.pill === pill) this.pill = null;
  }

  private pickScreenPill(mode: 'auto' | 'screen' | 'floating'): CoinTarget | null {
    if (!this.pill || mode === 'floating') return null;
    if (mode === 'screen') return this.pill;
    const r = this.pill.coin().getBoundingClientRect();
    const view = (this.host ?? this.document.documentElement).getBoundingClientRect();
    const inView = r.width > 0 && r.top >= view.top && r.bottom <= view.bottom;
    return inView ? this.pill : null;
  }

  // ---- Floating pill ----------------------------------------------------------------------------------

  private openFloatingPill(balance: number): FloatingPill {
    if (this.floating) {
      // Another reward is still showing it: keep it and cancel its exit.
      clearTimeout(this.floating.closeTimer);
      this.floating.users++;
      return this.floating;
    }
    const { top, right } = this.config.floatingPill;
    const box = this.document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      top: `calc(env(safe-area-inset-top) + ${top}px)`,
      right: `${right}px`,
      zIndex: '1',
    });
    const ref = createComponent(CoinPillComponent, { environmentInjector: this.injector });
    ref.setInput('total', balance);
    ref.setInput('floating', true);
    this.appRef.attachView(ref.hostView);
    box.appendChild(ref.location.nativeElement);
    this.layer!.appendChild(box);
    ref.changeDetectorRef.detectChanges();

    // Measure at rest, then drop it in from just above the top edge.
    const layerRect = this.layer!.getBoundingClientRect();
    const coinRect = ref.instance.coin().getBoundingClientRect();
    const coin = { x: coinRect.left + coinRect.width / 2 - layerRect.left, y: coinRect.top + coinRect.height / 2 - layerRect.top };
    const distance = box.getBoundingClientRect().bottom - layerRect.top + 8;
    const { pillGravity, pillRestitution } = this.config.physics;
    const fallTime = Math.sqrt((2 * distance) / pillGravity) * 1000;
    const ready = this.reducedMotion() ? Promise.resolve() : dropIn(box, distance, pillGravity, pillRestitution);

    this.floating = { ref, box, coin, ready, dropDuration: fallTime, closeTimer: 0, users: 1 };
    return this.floating;
  }

  private closeFloatingPill(floating: FloatingPill, onFinished?: () => void): void {
    floating.closeTimer = window.setTimeout(async () => {
      if (--floating.users > 0) return onFinished?.();
      if (!this.reducedMotion()) {
        const distance = floating.box.getBoundingClientRect().bottom - this.layer!.getBoundingClientRect().top + 8;
        await riseOut(floating.box, distance, this.config.physics.pillLift);
      }
      if (this.floating === floating) this.floating = null;
      this.appRef.detachView(floating.ref.hostView);
      floating.ref.destroy();
      floating.box.remove();
      onFinished?.();
    }, this.config.timing.pillHold);
  }

  // ---- Helpers ----------------------------------------------------------------------------------------

  private ensureLayer(): HTMLElement {
    if (this.layer?.isConnected) return this.layer;
    const host = this.host ?? this.document.body;
    const layer = this.document.createElement('div');
    layer.className = 'mr-layer';
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      position: host === this.document.body ? 'fixed' : 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '99999',
      overflow: 'hidden',
    });
    host.appendChild(layer);
    this.layer = layer;
    this.confetti = new Confetti(layer);
    return layer;
  }

  /** Centre of an element or rectangle, in layer coordinates. */
  private centre(target: HTMLElement | DOMRect): Point {
    const r = target instanceof DOMRect ? target : target.getBoundingClientRect();
    const l = this.layer!.getBoundingClientRect();
    return { x: r.left + r.width / 2 - l.left, y: r.top + r.height / 2 - l.top };
  }

  private reducedMotion(): boolean {
    return (
      this.config.forceReducedMotion ||
      (this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    );
  }

  private colors(): string[] {
    const style = getComputedStyle(this.document.documentElement);
    const colors = CONFETTI_TOKENS.map((token) => style.getPropertyValue(token).trim()).filter(Boolean);
    return colors.length ? colors : ['#7341A7', '#AF97D8', '#F0AD4E', '#E3CBAA', '#81C784', '#4CAF50', '#CD3578', '#1472C8', '#B2CAF2'];
  }

  /** Android browsers. In the native app, swap for @capacitor/haptics (works on iOS too). */
  private vibrate(ms: number): void {
    if (!this.config.haptics) return;
    try {
      this.document.defaultView?.navigator.vibrate?.(ms);
    } catch {
      /* not supported */
    }
  }
}

/** Splits a reward over at most `max` drawn coins, e.g. (3, 5) → [1,1,1], (25, 5) → [5,5,5,5,5], (12, 5) → [3,3,2,2,2]. */
export function splitReward(coins: number, max: number): number[] {
  const count = Math.max(1, Math.min(Math.round(coins), max));
  const base = Math.floor(coins / count);
  const extra = coins - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
