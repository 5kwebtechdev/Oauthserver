import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { FooterComponent } from '../footer/footer.component';
import { MindfulSpeechBubbleComponent } from '../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../mindful-pet/mindful-pet.component';
import { CoinService, CoinHistoryItem } from '../../services/coin.service';
import { AuthService } from '../../services/auth.service';

interface CoinItem {
    id: number;
    icon: string;
    label: string;
    count: number;
    date: Date;
    type: string;
    description: string;
}

@Component({
    selector: 'app-coin-section',
    standalone: true,
    imports: [CommonModule, IonicModule, RouterModule, MindfulButtonComponent, FooterComponent, MindfulSpeechBubbleComponent, MindfulPetComponent],
    templateUrl: './coin-section.component.html',
    styleUrls: ['./coin-section.component.scss']
})
export class CoinSectionComponent implements OnInit {
    coinTotal: number = 0;
    message = "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!";
    coinItems: CoinItem[] = [];
    isLoading = false;
    isParent: boolean = false;

    constructor(
        private router: Router,
        private coinService: CoinService
        , private authService: AuthService
    ) {
    }

    ngOnInit() {
        this.isParent = this.authService.isParentUser();
        
        // Subscribe to total coins updates
        this.coinService.totalCoins$.subscribe(total => {
            this.coinTotal = total;
        });
        
        // If coin history is not loaded yet, load it
        if (this.coinService.getCoinHistory().length === 0) {
            this.loadCoinHistory();
        } else {
            // Use cached total
            this.coinTotal = this.coinService.getTotalCoins();
        }
    }

    loadCoinHistory() {
        this.isLoading = true;
        this.coinService.loadCoinHistory().subscribe({
            next: (response) => {
                if (response) {
                    // Prefer server-provided totalCoins if available, otherwise compute from history
                    if (response.totalCoins !== undefined && response.totalCoins !== null) {
                        this.coinTotal = response.totalCoins;
                    } else if (response.history) {
                        this.coinTotal = response.history.reduce((sum: number, item: CoinHistoryItem) => sum + item.amount, 0);
                    }

                    if (response.history) {
                        this.coinItems = this.mapHistoryToCoinItems(response.history);
                    }
                }
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading coin history:', error);
                this.isLoading = false;
            }
        });
    }

    private mapHistoryToCoinItems(history: CoinHistoryItem[]): CoinItem[] {
        return history.map(item => ({
            id: item.id,
            icon: this.getIconForType(item.type, item.habit, item.task),
            label: this.getLabelForItem(item),
            count: item.amount,
            date: new Date(item.timestamp),
            type: item.type,
            description: item.description
        }));
    }

    get sortedCoinItems(): CoinItem[] {
        const items = [...this.coinItems];
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        return items;
    }

    private getIconForType(type: string, habit: any, task: any): string {
        // Use habit or task icon if available, otherwise use default based on type
        if (type === 'HABIT_COMPLETION' && habit?.tags?.length > 0) {
            return this.getTagIcon(habit.tags[0]);
        }
        if (type === 'TASK_COMPLETION' && task?.tags?.length > 0) {
            return this.getTagIcon(task.tags[0]);
        }

        // Default icons based on type
        switch (type) {
            case 'HABIT_COMPLETION':
                return '/assets/Icons-Neutral/Icon-Habit.png';
            case 'TASK_COMPLETION':
                return '/assets/Icons-Neutral/Icon-Task.png';
            case 'STREAK_7DAY_BONUS':
                return '/assets/Icons-Neutral/Icon-Streak.png';
            default:
                return '/assets/app-assets/Panda Sitting Tired.svg';
        }
    }

    private getTagIcon(tag: string): string {
        // Map tags to icons - adjust paths as needed
        const tagIconMap: { [key: string]: string } = {
            'Reading': '/assets/Icons-Neutral/Icon-Reading.png',
            'Running': '/assets/Icons-Neutral/Icon-Running.png',
            'Exercise': '/assets/Icons-Neutral/Icon-Exercise.png',
            'Skill': '/assets/Icons-Neutral/Icon-Skill.png',
        };
        return tagIconMap[tag] || '/assets/app-assets/Panda Sitting Tired.svg';
    }

    private getLabelForItem(item: CoinHistoryItem): string {
        if (item.habit) {
            return item.habit.title || 'Habit Completed';
        }
        if (item.task) {
            return item.task.title || 'Task Completed';
        }
        if (item.type === 'STREAK_7DAY_BONUS') {
            return '7 Day Streak Bonus';
        }
        return item.description || 'Coin Earned';
    }

    onRedeem() {
        this.router.navigate(['/authed', 'coin-purchase']);
    }
}
