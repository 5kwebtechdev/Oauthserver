import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MICRO_REWARD_CONFIG } from '../micro-reward.config';
import { MicroRewardService } from '../micro-reward.service';

const ROLL_MS = 250;

/** What a coin pill offers the reward. */
export interface CoinTarget {
  /** The coin icon the coins drop into. */
  coin(): HTMLElement;
  /** Coins are on their way: keep the number shown until they arrive. */
  begin(): void;
  /** One coin landed, worth `amount`. */
  receive(amount: number, last: boolean): void;
}

/**
 * Coin total pill (Figma: Home 27999:57402 › "Icon 1").
 *
 * Put it wherever the screen shows the user's coins: `<mr-coin-pill [total]="userCoins" />`. While it is
 * on screen the reward's coins fly into it. As each one merges into the pill's coin, the coin glints
 * (brightness only) and the number rolls up by that coin's share; the pill keeps its size and shape.
 * The reward also creates one itself (`floating`) on screens without a pill, or when the pill is scrolled away.
 */
@Component({
  selector: 'mr-coin-pill',
  template: `
    <img #coin class="coin" [class.hit-a]="hit() === 1" [class.hit-b]="hit() === 2" [src]="coinSrc" alt="" />
    <span class="count">{{ shown() }}</span>
    <span class="visually-hidden" aria-live="polite">{{ announce() }}</span>
  `,
  styleUrl: './coin-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinPillComponent implements CoinTarget, OnInit, OnDestroy {
  private readonly rewards = inject(MicroRewardService);
  protected readonly coinSrc = inject(MICRO_REWARD_CONFIG).coinSrc;

  /** The user's coin total. */
  readonly total = input.required<number>();
  /** Set by the reward for its own pill; a floating pill never registers as the screen's pill. */
  readonly floating = input(false);

  protected readonly shown = signal(0);
  protected readonly announce = signal('');
  /** Alternates 1/2 so every landing restarts the glint. */
  protected readonly hit = signal(0);
  private readonly coinRef = viewChild.required<ElementRef<HTMLElement>>('coin');
  private receiving = false;
  private earned = 0;
  /** The number the roll is heading for. */
  private goal = 0;
  private frame = 0;
  private rolling = false;

  constructor() {
    effect(() => {
      const total = this.total();
      if (!untracked(() => this.receiving) && !this.rolling) this.shown.set(total);
    });
  }

  ngOnInit(): void {
    if (!this.floating()) this.rewards.registerPill(this);
  }

  coin(): HTMLElement {
    return this.coinRef().nativeElement;
  }

  begin(): void {
    this.receiving = true;
    this.earned = 0;
    this.goal = this.shown();
  }

  receive(amount: number, last: boolean): void {
    this.goal += amount;
    this.earned += amount;
    this.hit.update((h) => (h === 1 ? 2 : 1));
    this.roll();
    if (!last) return;
    this.receiving = false;
    this.announce.set(`${this.earned} coins earned. You have ${this.goal} coins.`);
  }

  /** Rolls the number up to `goal` (ease-out, ~250 ms), like a counter catching up. */
  private roll(): void {
    cancelAnimationFrame(this.frame);
    const from = this.shown();
    const to = this.goal;
    const start = performance.now();
    this.rolling = true;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ROLL_MS);
      this.shown.set(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) {
        this.frame = requestAnimationFrame(step);
        return;
      }
      this.rolling = false;
    };
    this.frame = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.rewards.unregisterPill(this);
  }
}
