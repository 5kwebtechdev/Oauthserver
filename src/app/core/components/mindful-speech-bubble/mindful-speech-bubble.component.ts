import { Component, Input, HostBinding, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-speech-bubble',
  templateUrl: './mindful-speech-bubble.component.html',
  styleUrls: ['./mindful-speech-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MindfulSpeechBubbleComponent {
  @Input() message: string = '';
  @Input() type: 'talking' | 'thinking' = 'talking';
  @Input() arrowSide: 'left' | 'right' | 'top' | 'bottom' = 'bottom';
  @Input() arrowSize: number = 12;
  @Input() arrowOffset: string = '20px';
  @Input() arrowAngle: number = 0;
  @Input() color: string = '#fff';
  @Input() textColor: string = '#282527';
  /**
   * Optional target element (or selector) the bubble should point to.
   * If provided and `follow` is true, the component will compute the best
   * side (left/right/top/bottom), offset and angle to point at the target.
   */
  @Input() target: HTMLElement | string | null = null;
  /** Enable runtime following of the target (lightweight). */
  @Input() follow: boolean = false;

  private _targetEl: HTMLElement | null = null;
  private _ro: ResizeObserver | null = null;
  private _running = false;
  private _rafId = 0;

  constructor(private hostRef: ElementRef<HTMLElement>) {}

  @HostBinding('attr.arrowSide') get hostArrowSide() {
    return this.type === 'talking' ? this.arrowSide : null;
  }
  @HostBinding('style.--arrow-size') get hostArrowSize() {
    return this.type === 'talking' ? `${this.arrowSize}px` : null;
  }
  @HostBinding('style.--arrow-offset') get hostArrowOffset() {
    return this.type === 'talking' ? this.arrowOffset : null;
  }
  @HostBinding('style.--arrow-angle') get hostArrowAngle() {
    return this.type === 'talking' ? `${this.arrowAngle}deg` : null;
  }
  @HostBinding('style.--bubble-bg') get hostBubbleBg() {
    return this.color;
  }
  @HostBinding('style.--bubble-text') get hostBubbleText() {
    return this.textColor;
  }

  // Keep last applied values to avoid unnecessary style updates
  private _lastSide: 'left' | 'right' | 'top' | 'bottom' | null = null;
  private _lastOffset: string | null = null;
  private _lastAngle: number | null = null;

  ngAfterViewInit(): void {
    if (!this.follow || !this.target) return;
    this.resolveTarget();
    // Observe changes to target or host size and position
    if (window.ResizeObserver) {
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
    window.removeEventListener('scroll', this.onWindowEvent, true);
    window.removeEventListener('resize', this.onWindowEvent);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  private resolveTarget() {
    if (!this.target) return;
    if (typeof this.target === 'string') {
      this._targetEl = document.querySelector(this.target) as HTMLElement | null;
    } else if (this.target instanceof HTMLElement) {
      this._targetEl = this.target;
    }
    if (this._ro && this._targetEl) this._ro.observe(this._targetEl);
  }

  private onWindowEvent = () => this.scheduleUpdate();

  private scheduleUpdate() {
    if (this._running) return;
    this._running = true;
    this._rafId = requestAnimationFrame(() => {
      this._running = false;
      this.updateToTarget();
    });
  }

  private updateToTarget() {
    const hostEl = this.hostRef.nativeElement.querySelector('.speech-bubble') as HTMLElement | null;
    const targetEl = this._targetEl;
    if (!hostEl || !targetEl) return;

    const hostRect = hostEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    // compute vector from host center to target center
    const hx = hostRect.left + hostRect.width / 2;
    const hy = hostRect.top + hostRect.height / 2;
    const tx = targetRect.left + targetRect.width / 2;
    const ty = targetRect.top + targetRect.height / 2;
    const dx = tx - hx;
    const dy = ty - hy;

    // pick primary side (largest axis)
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let side: 'left' | 'right' | 'top' | 'bottom' = 'bottom';
    if (absDx > absDy) {
      side = dx > 0 ? 'right' : 'left';
    } else {
      side = dy > 0 ? 'bottom' : 'top';
    }

    // compute arrow offset and (stable) angle
    let offset = '50%';
    // We'll use a neutral angle (0deg) for stability; offset will move the arrow along the edge
    let angle = 0;
    // For left/right sides offset is distance from top, for top/bottom it's distance from left
    // We'll set arrowOffset as a percentage of the host edge (e.g., 25%) so it scales with bubble size.
    if (side === 'left' || side === 'right') {
      const raw = (targetRect.top + targetRect.height / 2) - hostRect.top;
      const pct = (raw / hostRect.height) * 100;
      // clamp percentage to avoid arrow overlapping rounded corners (5%..95%)
      const clampedPct = Math.min(95, Math.max(5, pct));
      offset = `${Math.round(clampedPct)}%`;
    } else {
      const raw = (targetRect.left + targetRect.width / 2) - hostRect.left;
      const pct = (raw / hostRect.width) * 100;
      const clampedPct = Math.min(95, Math.max(5, pct));
      offset = `${Math.round(clampedPct)}%`;
    }

    // Only update if changed to avoid DOM thrash
    if (side !== this._lastSide) {
      this.arrowSide = side;
      this._lastSide = side;
    }
    if (offset !== this._lastOffset) {
      this.arrowOffset = offset;
      this._lastOffset = offset;
    }
    if (angle !== this._lastAngle) {
      this.arrowAngle = angle;
      this._lastAngle = angle;
    }
  }
}
