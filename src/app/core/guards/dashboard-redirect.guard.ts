import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardRedirectGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const userRole = this.authService.getUserRelationship();
        const requestedRoute = state.url;

        // If user is a parent and tries to access user-dashboard, redirect to parent-account
        if (userRole === 'PARENT' && requestedRoute.includes('/authed/user-dashboard')) {
            this.router.navigate(['/authed/parent-account'], { replaceUrl: true });
            return false;
        }

        // If user is a child/self and tries to access parent-account, redirect to user-dashboard
        if ((userRole === 'CHILD' || userRole === 'SELF') && requestedRoute.includes('/authed/parent-account')) {
            this.router.navigate(['/authed/user-dashboard'], { replaceUrl: true });
            return false;
        }

        return true;
    }
}