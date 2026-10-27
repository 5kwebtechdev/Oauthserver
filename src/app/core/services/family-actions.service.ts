import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { AuthService } from './auth.service';
import { CustomToastService } from './custom-toast.service';
import { REGISTRATION_ONBOARDING_STATE_KEY } from './onboarding-state.service';
import { environment } from '../../../environments/environment';

/** Shared entry points: Parent Home and My Family use the same existing flows. */
@Injectable({ providedIn: 'root' })
export class FamilyActionsService {
    constructor(private router: Router, private authService: AuthService,
        private toastService: CustomToastService, private platform: Platform) {}
    async shareFamilyCodeWithCoParent(currentFamilyCode: string): Promise<void> {
        const session = this.authService.getUserData();
        const familyCode = (
            currentFamilyCode
            || this.extractFamilyCode(session?.user)
            || this.extractFamilyCode(session)
        ).trim().toUpperCase();

        if (!familyCode) {
            this.toastService.error('Family code is not available yet. Please try again.');
            return;
        }

        const publicWebUrl = String(environment.publicWebUrl || 'https://supermeapp.com').replace(/\/+$/, '');
        const inviteParams = new URLSearchParams({
            role: 'parent',
            mode: 'join',
            scannedCode: familyCode
        });
        const inviteLink = `${publicWebUrl}/join-family2?${inviteParams.toString()}`;
        const configuredStoreUrl = this.platform.is('ios')
            ? environment.firebase.remoteConfig.defaults.ios_store_url
            : environment.firebase.remoteConfig.defaults.android_store_url;
        const downloadLink = String(configuredStoreUrl || publicWebUrl).trim();
        const text = [
            'Hi! 👋',
            '',
            "Join our SuperMe Family so we can work together to support our child's growth, learning, habits and daily achievements.",
            '',
            `Family Invite Code: ${familyCode}`,
            `Join here: ${inviteLink}`,
            '',
            "Once you join, you'll be able to:",
            '✨ Track progress and milestones',
            '✨ Celebrate streaks and achievements',
            '📚 Assign learning activities and quizzes',
            '💜 Stay connected and support our child together',
            '',
            `Download Link: ${downloadLink}`
        ].join('\n');

        try {
            const canShare = await Share.canShare();
            if (canShare.value) {
                await Share.share({
                    title: 'Join our SuperMe Family',
                    text,
                    dialogTitle: 'Share family code with co-parent'
                });
                return;
            }
        } catch (error) {
            if (this.isShareCancellation(error)) return;
            console.warn('[ParentAccount] Native family share unavailable:', error);
        }

        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Join our SuperMe Family', text });
                return;
            } catch (error) {
                if (this.isShareCancellation(error)) return;
            }
        }

        try {
            await Clipboard.write({ string: text });
            this.toastService.success('Family invite copied. You can share it with your co-parent.');
        } catch (error) {
            console.warn('[ParentAccount] Unable to copy family invitation:', error);
            this.toastService.error('Unable to share the family invite. Please try again.');
        }
    }

    private isShareCancellation(error: unknown): boolean {
        const message = String((error as any)?.message || error || '').toLowerCase();
        return message.includes('cancel') || message.includes('dismiss') || message.includes('abort');
    }

    openAddChild(familyCode: string): void {
        if (!familyCode) {
            this.router.navigate(['/authed/family-connection']);
            return;
        }

        // Keep the authenticated Parent available while the separate Child
        // account is created, so the success screen can safely return here.
        if (!this.authService.beginManagedChildParentSession()) {
            this.toastService.error('Unable to start Add Child. Please sign in again and retry.');
            return;
        }

        // The child must begin with an empty registration form. A Parent's
        // previous onboarding draft can include their email, name, avatar and
        // other personal data; SignupComponent restores that draft on init
        // unless we clear it before entering the managed-child flow.
        this.clearParentSignupDraftForChild();

        try {
            // Add Child from Parent Home returns directly to this screen; only
            // the initial onboarding CTA defers the Parent welcome screen.
            sessionStorage.removeItem('managed_child_parent_welcome_pending');
            sessionStorage.setItem('managed_child_signup', 'true');
            sessionStorage.setItem('managed_child_family_code', familyCode);
            sessionStorage.setItem('signup_role', 'child');
            sessionStorage.setItem('familyCode', familyCode);
        } catch (error) {
            console.warn('[ParentAccount] Unable to prepare the child signup flow', error);
        }

        this.router.navigate(['/signup'], {
            queryParams: { step: 0.1, role: 'child', managedChild: true }
        });
    }

    private clearParentSignupDraftForChild(): void {
        try {
            localStorage.removeItem(REGISTRATION_ONBOARDING_STATE_KEY);
            [
                'signup_profile',
                'signup_role',
                'signup_avatar',
                'signup_pet',
                'requestedIdentifier',
                'loginMode',
                'countryCode',
                'referralCode',
                'referralCodeLocked',
                'signup_via_oauth',
                'signup_via_google',
                'oauth_signup_provider',
                'google_signup_email',
                'google_signup_name',
                'google_signup_avatar',
                'google_signup_provider_id'
            ].forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            console.warn('[ParentAccount] Unable to clear Parent signup draft before adding a child', error);
        }
    }

    private extractFamilyCode(status: any): string {
        return String(
            status?.familyCode
            ?? status?.code
            ?? status?.family?.familyCode
            ?? status?.family?.code
            ?? status?.data?.familyCode
            ?? status?.data?.family?.familyCode
            ?? ''
        ).trim().toUpperCase();
    }

}

