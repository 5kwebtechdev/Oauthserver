import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Authentication guard to protect routes
 * Redirects to login page if user is not authenticated
 */
export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const isLoggedIn = authService.isLoggedIn();

    console.log('[AuthGuard] Route activation check:', {
        path: state.url,
        isLoggedIn,
        hasToken: !!authService.getToken(),
        userId: authService.getUserId()
    });

    if (isLoggedIn) {
        // Check if session is expiring soon and log a warning
        if (authService.isSessionExpiringSoon()) {
            console.warn('[AuthGuard] Session expiring soon. Remaining time:',
                Math.round(authService.getSessionRemainingTime() / 1000 / 60), 'minutes');
        }

        return true;
    } else {
        console.warn('[AuthGuard] Access denied. Redirecting to login.');

        // Redirect to login with return URL
        router.navigate(['/home/login'], {
            queryParams: { returnUrl: state.url }
        });

        return false;
    }
};

/**
 * Guest guard to prevent authenticated users from accessing auth pages
 * Redirects to dashboard if user is already authenticated
 */
export const guestGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    // Allow Google OAuth new-user flow to access sign-up even when authenticated
    const isGoogleOnboarding = sessionStorage.getItem('signup_via_google') === 'true'
        && state.url.includes('/sign-up');
    if (isGoogleOnboarding) {
        return true;
    }

    const isLoggedIn = authService.isLoggedIn();

    console.log('[GuestGuard] Route activation check:', {
        path: state.url,
        isLoggedIn
    });

    if (!isLoggedIn) {
        return true;
    } else {
        console.log('[GuestGuard] User already authenticated. Redirecting to appropriate dashboard.');
        const dashboardRoute = authService.getDashboardRoute();
        router.navigate([dashboardRoute]);
        return false;
    }
};
