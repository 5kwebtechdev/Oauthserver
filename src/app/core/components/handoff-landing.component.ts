import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PkceAuthService } from '../services/pkce-auth.service';
import { AuthService } from '../services/auth.service';

/**
 * Where a user lands after tapping through from the app into a real browser.
 *
 * The app could not bring its sign-in with it - a native WebView shares no cookies or storage
 * with Chrome or Safari - so it put a one-time pass in the URL instead. This redeems that pass
 * for an ordinary session and sends the user on, without ever asking them to sign in again.
 *
 * The pass is removed from the address bar before anything else happens. It is already spent
 * server-side by then, but leaving it in the URL would put it into browser history and into the
 * Referer header of every request the next page makes, for no benefit.
 */
@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <main style="padding:2rem;text-align:center">
      <p role="status">{{ message }}</p>
      <button *ngIf="failed" (click)="signInNormally()">Sign in</button>
    </main>
  `
})
export class HandoffLandingComponent implements OnInit {
  message = 'Signing you in…';
  failed = false;

  constructor(
    private pkce: PkceAuthService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const ticket = String(this.route.snapshot.queryParamMap.get('t') || '').trim();
    const returnUrl = String(this.route.snapshot.queryParamMap.get('next') || '').trim();
    this.stripTicketFromUrl();

    // Already signed in here (a returning visit, or the same browser the app used) - the pass
    // was never needed, so do not spend one.
    if (this.auth.isLoggedIn() && !ticket) {
      await this.router.navigateByUrl(this.safeReturnUrl(returnUrl));
      return;
    }

    if (!ticket) {
      await this.startNormalSignIn(returnUrl);
      return;
    }

    try {
      await this.pkce.handoffLogin(ticket, this.safeReturnUrl(returnUrl));
    } catch (error) {
      // Expired or already used - the common, expected case for a reloaded or shared link.
      console.warn('[Handoff] Could not use the sign-in pass; falling back to a normal sign-in', error);
      await this.startNormalSignIn(returnUrl);
    }
  }

  private async startNormalSignIn(returnUrl: string): Promise<void> {
    try {
      await this.pkce.login(this.safeReturnUrl(returnUrl));
    } catch {
      this.message = 'Please sign in to continue.';
      this.failed = true;
    }
  }

  signInNormally(): void {
    void this.startNormalSignIn('');
  }

  /** Only our own paths: an attacker-supplied absolute URL here would be an open redirect. */
  private safeReturnUrl(value: string): string {
    if (value.startsWith('/') && !value.startsWith('//')) return value;
    return this.auth.getDashboardRoute();
  }

  private stripTicketFromUrl(): void {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('t')) return;
      url.searchParams.delete('t');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    } catch {
      // A browser that refuses history rewriting still works; the pass is already spent.
    }
  }
}
