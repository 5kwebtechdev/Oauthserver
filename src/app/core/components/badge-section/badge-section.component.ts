import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulInputsModule } from '../mindful-inputs/mindful-inputs.module';
import { Badge, RecentAchievement } from './badge-section.interface';

@Component({
    selector: 'app-badge-section',
    templateUrl: './badge-section.component.html',
    styleUrls: ['./badge-section.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulInputsModule]
})
export class BadgeSectionComponent {
    recentAchievement: RecentAchievement = {
        id: '1',
        badgeName: 'Streak Star',
        message: 'You just earned the "Streak Star" badge! Show it off to your friends.',
        timestamp: new Date(),
        iconUrl: 'assets/app-assets/badges/first-big-win-icon.png'
    };

    badges: Badge[] = [
        {
            id: '1',
            name: 'Habit Hero',
            description: '5 more habits to earn this badge',
            iconUrl: 'assets/app-assets/badges/consistency-champion-icon.png',
            currentProgress: 8,
            targetProgress: 12,
            isLocked: false,
            progressColor: '#4CAF50'
        },
        {
            id: '2',
            name: 'Task Tackler',
            description: '2 more tasks to unlock this badge',
            iconUrl: 'assets/app-assets/badges/first-big-win-icon.png',
            currentProgress: 23,
            targetProgress: 25,
            isLocked: false,
            progressColor: '#FF9800'
        },
        {
            id: '3',
            name: 'Consistency Champ',
            description: 'Still more of the streaks, you may need',
            iconUrl: 'assets/app-assets/badges/habit-master-icon.png',
            currentProgress: 4,
            targetProgress: 12,
            isLocked: false,
            progressColor: '#2196F3'
        },
        {
            id: '4',
            name: 'Star Learner',
            description: 'Few more quizes and puzzles to get this',
            iconUrl: 'assets/app-assets/badges/comeback-star-icon.png',
            currentProgress: 2,
            targetProgress: 25,
            isLocked: false,
            progressColor: '#9C27B0'
        },
        {
            id: '5',
            name: 'Streak Star',
            description: 'Locked – Complete 7 days in a row',
            iconUrl: 'assets/app-assets/badges/habit-master-icon.png',
            currentProgress: 0,
            targetProgress: 12,
            isLocked: true,
            progressColor: '#E0E0E0'
        },
        {
            id: '6',
            name: 'Streak Star',
            description: 'Locked – Complete 7 days in a row',
            iconUrl: 'assets/app-assets/badges/habit-master-icon.png',
            currentProgress: 0,
            targetProgress: 12,
            isLocked: true,
            progressColor: '#E0E0E0'
        }
    ];

    getCompletionPercentage(badge: Badge): number {
        if (badge.isLocked || badge.targetProgress === 0) {
            return 0;
        }
        return Math.round((badge.currentProgress / badge.targetProgress) * 100);
    }

    onBackClick(): void {
        // Navigation logic to be implemented
        console.log('Back button clicked');
    }

    onShareClick(): void {
        // Share functionality to be implemented
        console.log('Share button clicked');
    }
}
