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
