import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { APP_CONFIG } from '../core/app-config';

declare const turnstile: any;

/**
 * Renders a Cloudflare Turnstile widget and emits the solved token. Reused on every form
 * that's captcha-gated server-side (login, continue-with-email, forgot-password) rather
 * than duplicating the same render/retry logic three times - same reasoning as any other
 * shared widget. Renders nothing if APP_CONFIG.turnstileSiteKey is empty (no key created
 * yet), which matches the backend's TurnstileVerificationService treating a missing
 * secret as "not configured" and skipping enforcement either way.
 */
@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  template: `<div #container></div>`,
})
export class TurnstileWidgetComponent implements AfterViewInit {
  @ViewChild('container', { static: true })
  private readonly container!: ElementRef<HTMLDivElement>;

  @Output() tokenReceived = new EventEmitter<string>();

  ngAfterViewInit(): void {
    this.renderWidget();
  }

  private renderWidget(attempt = 0): void {
    if (!APP_CONFIG.turnstileSiteKey) {
      return;
    }
    if (typeof turnstile === 'undefined') {
      // The Turnstile script loads async; retry briefly rather than failing silently.
      if (attempt < 20) {
        setTimeout(() => this.renderWidget(attempt + 1), 150);
      }
      return;
    }
    turnstile.render(this.container.nativeElement, {
      sitekey: APP_CONFIG.turnstileSiteKey,
      callback: (token: string) => this.tokenReceived.emit(token),
    });
  }
}
