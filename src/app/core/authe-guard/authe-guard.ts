import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingStateService } from '../services/onboarding-state.service';

/**
 * Resolves the first screen before HomePage is created, preventing onboarding
 * screens from flashing while a returning user is redirected.
 */
export const startupGuard: CanActivateFn = (route) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const onboardingState = inject(OnboardingStateService);

    if (authService.isLoggedIn()) {
        const resume = onboardingState.getResumeNavigation(authService.getUserData());
        // A social Child may still need Details, or may have intentionally
        // skipped family linking. Respect that resumable social step before
        // applying the legacy pending-child redirect.
        if (resume && onboardingState.isSocialOnboarding()) {
            return router.createUrlTree([resume.url], { queryParams: resume.queryParams });
        }
        if (authService.isPendingChild()) {
            return router.parseUrl('/home/join-family');
        }
        if (resume) {
            return router.createUrlTree([resume.url], { queryParams: resume.queryParams });
        }
        onboardingState.markExistingUser();
        return router.parseUrl(authService.getDashboardRoute());
    }

    // Deliberate Back from role selection may review the landing walkthrough.
    // Its usual startup redirect would otherwise reopen signup/login instantly.
    if (route.queryParamMap?.get('reviewPrevious') === 'true') return true;

    const registrationResume = onboardingState.getResumeNavigation();
    if (registrationResume) {
        return router.createUrlTree([registrationResume.url], {
            queryParams: registrationResume.queryParams
        });
    }

    if (onboardingState.hasCompletedRoleSelection()) {
        return router.parseUrl('/login');
    }

    // Returning guests who have already completed the walkthrough can go
    // straight to signup. A brand-new install must render HomePage first so
    // the four-slide splash/walkthrough is shown before any auth screen.
    if (onboardingState.hasSeenSplash()) {
        return router.createUrlTree(['/signup'], {
            queryParams: { step: 1 }
        });
    }

    return true;
};

/**
 * The old child instruction page is retired. Keeping a guarded legacy route
 * safely redirects browser history, old deep links, and upgraded sessions
 * without ever instantiating or flashing the removed component state.
 */
export const retiredChildInstructionsGuard: CanActivateFn = () => {
    const router = inject(Router);
    return router.createUrlTree(['/signup'], {
        queryParams: {
            step: 2,
            role: 'child',
            editOnboarding: 'true'
        }
    });
};

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
    const onboardingState = inject(OnboardingStateService);

    const isLoggedIn = authService.isLoggedIn();

    console.log('[AuthGuard] Route activation check:', {
        path: state.url,
        isLoggedIn,
        hasToken: !!authService.getToken(),
        userId: authService.getUserId()
    });

    if (isLoggedIn) {
        const resume = onboardingState.getResumeNavigation(authService.getUserData());
        if (resume && onboardingState.isSocialOnboarding()) {
            return router.createUrlTree([resume.url], { queryParams: resume.queryParams });
        }
        if (authService.isPendingChild()) {
            return router.parseUrl('/home/join-family');
        }
        if (resume) {
            return router.createUrlTree([resume.url], { queryParams: resume.queryParams });
        }

        // Check if session is expiring soon and log a warning
        if (authService.isSessionExpiringSoon()) {
            console.warn('[AuthGuard] Session expiring soon. Remaining time:',
                Math.round(authService.getSessionRemainingTime() / 1000 / 60), 'minutes');
        }

        return true;
    } else {
        console.warn('[AuthGuard] Access denied. Redirecting to login.');

        // Redirect to login with return URL
        router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
        });

        return false;
    }
};

/**
 * Canonicalise the pre-URL-structure `/authed/*` links without breaking old
 * bookmarks or links embedded in previously shipped web builds.
 */
export const legacyAuthedRedirectGuard: CanActivateChildFn = (_route, state) => {
    const router = inject(Router);
    const canonicalUrl = state.url.replace(/^\/authed(?=\/|$)/, '/app');
    return router.parseUrl(canonicalUrl === '/app' ? '/home' : canonicalUrl);
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
    const onboardingState = inject(OnboardingStateService);
    const isSignupRoute = /^\/(?:sign-up|signup)(?:\?|$)/.test(state.url);

    // Allow OAuth new-user flow to access sign-up even when authenticated
    const isOAuthOnboarding = (
        sessionStorage.getItem('signup_via_google') === 'true'
        || sessionStorage.getItem('signup_via_oauth') === 'true'
    )
        && isSignupRoute;
    if (isOAuthOnboarding) {
        return true;
    }

    // A parent can intentionally create a separate Child account on the same
    // device after creating a family. Keep this narrowly scoped to signup.
    const isManagedChildSignup = sessionStorage.getItem('managed_child_signup') === 'true'
        && isSignupRoute;
    if (isManagedChildSignup) {
        return true;
    }

    // After a Parent creates a child during initial onboarding, allow the
    // one-time deferred Parent welcome/Unlock screen before Parent Home.
    const isManagedChildParentWelcome = sessionStorage.getItem('managed_child_parent_welcome_pending') === 'true'
        && isSignupRoute
        && route.queryParamMap.get('step') === '5';
    if (isManagedChildParentWelcome) {
        return true;
    }

    // A newly registered child is already authenticated after linking their
    // family. Allow only the remaining Pet and welcome onboarding steps.
    const isPostFamilyOnboarding = sessionStorage.getItem('show_child_welcome_after_family') === 'true'
        && isSignupRoute
        && (state.url.includes('step=4') || state.url.includes('step=5'));
    if (isPostFamilyOnboarding) {
        return true;
    }

    const isLoggedIn = authService.isLoggedIn();
    const isPendingChildDetailsBack = isLoggedIn
        && (authService.isPendingChild()
            || sessionStorage.getItem('show_child_welcome_after_family') === 'true')
        && isSignupRoute
        && route.queryParamMap.get('step') === '2'
        && route.queryParamMap.get('role') === 'child'
        && route.queryParamMap.get('editOnboarding') === 'true';
    if (isPendingChildDetailsBack) {
        return true;
    }

    const registrationResume = onboardingState.getResumeNavigation(
        isLoggedIn ? authService.getUserData() : undefined
    );

    console.log('[GuestGuard] Route activation check:', {
        path: state.url,
        isLoggedIn
    });

    if (!isLoggedIn) {
        return true;
    } else if (registrationResume && onboardingState.isSocialOnboarding()) {
        // An explicit Back from the social profile form may review the role
        // without changing the backend's authoritative resume step.
        if (isSignupRoute && route.queryParamMap.get('step') === '1'
            && route.queryParamMap.get('reviewPrevious') === 'true'
            && registrationResume.queryParams?.['step'] === 2) {
            return true;
        }
        const targetStep = registrationResume.queryParams?.['step'];
        const currentStep = route.queryParamMap.get('step');
        const isExactSocialResumeTarget = state.url.includes(registrationResume.url)
            && (targetStep == null || currentStep === String(targetStep));
        if (isExactSocialResumeTarget) {
            return true;
        }
        return router.createUrlTree([registrationResume.url], {
            queryParams: registrationResume.queryParams
        });
    } else if (authService.isPendingChild()) {
        return router.parseUrl('/home/join-family');
    } else if (registrationResume) {
        if (state.url.includes('/signup')) {
            return true;
        }
        return router.createUrlTree([registrationResume.url], {
            queryParams: registrationResume.queryParams
        });
    } else {
        console.log('[GuestGuard] User already authenticated. Redirecting to appropriate dashboard.');
        const dashboardRoute = authService.getDashboardRoute();
        router.navigate([dashboardRoute]);
        return false;
    }
};
