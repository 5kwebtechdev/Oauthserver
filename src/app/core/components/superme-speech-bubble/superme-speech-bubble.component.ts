import { Component, Input, HostBinding, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetMessage } from '../../services/pet-messages.service';

/**
 * Arrow position type - controls where along the side the arrow appears
 * - 'start': Near the beginning (left for top/bottom, top for left/right)
 * - 'center': Middle of the side
 * - 'end': Near the end (right for top/bottom, bottom for left/right)
 * - number: Percentage (0-100)
 * - string: CSS value like '20px' or '30%'
 */
export type ArrowPosition = 'start' | 'center' | 'end' | number | string;

/**
 * Arrow side type - controls which side of the bubble the arrow appears on
 */
export type ArrowSide = 'left' | 'right' | 'top' | 'bottom' | 'none';

/**
 * Bubble type - talking shows arrow, thinking shows floating dots
 */
export type BubbleType = 'talking' | 'thinking';

@Component({
  selector: 'app-speech-bubble',
  templateUrl: './superme-speech-bubble.component.html',
  styleUrls: ['./superme-speech-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SupermeSpeechBubbleComponent implements OnDestroy {
  // ─────────────────────────────────────────────────────────────
  // INPUTS - Message Content
  // ─────────────────────────────────────────────────────────────
  /** Direct message text */
  @Input() message: string = '';

  /** PetMessage object (takes priority over message) */
  @Input() petMessage?: PetMessage;

  // ─────────────────────────────────────────────────────────────
  // INPUTS - Bubble Appearance
  // ─────────────────────────────────────────────────────────────
  /** Bubble type: 'talking' shows arrow, 'thinking' shows dots */
  @Input() type: BubbleType = 'talking';

  /** Background color of the bubble */
  @Input() color: string = '#ffffff';

  /** Text color inside the bubble */
  @Input() textColor: string = '#282527';

  /** Border radius of the bubble (CSS value) */
  @Input() borderRadius: string = '24px';

  /** Box shadow of the bubble (CSS value) */
  @Input() shadow: string = '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)';

  /** Max width of the bubble (CSS value) */
  @Input() maxWidth: string = '100%';

  // ─────────────────────────────────────────────────────────────
  // INPUTS - Arrow Configuration
  // ─────────────────────────────────────────────────────────────
  /**
   * Which side the arrow appears on
   * - 'top': Arrow points up (bubble below target)
   * - 'bottom': Arrow points down (bubble above target)
   * - 'left': Arrow points left (bubble right of target)
   * - 'right': Arrow points right (bubble left of target)
   * - 'none': No arrow displayed
   */
  @Input() arrowSide: ArrowSide = 'bottom';

  /**
   * Position of arrow along the side
   * - 'start': 15% from start
   * - 'center': 50% (middle)
   * - 'end': 85% from start
   * - number: Exact percentage (0-100)
   * - string: CSS value like '20px' or '30%'
   */
  @Input() arrowPosition: ArrowPosition = 'center';

  /** Size of the arrow in pixels */
  @Input() arrowSize: number = 12;
  
  /** Backwards-compatible: explicit arrow offset (string like '20px' or '50%'). If provided, this wins over computedArrowOffset. */
  @Input() arrowOffset?: string | null = null;

  /** Backwards-compatible: explicit arrow rotation angle (degrees). */
  @Input() arrowAngle: number = 0;

  // ─────────────────────────────────────────────────────────────
  // INPUTS - Dynamic Positioning (optional)
  // ─────────────────────────────────────────────────────────────
  /** Target element (HTMLElement or CSS selector) to point arrow at */
  @Input() target: HTMLElement | string | null = null;

  /** Enable auto-positioning to follow target element */
  @Input() follow: boolean = false;

  /** When true, auto-position overrides arrowSide/arrowPosition based on target */
  @Input() autoPosition: boolean = true;

  // ─────────────────────────────────────────────────────────────
  // INPUTS - Animation
  // ─────────────────────────────────────────────────────────────
  /** Enable entrance animation */
  @Input() animate: boolean = true;

  /** Animation duration in ms */
  @Input() animationDuration: number = 500;

  // ─────────────────────────────────────────────────────────────
  // COMPUTED PROPERTIES
  // ─────────────────────────────────────────────────────────────
  /** Returns message text from petMessage or message input */
  get displayMessage(): string {
    return this.petMessage?.message || this.message;
  }

  /** Computes the CSS offset value for the arrow position */
  get computedArrowOffset(): string {
    if (typeof this.arrowPosition === 'number') {
      const clamped = Math.min(95, Math.max(5, this.arrowPosition));
      return `${clamped}%`;
    }
    if (typeof this.arrowPosition === 'string') {
      switch (this.arrowPosition) {
        case 'start': return '15%';
        case 'center': return '50%';
        case 'end': return '85%';
        default: return this.arrowPosition; // CSS value like '20px'
      }
    }
    return '50%';
  }

  /** Check if arrow should be displayed */
  get showArrow(): boolean {
    return this.type === 'talking' && this.arrowSide !== 'none';
  }

  // ─────────────────────────────────────────────────────────────
  // HOST BINDINGS - CSS Custom Properties
  // ─────────────────────────────────────────────────────────────
  @HostBinding('style.--bubble-bg') get hostBubbleBg() { return this.color; }
  @HostBinding('style.--bubble-text') get hostBubbleText() { return this.textColor; }
  @HostBinding('style.--bubble-radius') get hostBubbleRadius() { return this.borderRadius; }
  @HostBinding('style.--bubble-shadow') get hostBubbleShadow() { return this.shadow; }
  @HostBinding('style.--bubble-max-width') get hostBubbleMaxWidth() { return this.maxWidth; }
  @HostBinding('style.--arrow-size') get hostArrowSize() { return `${this.arrowSize}px`; }
  @HostBinding('style.--arrow-offset') get hostArrowOffset() { return this.arrowOffset ?? this.computedArrowOffset; }
  @HostBinding('style.--arrow-angle') get hostArrowAngle() { return `${this.arrowAngle}deg`; }
  @HostBinding('style.--animation-duration') get hostAnimationDuration() { return `${this.animationDuration}ms`; }
  @HostBinding('class.animate-enabled') get animateEnabled() { return this.animate; }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE STATE - For follow/target feature
  // ─────────────────────────────────────────────────────────────
  private _targetEl: HTMLElement | null = null;
  private _ro: ResizeObserver | null = null;
  private _running = false;
  private _rafId = 0;
  private _lastSide: ArrowSide | null = null;
  private _lastOffset: string | null = null;

  constructor(private hostRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (!this.follow || !this.target) return;
    this.resolveTarget();
    if (typeof window !== 'undefined' && window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.scheduleUpdate());
      if (this._targetEl) this._ro.observe(this._targetEl);
      this._ro.observe(this.hostRef.nativeElement);
    }
    window.addEventListener('scroll', this.onWindowEvent, true);
    window.addEventListener('resize', this.onWindowEvent);
    this.scheduleUpdate();
  }

  ngOnDestroy(): void {
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onWindowEvent, true);
      window.removeEventListener('resize', this.onWindowEvent);
    }
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  private resolveTarget(): void {
    if (!this.target) return;
    if (typeof this.target === 'string') {
      this._targetEl = document.querySelector(this.target) as HTMLElement | null;
    } else if (this.target instanceof HTMLElement) {
      this._targetEl = this.target;
    }
    if (this._ro && this._targetEl) this._ro.observe(this._targetEl);
  }

  private onWindowEvent = (): void => this.scheduleUpdate();

  private scheduleUpdate(): void {
    if (this._running) return;
    this._running = true;
    this._rafId = requestAnimationFrame(() => {
      this._running = false;
      this.updateToTarget();
    });
  }

  private updateToTarget(): void {
    if (!this.autoPosition) return; // User wants manual control

    const hostEl = this.hostRef.nativeElement.querySelector('.speech-bubble') as HTMLElement | null;
    const targetEl = this._targetEl;
    if (!hostEl || !targetEl) return;

    const hostRect = hostEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const hx = hostRect.left + hostRect.width / 2;
    const hy = hostRect.top + hostRect.height / 2;
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const dx = tx - hx;
    const dy = ty - hy;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let side: ArrowSide = 'bottom';
    if (absDx > absDy) {
      side = dx > 0 ? 'right' : 'left';
    } else {
      side = dy > 0 ? 'bottom' : 'top';
    }

    let offsetPct = 50;
    if (side === 'left' || side === 'right') {
      const raw = (targetRect.top + targetRect.height / 2) - hostRect.top;
      offsetPct = (raw / hostRect.height) * 100;
    } else {
      const raw = (targetRect.left + targetRect.width / 2) - hostRect.left;
      offsetPct = (raw / hostRect.width) * 100;
    }
    const clampedPct = Math.min(95, Math.max(5, offsetPct));
    const offset = `${Math.round(clampedPct)}%`;

    if (side !== this._lastSide) {
      this.arrowSide = side;
      this._lastSide = side;
    }
    if (offset !== this._lastOffset) {
      this.arrowPosition = offset;
      this._lastOffset = offset;
    }
  }
}
