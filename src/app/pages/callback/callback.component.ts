import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * By the time this route renders, AuthService.init() (run at app bootstrap via
 * provideAppInitializer) has already processed the ?code=&state= callback and
 * exchanged it for tokens. This just routes onward based on the outcome.
 */
@Component({
  selector: 'app-callback',
  standalone: true,
  template: `<p>Signing you in...</p>`,
})
export class CallbackComponent implements OnInit {
  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.router.navigateByUrl(this.auth.isLoggedIn() ? '/dashboard' : '/login');
  }
}
