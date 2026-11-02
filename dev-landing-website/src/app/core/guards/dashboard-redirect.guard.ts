import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * DashboardRedirectGuard
 * 
 * This guard ensures users are redirected to their appropriate dashboard based on their role:
 * - PARENT users → /parent (Parent Dashboard)
 * - CHILD/SELF users → /home (User Dashboard)
 * 
 * It prevents:
 * - Parents from accessing the child/self dashboard (/home)
 * - Children/Self from accessing the parent dashboard (/parent)
 */
@Injectable({
    providedIn: 'root'
})
export class DashboardRedirectGuard implements CanActivate {

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

        // First check if user is logged in
        if (!this.authService.isLoggedIn()) {
            console.log('[DashboardRedirectGuard] User not logged in, redirecting to landing page');
            return this.router.parseUrl('/');
        }

        const userRole = this.authService.getUserRelationship();
        const requestedRoute = state.url;

        console.log('[DashboardRedirectGuard] Checking access:', {
            userRole,
            requestedRoute
        });

        // If user is a PARENT and tries to access the child/self dashboard (/home), redirect to parent dashboard
        if (userRole === 'PARENT' && (
            requestedRoute === '/home' ||
            requestedRoute.startsWith('/home/')
        )) {
            console.log('[DashboardRedirectGuard] Parent user trying to access home, redirecting to parent dashboard');
            return this.router.parseUrl('/parent');
        }

        // If user is a CHILD or SELF and tries to access parent dashboard, redirect to home
        if ((userRole === 'CHILD' || userRole === 'SELF') && (
            requestedRoute === '/parent' ||
            requestedRoute.startsWith('/parent/')
        )) {
            console.log('[DashboardRedirectGuard] Child/Self user trying to access parent dashboard, redirecting to home');
            return this.router.parseUrl('/home');
        }

        // Allow access
        return true;
    }
}
