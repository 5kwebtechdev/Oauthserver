import { secureTemporaryStorage as sessionStorage } from '../storage/session-storage';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupermeLoadingComponent } from './superme-loading/superme-loading.component';
import { PkceAuthService } from '../services/pkce-auth.service';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';
@Component({ standalone: true, imports: [CommonModule, SupermeLoadingComponent], template: `<app-superme-loading [visible]="busy && !failed && !pkce.error"></app-superme-loading><main *ngIf="(failed || pkce.error) && !message.startsWith('You are signed out.')" style="padding:2rem;text-align:center"><p role="alert">{{ pkce.error || message }}</p><button (click)="retry()">Try again</button></main>` })
export class PkceEntryComponent implements OnInit {
  message = 'Signing you in…'; failed = false; busy = true;
  constructor(public pkce: PkceAuthService, private auth: AuthService,
    private onboarding: OnboardingStateService, private route: ActivatedRoute, private router: Router) {}
  async ngOnInit(): Promise<void> {
    try {
      await this.pkce.init();
      if (this.pkce.error) throw new Error(this.pkce.error);
      if (this.pkce.token) {
        const user = this.auth.getUserData();
        // A returning Google account may carry an old/incomplete backend onboarding
        // step; that must not turn a successful sign-in into another signup.
        // Resume only the in-progress social registration which deliberately
        // established this PKCE session before Parent family setup.
        const resumePending = sessionStorage.getItem('pkce_social_onboarding_resume') === 'true';
        sessionStorage.removeItem('pkce_social_onboarding_resume');
        const shouldResumeSocialSignup = resumePending
          || (user?.authProvider === 'apple' && this.onboarding.isSocialOnboarding(user));
        const resume = shouldResumeSocialSignup ? this.onboarding.getResumeNavigation(user) : null;
        const requested = sessionStorage.getItem('pkce_return_url') || '';
        sessionStorage.removeItem('pkce_return_url');
        const isReturningGoogle = user?.authProvider === 'google' && !resumePending;
        const isSignupReturn = /^\/signup(?:[/?]|$)/.test(requested);
        if (resume) await this.router.navigate([resume.url], { queryParams: resume.queryParams });
        else await this.router.navigateByUrl(
          requested.startsWith('/') && !requested.startsWith('//')
              && !(isReturningGoogle && isSignupReturn)
            ? requested : this.auth.getDashboardRoute()
        );
      } else if (this.pkce.nativeDev && this.route.snapshot.queryParamMap.get('loggedOut') === '1') {
        this.message = 'You are signed out. Tap Try again to sign in.';
        this.failed = true;
      } else if (this.route.snapshot.routeConfig?.path === 'callback') {
        throw new Error('Sign in was not completed. Please try again.');
      } else await this.pkce.login(this.route.snapshot.queryParamMap.get('returnUrl') || '');
    } catch (error) { this.message = error instanceof Error ? error.message : 'Sign in failed.'; this.failed = true; }
    finally { this.busy = false; }
  }
  retry(): void {
    if (!this.pkce.nativeDev) { window.location.assign('/login'); return; }
    this.failed = false; this.busy = true;
    this.message = 'Opening secure sign in…';
    void this.pkce.login().catch(() => { this.message = 'Could not open sign in. Please try again.'; this.failed = true; }).finally(() => { this.busy = false; });
  }
}
