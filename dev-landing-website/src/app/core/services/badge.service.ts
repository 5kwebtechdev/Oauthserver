import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BadgeApi } from '../api/badge.api';

// ========== INTERFACES ==========

export interface Badge {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    currentProgress: number;
    targetProgress: number;
    isLocked: boolean;
    progressColor?: string;
    levelText?: string;
    achievementText?: string;
    isEarned?: boolean;
    isMaxLevel?: boolean;
    currentLevel?: number;
    totalLevels?: number;
    celebrationTitle?: string;
    celebrationMessage?: string;
    shareMessage?: string;
}

export interface CelebrationCard {
    title: string;
    message: string;
    shareMessage: string;
    earnedBadges: any[];
    showCelebration: boolean;
}

export interface BadgeProgressResponse {
    celebrationCard: CelebrationCard;
    badges: BadgeApiResponse[];
}

export interface BadgeApiResponse {
    title: string;
    levelText: string;
    description: string;
    achievementText: string;
    icon: string;
    progress: number;
    target: number;
    isEarned: boolean;
    isMaxLevel: boolean;
    currentLevel: number;
    totalLevels: number;
    celebrationTitle: string;
    celebrationMessage: string;
    shareMessage: string;
}

export interface RecentAchievement {
    id: string;
    badgeName: string;
    message: string;
    timestamp: Date;
    iconUrl: string;
    shareMessage?: string;
}

// ========== SERVICE ==========

@Injectable({ providedIn: 'root' })
export class BadgeService {
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

    /**
     * Load badge progress from API
     */
    getBadgeProgress(): Observable<BadgeProgressResponse> {
        return this.badgeApi.getBadgeProgress().pipe(
            catchError(error => {
                console.error('Error loading badges:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Process badge response and map to UI models
     */
    processBadgeResponse(response: BadgeProgressResponse): {
        badges: Badge[];
        recentAchievement: RecentAchievement | null;
        celebrationCard: CelebrationCard | null;
    } {
        let recentAchievement: RecentAchievement | null = null;
        let celebrationCard: CelebrationCard | null = null;

        // Handle celebration card
        if (response.celebrationCard?.showCelebration) {
            celebrationCard = response.celebrationCard;
            recentAchievement = {
                id: 'celebration-card',
                badgeName: response.celebrationCard.title,
                message: response.celebrationCard.message,
                timestamp: new Date(),
                iconUrl: this.getRecentAchievementIcon(response.celebrationCard.earnedBadges),
                shareMessage: response.celebrationCard.shareMessage
            };
        }

        // Map badges to UI model
        const badges: Badge[] = (response.badges || []).map((apiBadge, index) => {
            const completionPercentage = this.calculateCompletionPercentage(
                apiBadge.progress,
                apiBadge.target
            );

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

        return { badges, recentAchievement, celebrationCard };
    }

    /**
     * Maps badge title to the local icon path
     */
    getBadgeIcon(title: string): string {
        return this.BADGE_ICON_MAP[title] || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png';
    }

    /**
     * Calculates progress color based on completion percentage
     */
    getProgressColor(completionPercentage: number): string {
        if (completionPercentage >= 100) return '#4CAF50'; // Green - completed
        if (completionPercentage >= 50) return '#FF9800';  // Orange - halfway
        if (completionPercentage > 0) return '#2196F3';    // Blue - started
        return '#9E9E9E';                                   // Gray - not started
    }

    /**
     * Calculate completion percentage
     */
    calculateCompletionPercentage(progress: number, target: number): number {
        return target > 0 ? Math.round((progress / target) * 100) : 0;
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
}
