import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PkceAuthService } from '../services/pkce-auth.service';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';
@Component({ standalone: true, imports: [CommonModule], template: `<main style="padding:2rem;text-align:center"><p role="status">{{ message }}</p><button *ngIf="failed" (click)="retry()">Try again</button></main>` })
export class PkceEntryComponent implements OnInit {
  message = 'Signing you in…'; failed = false;
  constructor(private pkce: PkceAuthService, private auth: AuthService,
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
      } else if (this.route.snapshot.routeConfig?.path === 'callback') {
        throw new Error('Sign in was not completed. Please try again.');
      } else await this.pkce.login(this.route.snapshot.queryParamMap.get('returnUrl') || '');
    } catch (error) { this.message = error instanceof Error ? error.message : 'Sign in failed.'; this.failed = true; }
  }
  retry(): void { window.location.assign('/login'); }
}
