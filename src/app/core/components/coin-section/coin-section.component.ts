import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { FooterComponent } from '../footer/footer.component';
import { MindfulSpeechBubbleComponent } from '../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../mindful-pet/mindful-pet.component';
import { CoinService, CoinHistoryItem } from '../../services/coin.service';
import { AuthService } from '../../services/auth.service';
import { RefreshService } from '../../services/refresh.service';

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
export class CoinSectionComponent implements OnInit, OnDestroy, ViewWillEnter {
    coinTotal: number = 0;
    message = "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!";
    coinItems: CoinItem[] = [];
    isLoading = false;
    isParent: boolean = false;

    constructor(
        private router: Router,
        private coinService: CoinService,
        private authService: AuthService,
        private refreshService: RefreshService
    ) {}

    ngOnInit() {
        this.isParent = this.authService.isParentUser();
        this.refreshService.registerRefreshHandler('CoinSectionComponent', async () => { this.fetchHistory(); });
    }

    ionViewWillEnter() {
        this.fetchHistory();
    }

    ngOnDestroy() {
        this.refreshService.unregisterRefreshHandler('CoinSectionComponent');
    }

    fetchHistory() {
        this.isLoading = true;
        this.coinService.loadCoinHistory().subscribe({
            next: (response) => {
                if (response?.totalCoins != null) {
                    this.coinTotal = response.totalCoins;
                } else if (response?.history) {
                    this.coinTotal = response.history.reduce((s: number, i: CoinHistoryItem) => s + i.amount, 0);
                }
                this.coinItems = response?.history ? this.mapHistoryToCoinItems(response.history) : [];
                this.isLoading = false;
            },
            error: () => {
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
        return [...this.coinItems].sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    private getIconForType(type: string, habit: any, task: any): string {
        if (type === 'HABIT_COMPLETION' && habit?.tags?.length > 0) return this.getTagIcon(habit.tags[0]);
        if (type === 'TASK_COMPLETION' && task?.tags?.length > 0) return this.getTagIcon(task.tags[0]);
        switch (type) {
            case 'HABIT_COMPLETION': return '/assets/Icons-Neutral/Icon-Streak.png';
            case 'TASK_COMPLETION': return '/assets/Icons-Neutral/Icon-Calendar.png';
            case 'STREAK_7DAY_BONUS': return '/assets/Icons-Neutral/Icon-Streak.png';
            default: return '/assets/Icons-Neutral/Icons-Coins.png';
        }
    }

    private getTagIcon(tag: string): string {
        const map: { [key: string]: string } = {
            'Reading': '/assets/Icons-Neutral/Icon-Content-Articles.png',
            'Running': '/assets/Icons-Neutral/Icon-Streak.png',
            'Exercise': '/assets/Icons-Neutral/Icon-Streak.png',
            'Skill': '/assets/Icons-Neutral/Icon-Trophy.png',
        };
        return map[tag] || '/assets/Icons-Neutral/Icons-Coins.png';
    }

    private getLabelForItem(item: CoinHistoryItem): string {
        if (item.habit) return item.habit.title || 'Habit Completed';
        if (item.task) return item.task.title || 'Task Completed';
        if (item.type === 'STREAK_7DAY_BONUS') return '7 Day Streak Bonus';
        return item.description || 'Coin Earned';
    }

    onRedeem() {
        this.router.navigate(['/authed', 'coin-purchase']);
    }
}
