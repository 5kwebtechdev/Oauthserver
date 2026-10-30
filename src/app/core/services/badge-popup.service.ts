import { Injectable } from '@angular/core';
import { Subject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BadgeApi } from '../api/badge.api';
import { BadgePopupData } from './badge-socket.service';

const DEFAULT_ICON = 'assets/Icons-Neutral/Icon-Badge-CoinCollector.webp';

@Injectable({ providedIn: 'root' })
export class BadgePopupService {
    private show$ = new Subject<BadgePopupData>();
    private popupVisible = false;

    constructor(private badgeApi: BadgeApi) {}

    /** AppComponent subscribes to this to display popups. */
    onShowPopup(): Observable<BadgePopupData> {
        return this.show$.asObservable();
    }

    /** Call from AppComponent when popup becomes visible/hidden. */
    setPopupVisible(visible: boolean): void {
        this.popupVisible = visible;
    }

    /**
     * Poll GET /badges/popup/pending after any badge-earning action.
     * No-op if a popup is already on screen.
     */
    check(): void {
        if (this.popupVisible) return;

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        this.badgeApi.getPendingBadgePopup().pipe(
            catchError(err => {
                if (err?.status !== 401) console.warn('[BadgePopup] poll failed:', err);
                return of(null);
            })
        ).subscribe((res: any) => {
            if (!res?.showPopup) return;
            this.popupVisible = true;
            this.show$.next(this.mapResponse(res));
        });
    }

    /**
     * Acknowledge a shown popup then show the next one if pendingCount > 1.
     * Retries the ack once silently on network error.
     */
    ack(badgeId: number, pendingCount: number): void {
        this.badgeApi.acknowledgeBadgePopup(badgeId).pipe(
            catchError(() => {
                return this.badgeApi.acknowledgeBadgePopup(badgeId).pipe(catchError(() => of(null)));
            })
        ).subscribe(() => {
            this.popupVisible = false;
            if (pendingCount > 1) {
                setTimeout(() => this.check(), 50);
            }
        });
    }

    private mapResponse(res: any): BadgePopupData {
        const currentLevel = Number(res.level || res.currentLevel || 1);
        const title = res.title || `Level ${currentLevel} - Badge Unlocked!`;

        return {
            badgeId: res.badgeId,
            title,
            name: res.badgeName || '',
            levelText: res.level ? `Level ${res.level}` : '',
            description: res.message || '',
            achievementText: res.message || '',
            iconUrl: res.icon ? this.resolveIcon(res.icon) : DEFAULT_ICON,
            celebrationTitle: title,
            celebrationMessage: res.message || '',
            shareMessage: '',
            currentLevel,
            totalLevels: 5,
            isMaxLevel: false,
            pendingCount: res.pendingCount ?? 1,
            primaryButton: res.primaryButton || 'Awesome',
            secondaryButton: res.secondaryButton || 'View all Badges',
            earnedDate: res.earnedDate || res.achievedAt || undefined,
        };
    }

    private resolveIcon(icon: string): string {
        if (!icon) return DEFAULT_ICON;
        if (icon.startsWith('http') || icon.startsWith('assets/')) return icon;
        return icon.startsWith('/') ? icon.substring(1) : icon;
    }
}
