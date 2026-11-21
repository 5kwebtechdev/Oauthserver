import { Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

declare global { interface Window { turnstile?: { ready(callback: () => void): void; render(element: HTMLElement, options: Record<string, unknown>): string; execute(id: string): void; reset(id: string): void; remove(id: string): void }; } }
let scriptReady: Promise<void> | undefined;
function loadScript(): Promise<void> {
  if (window.turnstile) return new Promise(resolve => window.turnstile!.ready(resolve));
  return scriptReady ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => { script.remove(); scriptReady = undefined; reject(new Error('Security check could not load. Please check your connection.')); }, 20000);
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true;
    script.onload = () => { clearTimeout(timer); window.turnstile!.ready(resolve); };
    script.onerror = () => { clearTimeout(timer); script.remove(); scriptReady = undefined; reject(new Error('Security check could not load. Please try again.')); };
    document.head.appendChild(script);
  });
}
@Component({ selector: 'app-android-turnstile', standalone: true, template: '<div #container aria-label="Login security check"></div>', styles: [':host { display:block; width:100%; margin:12px 0; }'] })
export class AndroidTurnstileComponent implements OnDestroy {
  @Input() siteKey = '';
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLElement>;
  private widget?: string;
  private rejectPending?: (error: Error) => void;
  private disposed = false;
  async verify(): Promise<string> {
    if (this.disposed || !this.siteKey) throw new Error('Security check is not configured.');
    await loadScript();
    if (this.disposed) throw new Error('Sign in was cancelled.');
    if (this.widget) window.turnstile!.remove(this.widget);
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => finish(undefined, 'Security check timed out. Please try again.'), 120000);
      const finish = (token?: string, message?: string) => {
        clearTimeout(timer); this.rejectPending = undefined;
        if (token) resolve(token); else reject(new Error(message || 'Security check failed. Please try again.'));
      };
      this.rejectPending = error => finish(undefined, error.message);
      this.widget = window.turnstile!.render(this.container.nativeElement, {
        sitekey: this.siteKey, execution: 'execute', appearance: 'interaction-only', size: 'flexible', retry: 'never',
        callback: (token: string) => finish(token),
        'error-callback': (code: string) => {
          const safeCode = /^\d{6}$/.test(String(code)) ? String(code) : 'unknown';
          const message = safeCode === '110200'
            ? 'Android security check is not enabled for this app hostname. Please contact support. (110200)'
            : ['110100', '110110', '400020', '400070'].includes(safeCode)
              ? `Security check configuration is unavailable. Please contact support. (${safeCode})`
              : `Security check failed. Please check your connection and retry. (${safeCode})`;
          finish(undefined, message);
          return true;
        },
        'expired-callback': () => finish(undefined, 'Security check expired. Please try again.')
      });
      window.turnstile!.execute(this.widget);
    });
  }
  ngOnDestroy(): void {
    this.disposed = true; this.rejectPending?.(new Error('Sign in was cancelled.'));
    if (this.widget) window.turnstile?.remove(this.widget);
  }
}
