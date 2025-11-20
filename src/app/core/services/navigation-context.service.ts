import { Injectable } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common';

export interface NavigationContext {
    returnUrl: string;
    returnState?: any;
    openedAsModal?: boolean;
}

/**
 * Service to manage navigation context for habit/task input flow.
 * Tracks where the user came from so they can be returned to the proper location after adding/editing.
 */
@Injectable({
    providedIn: 'root'
})
export class NavigationContextService {
    private navigationStack: NavigationContext[] = [];

    constructor(
        private router: Router,
        private location: Location
    ) { }

    /**
     * Store the current navigation context before opening habit-input
     * @param returnUrl - The URL to return to after completing the action
     * @param returnState - Optional state to pass when returning
     * @param openedAsModal - Whether the habit-input was opened as a modal
     */
    pushContext(returnUrl: string, returnState?: any, openedAsModal: boolean = false): void {
        this.navigationStack.push({
            returnUrl,
            returnState,
            openedAsModal
        });
        console.log('[NavigationContext] Pushed context:', { returnUrl, returnState, openedAsModal });
    }

    /**
     * Get the last navigation context without removing it
     */
    peekContext(): NavigationContext | null {
        return this.navigationStack.length > 0
            ? this.navigationStack[this.navigationStack.length - 1]
            : null;
    }

    /**
     * Get and remove the last navigation context
     */
    popContext(): NavigationContext | null {
        const context = this.navigationStack.pop() || null;
        console.log('[NavigationContext] Popped context:', context);
        return context;
    }

    /**
     * Clear all navigation contexts
     */
    clearContext(): void {
        this.navigationStack = [];
        console.log('[NavigationContext] Cleared all contexts');
    }

    /**
     * Navigate back to the stored context location
     * @param data - Optional data to pass in navigation state
     */
    async navigateBack(data?: any): Promise<boolean> {
        const context = this.popContext();

        if (!context) {
            // No context stored, fallback to browser back or default location
            console.warn('[NavigationContext] No context found, using fallback navigation');
            return this.fallbackNavigation();
        }

        console.log('[NavigationContext] Navigating back to:', context.returnUrl);

        // Prepare navigation extras with merged state
        const navigationExtras: NavigationExtras = {
            state: {
                ...(context.returnState || {}),
                ...(data || {}),
                fromHabitInput: true
            }
        };

        try {
            return await this.router.navigate([context.returnUrl], navigationExtras);
        } catch (error) {
            console.error('[NavigationContext] Navigation failed:', error);
            return this.fallbackNavigation();
        }
    }

    /**
     * Fallback navigation when no context is available
     */
    private async fallbackNavigation(): Promise<boolean> {
        // Try to go back in browser history
        const canGoBack = window.history.length > 1;

        if (canGoBack) {
            this.location.back();
            return true;
        }

        // Last resort: navigate to habit-page
        console.log('[NavigationContext] Using last resort navigation to /authed/habit-page');
        return await this.router.navigate(['/authed/habit-page']);
    }

    /**
     * Check if there's a stored navigation context
     */
    hasContext(): boolean {
        return this.navigationStack.length > 0;
    }
}
