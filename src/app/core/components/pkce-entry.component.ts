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
        const resume = this.onboarding.getResumeNavigation(this.auth.getUserData());
        const requested = sessionStorage.getItem('pkce_return_url') || '';
        sessionStorage.removeItem('pkce_return_url');
        if (resume) await this.router.navigate([resume.url], { queryParams: resume.queryParams });
        else await this.router.navigateByUrl(requested.startsWith('/') && !requested.startsWith('//') ? requested : this.auth.getDashboardRoute());
      } else if (this.route.snapshot.routeConfig?.path === 'callback') {
        throw new Error('Sign in was not completed. Please try again.');
      } else await this.pkce.login(this.route.snapshot.queryParamMap.get('returnUrl') || '');
    } catch (error) { this.message = error instanceof Error ? error.message : 'Sign in failed.'; this.failed = true; }
  }
  retry(): void { window.location.assign('/login'); }
}
