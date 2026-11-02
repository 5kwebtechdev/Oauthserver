import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UnauthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.authService.isLoggedIn()) {
      return true;
    } else {
      // If already authenticated, redirect to the correct dashboard based on user role
      const dashboardRoute = this.authService.getDashboardRoute();
      console.log('[UnauthGuard] User logged in, redirecting to:', dashboardRoute);
      return this.router.parseUrl(dashboardRoute);
    }
  }
}