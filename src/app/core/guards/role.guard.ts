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

        const allowedRoles: string[] = route.data['allowedRoles'] || [];

        // If no roles specified, allow access
        if (!allowedRoles || allowedRoles.length === 0) {
            return true;
        }

        // If user has a role and it's allowed, allow
        if (userRole && allowedRoles.includes(userRole)) {
            return true;
        }

        // Otherwise, redirect to the appropriate dashboard for the user's role
        const target = userRole === 'PARENT' ? '/authed/parent-account' : '/authed/user-dashboard';

        try {
            if (this.router.url === target) return false;
        } catch (e) {
            // ignore
        }

        this.router.navigateByUrl(target, { replaceUrl: true }).catch(() => { });
        return false;
    }

    // Static helper kept for convenience
    static getDashboardRouteForRole(role: string | undefined): string {
        const normalized = role?.toUpperCase();
        return normalized === 'PARENT' ? '/authed/parent-account' : '/authed/user-dashboard';
    }
}
