import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulInputsModule } from '../mindful-inputs/mindful-inputs.module';
import { Badge, RecentAchievement, BadgeProgressResponse, CelebrationCard } from './badge-section.interface';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulPopupComponent, MindfulPopupConfig } from '../mindful-popup/mindful-popup.component';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { BadgeApi } from '../../api/badge.api';

@Component({
    selector: 'app-badge-section',
    templateUrl: './badge-section.component.html',
    styleUrls: ['./badge-section.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulInputsModule, MindfulCardHeaderComponent, MindfulPopupComponent, MindfulButtonComponent]
})
export class BadgeSectionComponent implements OnInit {
    recentAchievement: RecentAchievement | null = null;
    badges: Badge[] = [];
    celebrationCard: CelebrationCard | null = null;
    private currentShareMessage: string = '';

    // Icon mapping for badge titles
    private readonly BADGE_ICON_MAP: Readonly<Record<string, string>> = {
        'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
        'Quiz Ace': 'assets/Icons-Neutral/Icon-Badge-QuizAce.png',
        'Pet Collector': 'assets/Icons-Neutral/Icon-Badge-PetCollector.png',
        'Content Creator': 'assets/Icons-Neutral/Icon-Badge-ContentCreator.png',
        'Knowledge Seeker': 'assets/Icons-Neutral/Icon-Badge-KnowledgeSeeker.png',
        'Habit Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
        'Daily Champion': 'assets/Icons-Neutral/Icon-Badge-DailyChampion.png',
        'Feature Explorer': 'assets/Icons-Neutral/Icon-Badge-FeatureExploerer.png',
        'Puzzle Master': 'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.png',
        'Pet Stylist': 'assets/Icons-Neutral/Icon-Badge-PetStylist.png',
        'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png',
        'Learning Enthusiast': 'assets/Icons-Neutral/Icon-Badge-LearningEnthusiast.png',
        'Social Star': 'assets/Icons-Neutral/Icon-Badge-SocialStar.png',
        'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png'
    };

    constructor(private badgeApi: BadgeApi) { }

    ngOnInit(): void {
        this.loadBadges();
    }

    /**
     * Maps badge title to the local icon path
     * Falls back to a default icon if title not found
     */
    private getBadgeIcon(title: string): string {
        return this.BADGE_ICON_MAP[title] || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png';
    }

    /**
     * Calculates progress color based on completion percentage
     */
    private getProgressColor(completionPercentage: number): string {
        if (completionPercentage >= 100) return '#4CAF50'; // Green - completed
        if (completionPercentage >= 50) return '#FF9800';  // Orange - halfway
        if (completionPercentage > 0) return '#2196F3';    // Blue - started
        return '#9E9E9E';                                   // Gray - not started
    }

    /**
     * Load badge progress from API and map to UI models
     */
    loadBadges(): void {
        this.badgeApi.getBadgeProgress().subscribe({
            next: (response: BadgeProgressResponse) => {
                this.processBadgeResponse(response);
            },
            error: (error) => {
                console.error('Error loading badges:', error);
                this.badges = [];
                this.recentAchievement = null;
            }
        });
    }

    /**
     * Process the badge API response and update UI state
     */
    private processBadgeResponse(response: BadgeProgressResponse): void {
        // Handle celebration card
        if (response.celebrationCard?.showCelebration) {
            this.celebrationCard = response.celebrationCard;
            this.recentAchievement = {
                id: 'celebration-card',
                badgeName: response.celebrationCard.title,
                message: response.celebrationCard.message,
                timestamp: new Date(),
                iconUrl: this.getRecentAchievementIcon(response.celebrationCard.earnedBadges),
                shareMessage: response.celebrationCard.shareMessage
            };
            this.currentShareMessage = response.celebrationCard.shareMessage;
        } else {
            this.recentAchievement = null;
        }

        // Map badges to UI model
        this.badges = response.badges.map((apiBadge, index) => {
            const completionPercentage = this.calculateCompletionPercentage(apiBadge.progress, apiBadge.target);

            return {
                id: String(index + 1),
                name: apiBadge.title,
                description: apiBadge.description,
                iconUrl: this.getBadgeIcon(apiBadge.title),
                currentProgress: apiBadge.progress,
                targetProgress: apiBadge.target,
                isLocked: !apiBadge.isEarned,
                progressColor: this.getProgressColor(completionPercentage),
                levelText: apiBadge.levelText,
                achievementText: apiBadge.achievementText,
                isEarned: apiBadge.isEarned,
                isMaxLevel: apiBadge.isMaxLevel,
                currentLevel: apiBadge.currentLevel,
                totalLevels: apiBadge.totalLevels,
                celebrationTitle: apiBadge.celebrationTitle,
                celebrationMessage: apiBadge.celebrationMessage,
                shareMessage: apiBadge.shareMessage
            };
        });
    }

    /**
     * Get icon for recent achievement from earned badges
     */
    private getRecentAchievementIcon(earnedBadges: any[]): string {
        if (earnedBadges && earnedBadges.length > 0) {
            const latestBadge = earnedBadges[0];
            return this.getBadgeIcon(latestBadge.title || latestBadge.name);
        }
        return 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png';
    }

    /**
     * Calculate completion percentage
     */
    private calculateCompletionPercentage(progress: number, target: number): number {
        return target > 0 ? Math.round((progress / target) * 100) : 0;
    }

    /**
     * Get completion percentage for display
     */
    getCompletionPercentage(badge: Badge): number {
        if (badge.isLocked || badge.targetProgress === 0) {
            return 0;
        }
        return this.calculateCompletionPercentage(badge.currentProgress, badge.targetProgress);
    }

    onBackClick(): void {
        window.history.back();
    }

    // Share popup state and config
    sharePopupVisible: boolean = false;
    sharePopupConfig: MindfulPopupConfig = {
        heading: 'Share Now',
        showCloseButton: true,
        backdrop: true,
        ctaDirection: 'column',
        primaryCTA: {
            text: 'Copy Link',
            buttonStyle: 'white',
            buttonLarge: true,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M7.64534 11.1019C7.004 12.0631 6.12089 12.656 4.996 12.8806C3.87111 13.1051 2.82804 12.8967 1.8668 12.2554C0.905547 11.6141 0.312645 10.7309 0.0880917 9.60605C-0.136462 8.48116 0.071929 7.43809 0.713265 6.47685L4.13578 1.34711C4.59828 0.653902 5.23403 0.226551 6.04302 0.065057C6.85202 -0.0964372 7.60312 0.0540664 8.29633 0.516568C8.98954 0.979069 9.41689 1.61482 9.57838 2.42381C9.73988 3.23281 9.58937 3.98391 9.12687 4.67712L5.88936 9.52957C5.60569 9.95474 5.21731 10.2165 4.7242 10.315C4.2311 10.4134 3.77197 10.3208 3.3468 10.0371C2.92163 9.75346 2.65983 9.36507 2.5614 8.87197C2.46296 8.37887 2.55558 7.91973 2.83925 7.49457L6.26176 2.36483L7.37089 3.10483L3.94838 8.23457C3.86821 8.35473 3.8412 8.48029 3.86735 8.61127C3.89349 8.74225 3.96665 8.84783 4.0868 8.92799C4.20696 9.00816 4.33253 9.03517 4.46351 9.00903C4.59449 8.98288 4.70006 8.90973 4.78023 8.78957L8.01774 3.93712C8.2675 3.54276 8.35008 3.12368 8.2655 2.67989C8.18091 2.2361 7.94452 1.8847 7.55633 1.6257C7.16813 1.3667 6.75059 1.2818 6.30372 1.37101C5.85685 1.46021 5.50391 1.69892 5.24491 2.08711L1.8224 7.21685C1.37532 7.86692 1.23022 8.57488 1.38711 9.34073C1.544 10.1066 1.95056 10.7084 2.6068 11.1463C3.25379 11.5779 3.95636 11.7161 4.71451 11.5607C5.47265 11.4054 6.07989 11.0058 6.53621 10.3619L10.1437 4.95484L11.2529 5.69484L7.64534 11.1019Z" fill="%23282527"/></svg>',
            iconPosition: 'start',
            callback: () => this.copyShareLink()
        },
        secondaryCTA: {
            text: 'Share through Whatsapp',
            buttonStyle: 'white',
            buttonLarge: true,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.0654 9.32917C10.932 9.2625 10.0654 8.8625 9.93203 8.79583C9.7987 8.72917 9.66537 8.72917 9.53203 8.8625C9.3987 8.99583 9.13203 9.39583 8.9987 9.52917C8.93203 9.6625 8.7987 9.6625 8.66536 9.59583C8.1987 9.39583 7.73203 9.12917 7.33203 8.79583C6.9987 8.4625 6.66537 8.0625 6.3987 7.6625C6.33203 7.52917 6.3987 7.39583 6.46536 7.32917C6.53203 7.2625 6.5987 7.12917 6.73203 7.0625C6.7987 6.99583 6.86537 6.8625 6.86537 6.79583C6.93203 6.72917 6.93203 6.59583 6.86537 6.52917C6.7987 6.4625 6.46536 5.6625 6.33203 5.32917C6.26536 4.8625 6.13203 4.8625 5.9987 4.8625H5.66536C5.53203 4.8625 5.33203 4.99583 5.26536 5.0625C4.86536 5.4625 4.66536 5.92917 4.66536 6.4625C4.73203 7.0625 4.93203 7.6625 5.33203 8.19583C6.06536 9.2625 6.9987 10.1292 8.13203 10.6625C8.46536 10.7958 8.73203 10.9292 9.06536 10.9958C9.3987 11.1292 9.73203 11.1292 10.132 11.0625C10.5987 10.9958 10.9987 10.6625 11.2654 10.2625C11.3987 9.99583 11.3987 9.72917 11.332 9.4625L11.0654 9.32917ZM12.732 3.2625C10.132 0.6625 5.93203 0.6625 3.33203 3.2625C1.1987 5.39583 0.798698 8.6625 2.26536 11.2625L1.33203 14.6625L4.86536 13.7292C5.86537 14.2625 6.93203 14.5292 7.9987 14.5292C11.6654 14.5292 14.5987 11.5958 14.5987 7.92917C14.6654 6.19583 13.932 4.52917 12.732 3.2625ZM10.932 12.5958C10.0654 13.1292 9.06536 13.4625 7.9987 13.4625C6.9987 13.4625 6.06536 13.1958 5.1987 12.7292L4.9987 12.5958L2.93203 13.1292L3.46536 11.1292L3.33203 10.9292C1.73203 8.2625 2.53203 4.92917 5.13203 3.2625C7.73203 1.59583 11.0654 2.4625 12.6654 4.99583C14.2654 7.59583 13.532 10.9958 10.932 12.5958Z" fill="black"/></svg>',
            iconPosition: 'start',
            callback: () => this.shareWhatsapp()
        }
    };

    /**
     * Opens share popup with current share message
     */
    onShareClick(): void {
        this.sharePopupVisible = true;
    }

    /**
     * Copy share link with message to clipboard
     */
    copyShareLink(): void {
        const shareText = this.currentShareMessage || this.recentAchievement?.shareMessage || 'Check out my progress on SuperMe!';
        const link = `${shareText} ${window.location.href}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                console.log('Share link copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }
        this.sharePopupVisible = false;
    }

    /**
     * Share via WhatsApp with message
     */
    shareWhatsapp(): void {
        const shareText = this.currentShareMessage || this.recentAchievement?.shareMessage || 'Check out my progress on SuperMe!';
        const message = encodeURIComponent(`${shareText} ${window.location.href}`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
        this.sharePopupVisible = false;
    }

    // Congratulatory popup state
    congratsVisible: boolean = false;

    // The badge currently shown in the congrats popup
    selectedBadge?: Badge;

    /**
     * Show congratulations popup for a specific badge
     */
    showBadgeCongratulation(badge: Badge): void {
        this.selectedBadge = badge;
        this.congratsVisible = true;
        this.currentShareMessage = badge.shareMessage || `I earned the ${badge.name} badge on SuperMe! 🚀`;
    }

    /**
     * Test method to show congrats for first badge
     */
    onTestClick(): void {
        if (this.badges.length > 0) {
            this.showBadgeCongratulation(this.badges[0]);
        }
    }

    /**
     * View all badges - close congrats popup
     */
    onViewAllBadges(): void {
        this.congratsVisible = false;
        this.selectedBadge = undefined;
        this.currentShareMessage = this.celebrationCard?.shareMessage || '';
    }

    /**
     * Awesome clicked - close congrats popup
     */
    onAwesomeClick(): void {
        this.congratsVisible = false;
        this.selectedBadge = undefined;
        this.currentShareMessage = this.celebrationCard?.shareMessage || '';
    }

    /**
     * Close congrats popup and clear selection
     */
    closeCongrats(): void {
        this.congratsVisible = false;
        this.selectedBadge = undefined;
        this.currentShareMessage = this.celebrationCard?.shareMessage || '';
    }
}
