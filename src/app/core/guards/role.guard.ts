import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {

    constructor(
        private userService: UserService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const userProfile = this.userService.getUserProfile();
        const userRole = userProfile?.relationship?.toUpperCase();

        // Get allowed roles from route data
        const allowedRoles: string[] = route.data['allowedRoles'] || [];

        // If no roles specified, allow access
        if (allowedRoles.length === 0) {
            return true;
        }

        // Check if user role is in allowed roles
        if (userRole && allowedRoles.includes(userRole)) {
            return true;
        }

        // Redirect based on user role
        this.redirectBasedOnRole(userRole);
        return false;
    }

    /**
     * Redirect user to their appropriate dashboard based on role
     */
    redirectBasedOnRole(role: string | undefined): void {
        if (role === 'PARENT') {
            this.router.navigate(['/authed/parent-account']);
        } else {
            // CHILD, SELF, or undefined - go to user-dashboard
            this.router.navigate(['/authed/user-dashboard']);
        }
    }

    /**
     * Static helper to get the correct dashboard route for a role
     */
    static getDashboardRouteForRole(role: string | undefined): string {
        const normalizedRole = role?.toUpperCase();
        if (normalizedRole === 'PARENT') {
            return '/authed/parent-account';
        }
        return '/authed/user-dashboard';
    }
}
