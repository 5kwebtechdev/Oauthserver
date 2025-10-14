export interface Badge {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    currentProgress: number;
    targetProgress: number;
    isLocked: boolean;
    progressColor?: string;
}

export interface RecentAchievement {
    id: string;
    badgeName: string;
    message: string;
    timestamp: Date;
    iconUrl: string;
}
