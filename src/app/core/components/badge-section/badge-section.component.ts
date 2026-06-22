import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupermeInputsModule } from '../superme-inputs/superme-inputs.module';
import { Badge, RecentAchievement, BadgeProgressResponse, CelebrationCard } from './badge-section.interface';
import { SupermeCardHeaderComponent } from '../superme-navigator/superme-card-header/superme-card-header.component';
import { SupermePopupComponent, SupermePopupConfig } from '../superme-popup/superme-popup.component';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { BadgeApi } from '../../api/badge.api';
import { BadgeSocketService, BadgePopupData } from '../../services/badge-socket.service';
import { BadgePopupService } from '../../services/badge-popup.service';


@Component({
    selector: 'app-badge-section',
    templateUrl: './badge-section.component.html',
    styleUrls: ['./badge-section.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, SupermeInputsModule, SupermeCardHeaderComponent, SupermePopupComponent, SupermeButtonComponent]
})
export class BadgeSectionComponent implements OnInit, OnDestroy {
    recentAchievement: RecentAchievement | null = null;
    badges: Badge[] = [];
    celebrationCard: CelebrationCard | null = null;
    private currentShareMessage: string = '';
    private badgeSubscription?: Subscription;

    // Track the current badge being shown for acknowledgement
    private currentPopupBadgeId?: number;

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

    constructor(
        private badgeApi: BadgeApi,
        private badgeSocketService: BadgeSocketService,
        private badgePopupService: BadgePopupService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadBadges();
        this.subscribeToBadgeNotifications();
        this.badgePopupService.check();
    }

    ngOnDestroy(): void {
        this.badgeSubscription?.unsubscribe();
    }

    /**
     * Subscribe to real-time badge notifications from WebSocket
     */
    private subscribeToBadgeNotifications(): void {
        this.badgeSubscription = this.badgeSocketService.onBadgeReceived().subscribe(
            (badge: BadgePopupData) => {
                console.log('[BadgeSection] Received badge notification:', badge);
                this.showBadgePopup(badge);
            }
        );
    }

    /**
     * Show badge popup from WebSocket notification
     */
    private showBadgePopup(badgeData: BadgePopupData): void {
        // Convert BadgePopupData to Badge format for the popup
        this.selectedBadge = {
            id: badgeData.badgeId.toString(),
            name: badgeData.name,
            description: badgeData.description,
            iconUrl: badgeData.iconUrl,
            currentProgress: 0,
            targetProgress: 0,
            isLocked: false,
            levelText: badgeData.levelText,
            achievementText: badgeData.achievementText,
            isEarned: true,
            isMaxLevel: badgeData.isMaxLevel,
            currentLevel: badgeData.currentLevel,
            totalLevels: badgeData.totalLevels,
            celebrationTitle: badgeData.celebrationTitle,
            celebrationMessage: badgeData.celebrationMessage,
            shareMessage: badgeData.shareMessage
        };
        this.currentPopupBadgeId = badgeData.badgeId;
        this.currentShareMessage = badgeData.shareMessage;
        this.congratsVisible = true;
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
        // Show green for any in-progress or completed state, gray for not started
        if (completionPercentage > 0) return '#4CAF50';    // Green - in progress/completed
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
        // Show progress even for locked badges (useful to indicate progress toward unlocking).
        if (badge.targetProgress === 0) {
            return 0;
        }
        return this.calculateCompletionPercentage(badge.currentProgress, badge.targetProgress);
    }

    onBackClick(): void {
        window.history.back();
    }

    // Share popup state and config
    sharePopupVisible: boolean = false;
    sharePopupConfig: SupermePopupConfig = {
        heading: 'Share Now',
        showCloseButton: true,
        backdrop: true,
        ctaDirection: 'column',
        primaryCTA: {
            text: 'Copy Link',
            buttonStyle: 'white',
            buttonLarge: true,
            callback: () => this.copyShareLink()
        },
        secondaryCTA: {
            text: 'Share through WhatsApp',
            buttonStyle: 'white',
            buttonLarge: true,
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

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
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
        const message = encodeURIComponent(shareText);
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
        this.acknowledgeBadgeAndClose();
        // Stay on badge section page - user clicked "View all Badges"
    }

    /**
     * Awesome clicked - close congrats popup and acknowledge
     */
    onAwesomeClick(): void {
        this.acknowledgeBadgeAndClose();
    }

    /**
     * Close congrats popup and clear selection
     */
    closeCongrats(): void {
        this.acknowledgeBadgeAndClose();
    }

    /**
     * Acknowledge the badge popup and close it
     */
    private acknowledgeBadgeAndClose(): void {
        // Acknowledge to backend if we have a badge ID
        if (this.currentPopupBadgeId) {
            this.badgeApi.acknowledgeBadgePopup(this.currentPopupBadgeId).subscribe({
                next: () => {
                    console.log('[BadgeSection] Badge popup acknowledged:', this.currentPopupBadgeId);
                },
                error: (error) => {
                    console.error('[BadgeSection] Failed to acknowledge badge popup:', error);
                }
            });
        }

        // Close popup
        this.congratsVisible = false;
        this.selectedBadge = undefined;
        this.currentPopupBadgeId = undefined;
        this.currentShareMessage = this.celebrationCard?.shareMessage || '';

        // Notify socket service that popup is closed (to show next badge in queue)
        this.badgeSocketService.popupClosed();

        // Refresh badges to update progress
        this.loadBadges();
    }
}
