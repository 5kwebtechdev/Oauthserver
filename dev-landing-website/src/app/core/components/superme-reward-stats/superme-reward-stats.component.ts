import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'superme-reward-stats',
    templateUrl: './superme-reward-stats.component.html',
    styleUrls: ['./superme-reward-stats.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export class SupremeRewardStatsComponent {
    constructor(private router: Router) { }
    private routerSub?: Subscription;
    currentUrl = '';
    @Input() userCoins: number | string = 0;
    @Input() userStreaks: number | string = 0;
    @Input() userDays: number | string = 0;
    @Input() userBadges: number | string = 0;

    @Input() successPercentage: number | string = 0; // e.g. 85 (percent)
    @Input() totalStreaks: number | string = 0; // total historical streaks count

    @Input() coinsIcon: string = '/assets/Icons-Neutral/Icons-Coins.png';
    @Input() trophyIcon: string = '/assets/Icons-Neutral/Icon-Trophy.png';
    @Input() streakIcon: string = '/assets/Icons-Neutral/Icon-Streak.png';
    @Input() badgesIcon: string = '/assets/Icons-Neutral/Icon-Badge.png';
    @Input() successIcon: string = '/assets/Icons-Neutral/Icon-SuccessRate.png';
    @Input() totalStreaksIcon: string = '/assets/Icons-Neutral/Icon-BestStreak.png';


    @Input() slot1: string = 'coins';
    @Input() slot2: string = 'trophy';
    @Input() slot3: string = 'streak';
    @Input() slot4: string = 'badges';

    getStatValue(slot: string): string | number {
        switch (slot) {
            case 'coins':
                return this.userCoins ?? 0;
            case 'trophy':
                return this.userStreaks ?? 0;
            case 'streak':
                return this.userDays ?? 0;
            case 'badges':
                return this.userBadges ?? 0;
            case 'success':
                return typeof this.successPercentage === 'number' ? `${this.successPercentage}%` : this.successPercentage;
            case 'total-streaks':
                return this.totalStreaks ?? 0;
            default:
                return '';
        }
    }

    getStatIcon(slot: string): string {
        switch (slot) {
            case 'coins':
                return this.coinsIcon;
            case 'trophy':
                return this.trophyIcon;
            case 'streak':
                return this.streakIcon;
            case 'badges':
                return this.badgesIcon;
            case 'success':
                return this.successIcon;
            case 'total-streaks':
                return this.totalStreaksIcon;
            default:
                return '';
        }
    }

    async openCoinPageIf(slot: string) {
        if (slot === 'coins') {
            this.router.navigate(['/home', 'coin']);
        }
    }

    async openTrophyPageIf(slot: string) {
        if (slot === 'trophy') {
            this.router.navigate(['/home', 'trophies']);
        }
    }

    async openStreakPageIf(slot: string) {
        if (slot === 'streak') {
            this.router.navigate(['/home', 'streaks']);
        }
    }

    async openBadgesPageIf(slot: string) {
        if (slot === 'badges') {
            this.router.navigate(['/home', 'badges']);
        }
    }

    ngOnInit(): void {
        // track current url to determine active stat
        this.currentUrl = this.router.url || '';
        this.routerSub = this.router.events.subscribe(e => {
            if (e instanceof NavigationEnd) {
                this.currentUrl = e.urlAfterRedirects || e.url;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.routerSub) this.routerSub.unsubscribe();
    }

    isActive(slot: string): boolean {
        if (!this.currentUrl) return false;
        const url = this.currentUrl.toLowerCase();
        switch (slot) {
            case 'coins':
                return url.includes('/home/coin') || url.includes('/coin');
            case 'trophy':
                return url.includes('/home/trophies') || url.includes('/trophies');
            case 'streak':
                return url.includes('/home/streaks') || url.includes('/streaks');
            case 'badges':
                return url.includes('/home/badges') || url.includes('/badges');
            default:
                return false;
        }
    }
}
