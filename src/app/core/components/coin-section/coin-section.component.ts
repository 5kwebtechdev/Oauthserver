import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { FooterComponent } from '../footer/footer.component';
import { SupermeSpeechBubbleComponent } from '../superme-speech-bubble/superme-speech-bubble.component';
import { SupermePetComponent } from '../superme-pet/superme-pet.component';
import { CoinService, CoinHistoryItem } from '../../services/coin.service';
import { AuthService } from '../../services/auth.service';
import { RefreshService } from '../../services/refresh.service';

interface CoinItem {
    id: number;
    thumbnailUrl: string;
    label: string;
    typeLabel: string;
    count: number;
    date: Date;
    type: string;
    description: string;
}

interface DayGroup {
    dateLabel: string;
    isToday: boolean;
    items: CoinItem[];
}

@Component({
    selector: 'app-coin-section',
    standalone: true,
    imports: [CommonModule, IonicModule, RouterModule, SupermeButtonComponent, FooterComponent, SupermeSpeechBubbleComponent, SupermePetComponent],
    templateUrl: './coin-section.component.html',
    styleUrls: ['./coin-section.component.scss']
})
export class CoinSectionComponent implements OnInit, OnDestroy, ViewWillEnter {
    coinTotal: number = 0;
    coinAnimDone: boolean = false;
    showTargetDigits: boolean = false;
    message = "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!";
    coinItems: CoinItem[] = [];
    isLoading = false;
    isParent: boolean = false;

    readonly digitRange = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    private animTimers: any[] = [];

    get coinDigits(): number[] {
        return String(this.coinTotal || 0).split('').map(Number);
    }

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
        this.clearAnimTimers();
    }

    fetchHistory() {
        this.isLoading = true;
        this.showTargetDigits = false;
        this.coinAnimDone = false;
        this.clearAnimTimers();
        this.coinService.loadCoinHistory().subscribe({
            next: (response) => {
                if (response?.totalCoins != null) {
                    this.coinTotal = response.totalCoins;
                } else if (response?.history) {
                    this.coinTotal = response.history.reduce((s: number, i: CoinHistoryItem) => s + i.amount, 0);
                }
                this.coinItems = response?.history ? this.mapHistoryToCoinItems(response.history) : [];
                this.isLoading = false;
                this.startRollerAnimation();
            },
            error: () => {
                this.isLoading = false;
            }
        });
    }

    private startRollerAnimation(): void {
        this.showTargetDigits = false;
        this.coinAnimDone = false;
        this.clearAnimTimers();
        this.animTimers.push(setTimeout(() => this.showTargetDigits = true, 100));
        const staggerTotal = this.coinDigits.length * 80;
        this.animTimers.push(setTimeout(() => this.coinAnimDone = true, 100 + 1000 + staggerTotal));
    }

    private clearAnimTimers(): void {
        this.animTimers.forEach(t => clearTimeout(t));
        this.animTimers = [];
    }

    private mapHistoryToCoinItems(history: CoinHistoryItem[]): CoinItem[] {
        return history.map(item => ({
            id: item.id,
            thumbnailUrl: (item.thumbnailUrl || '').trim(),
            label: this.getLabelForItem(item),
            typeLabel: this.getTypeLabel(item.type),
            count: item.amount,
            date: new Date(item.timestamp),
            type: item.type,
            description: item.description
        }));
    }

    // ── Grouping ──────────────────────────────────────────────────────────────

    get groupedCoinItems(): DayGroup[] {
        const sorted = [...this.coinItems].sort((a, b) => b.date.getTime() - a.date.getTime());
        const groups = new Map<string, CoinItem[]>();

        for (const item of sorted) {
            const key = this.getDayKey(item.date);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }

        const today = this.getDayKey(new Date());

        return Array.from(groups.entries()).map(([key, items]) => {
            // DAILY_LOGIN_BONUS always first within a day
            const bonus = items.filter(i => i.type === 'DAILY_LOGIN_BONUS');
            const rest = items.filter(i => i.type !== 'DAILY_LOGIN_BONUS');
            return {
                dateLabel: this.formatDateLabel(items[0].date),
                isToday: key === today,
                items: [...bonus, ...rest]
            };
        });
    }

    private getDayKey(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth()).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }

    private formatDateLabel(date: Date): string {
        const now = new Date();
        const today    = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (d.getTime() === today.getTime())     return 'Today';
        if (d.getTime() === yesterday.getTime()) return 'Yesterday';
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    // ── Type helpers ──────────────────────────────────────────────────────────

    getTypeIcon(type: string): string {
        switch (type) {
            case 'DAILY_LOGIN_BONUS':       return 'assets/Icons-Neutral/Icons-Coins.png';
            case 'HABIT_COMPLETION':        return 'assets/Icons-Neutral/Icon-Streak.png';
            case 'TASK_COMPLETION':         return 'assets/Icons-Neutral/Icon-Calendar.png';
            case 'LESSON_COMPLETED':        return 'assets/Icons-Neutral/Icon-Content-Articles.png';
            case 'COURSE_COMPLETED':        return 'assets/Icons-Neutral/Icons-Coins.png';
            case 'ARTICLE_READ':            return 'assets/Icons-Neutral/Icon-Content-Articles.png';
            case 'CHALLENGE_BATCH_REWARD':  return 'assets/Icons-Neutral/Icons-Coins.png';
            case 'STREAK_7DAY_BONUS':       return 'assets/Icons-Neutral/Icon-Streak.png';
            case 'STREAK_RESTORE':          return 'assets/Icons-Neutral/Icon-Streak.png';
            default:                        return 'assets/Icons-Neutral/Icons-Coins.png';
        }
    }

    getTypeBg(type: string): string {
        switch (type) {
            case 'DAILY_LOGIN_BONUS':       return '#FFF3CD';
            case 'HABIT_COMPLETION':        return '#E8F5E9';
            case 'TASK_COMPLETION':         return '#E3F2FD';
            case 'LESSON_COMPLETED':        return '#F3E5F5';
            case 'COURSE_COMPLETED':        return '#FFF8E1';
            case 'ARTICLE_READ':            return '#E8EAF6';
            case 'CHALLENGE_BATCH_REWARD':  return '#FCE4EC';
            case 'REFERRAL_BONUS':          return '#E0F7FA';
            case 'STREAK_7DAY_BONUS':       return '#FFF3E0';
            case 'STREAK_RESTORE':          return '#EDE7F6';
            default:                        return '#F5F5F5';
        }
    }

    private getTypeLabel(type: string): string {
        switch (type) {
            case 'DAILY_LOGIN_BONUS':       return 'Daily Bonus';
            case 'HABIT_COMPLETION':        return 'Habit';
            case 'TASK_COMPLETION':         return 'Task';
            case 'LESSON_COMPLETED':        return 'Lesson';
            case 'COURSE_COMPLETED':        return 'Course';
            case 'ARTICLE_READ':            return 'Article';
            case 'CHALLENGE_BATCH_REWARD':  return 'Challenge';
            case 'REFERRAL_BONUS':          return 'Referral';
            case 'STREAK_7DAY_BONUS':       return 'Streak Bonus';
            case 'STREAK_RESTORE':          return 'Streak Restore';
            default:                        return 'Reward';
        }
    }

    private getLabelForItem(item: CoinHistoryItem): string {
        switch (item.type) {
            case 'DAILY_LOGIN_BONUS':      return 'Daily Login Bonus';
            case 'STREAK_7DAY_BONUS':      return '7 Day Streak Bonus';
            case 'REFERRAL_BONUS':         return 'Referral Bonus';
            case 'STREAK_RESTORE': {
                if ((item as any).restoredItemName) return `Restored: ${(item as any).restoredItemName}`;
                return 'Streak Restored';
            }
            case 'HABIT_COMPLETION': {
                if ((item as any).habit?.title) return (item as any).habit.title;
                return 'Habit Completed';
            }
            case 'TASK_COMPLETION': {
                if ((item as any).task?.title) return (item as any).task.title;
                return 'Task Completed';
            }
            case 'LESSON_COMPLETED': {
                const m = item.description?.match(/completed lesson:\s*(.+)/i);
                return m ? m[1] : (item.description || 'Lesson Completed');
            }
            case 'COURSE_COMPLETED': {
                const m = item.description?.match(/completed course:\s*(.+)/i);
                return m ? m[1] : (item.description || 'Course Completed');
            }
            case 'ARTICLE_READ': {
                return this.formatCoinDescription(item.description) || 'Article Read';
            }
            case 'CHALLENGE_BATCH_REWARD': {
                return item.description || 'Challenge Reward';
            }
            default:
                return this.formatCoinDescription(item.description) || 'Coin Earned';
        }
    }

    private formatCoinDescription(description?: string | null): string {
        const value = (description || '').trim();
        if (!value) return '';
        return value
            .replace(/^coins\s+earned\s+for\s+reading\s*:?\s*/i, '')
            .trim();
    }

    onThumbError(item: CoinItem): void {
        item.thumbnailUrl = '';
    }

    getInitial(label: string): string {
        return (label || '?').trim().charAt(0).toUpperCase();
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    onRedeem() {
        this.router.navigate(['/authed', 'coin-purchase']);
    }
}
