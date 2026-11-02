import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CoinApi } from '../api/coin.api';

// ========== INTERFACES ==========

export interface CoinHistoryItem {
    id: number;
    amount: number;
    type: string;
    description: string;
    timestamp: string;
    habit?: any | null;
    task?: any | null;
    habitId?: number | null;
    taskId?: number | null;
    articleId?: number | null;
    lessonId?: number | null;
    courseId?: number | null;
    challengeId?: number | null;
    thumbnailUrl?: string | null;
    contentType?: string;
}

export interface CoinHistory {
    size?: number;
    page?: number;
    hasNext?: boolean;
    totalPages?: number;
    totalCoins: number;
    totalElements?: number;
    history: CoinHistoryItem[];
    status?: number;
}

export interface CoinItem {
    id: number;
    icon: string;
    label: string;
    count: number;
    date: Date;
    type: string;
    description: string;
    contentType: string;
}

// ========== SERVICE ==========

@Injectable({ providedIn: 'root' })
export class CoinService {
    private coinHistorySubject = new BehaviorSubject<CoinHistoryItem[]>([]);
    public coinHistory$ = this.coinHistorySubject.asObservable();

    private totalCoinsSubject = new BehaviorSubject<number>(0);
    public totalCoins$ = this.totalCoinsSubject.asObservable();

    constructor(private coinApi: CoinApi) { }

    /**
     * Load coin history from API
     */
    loadCoinHistory(): Observable<any> {
        return this.coinApi.getCoinHistory().pipe(
            tap(response => {
                if (response) {
                    this.coinHistorySubject.next(response.history || []);
                    // Use totalCoins from API response
                    this.totalCoinsSubject.next(response.totalCoins || 0);
                }
            }),
            catchError(error => {
                console.error('Error fetching coin history:', error);
                this.coinHistorySubject.next([]);
                this.totalCoinsSubject.next(0);
                return of({ totalCoins: 0, history: [], status: 0 });
            })
        );
    }

    /**
     * Get current coin history
     */
    getCoinHistory(): CoinHistoryItem[] {
        return this.coinHistorySubject.value;
    }

    /**
     * Get total coins
     */
    getTotalCoins(): number {
        return this.totalCoinsSubject.value;
    }

    /**
     * Map history items to display format
     */
    mapHistoryToCoinItems(history: CoinHistoryItem[]): CoinItem[] {
        return (history || []).map(item => ({
            id: item.id,
            icon: item.thumbnailUrl || this.getIconForType(item.type, item.habit, item.task, item.description),
            label: this.getLabelForItem(item),
            count: item.amount,
            date: new Date(item.timestamp),
            type: item.type,
            description: item.description,
            contentType: this.resolveContentType(item)
        }));
    }

    /**
     * Resolve a human-readable content type label from the history item.
     * Prefers item.contentType from the API, then falls back to type/description.
     */
    private resolveContentType(item: CoinHistoryItem): string {
        if (item.contentType) return item.contentType;
        const t = (item.type || '').toUpperCase();
        const desc = (item.description || '').toLowerCase();
        if (t.includes('QUIZ')    || desc.includes('quiz'))    return 'Quiz';
        if (t.includes('PUZZLE')  || desc.includes('puzzle'))  return 'Puzzle';
        if (t.includes('ARTICLE') || desc.includes('article')) return 'Article';
        if (t.includes('JOURNAL') || desc.includes('journal')) return 'Journal';
        if (t.includes('LESSON')  || desc.includes('lesson'))  return 'Lesson';
        if (t.includes('CHALLENGE')|| desc.includes('challenge')) return 'Challenge';
        if (t.includes('LOGIN')   || desc.includes('login'))   return 'Daily Bonus';
        if (t.includes('HINT')    || desc.includes('hint') || desc.includes('spent')) return 'Hint';
        if (t.includes('ACADEMY') || desc.includes('academy')) return 'Academy';
        if (t.includes('LEARNING')|| desc.includes('learn'))   return 'Learning';
        if (t.includes('HABIT')   || desc.includes('habit'))   return 'Habit';
        if (t.includes('TASK')    || desc.includes('task'))    return 'Task';
        if (t.includes('STREAK')  || desc.includes('streak'))  return 'Streak';
        return 'Coins';
    }

    /**
     * Get icon based on type
     */
    private getIconForType(type: string, habit: any, task: any, description?: string): string {
        if (type === 'HABIT_COMPLETION' && habit?.tags?.length > 0) {
            return this.getTagIcon(habit.tags[0]);
        }
        if (type === 'TASK_COMPLETION' && task?.tags?.length > 0) {
            return this.getTagIcon(task.tags[0]);
        }

        const t = (type || '').toUpperCase();
        const desc = (description || '').toLowerCase();

        // Explicit type matches
        if (t.includes('QUIZ'))    return '/assets/Icons-Neutral/Icon-Content-Quiz.png';
        if (t.includes('PUZZLE'))  return '/assets/Icons-Neutral/Icon-Content-Puzzle.png';
        if (t.includes('ARTICLE')) return '/assets/Icons-Neutral/Icon-Content-Articles.png';
        if (t.includes('CHALLENGE')) return '/assets/Icons-Neutral/Icon-Content-Quiz.png';
        if (t.includes('LOGIN'))   return '/assets/Images-Transparent/Image-Coins-Log.png';
        if (t.includes('HINT'))    return '/assets/Icons-Neutral/Icons-Coins.png';
        if (t.includes('JOURNAL')) return '/assets/Icons-Neutral/Icon-Notes.png';
        if (t.includes('LESSON') || t.includes('ACADEMY') || t.includes('LEARNING'))
                                   return '/assets/Icons-Neutral/Icons-Coins-Learning.png';
        if (t.includes('HABIT'))   return '/assets/Icons-Neutral/Icon-Streak.png';
        if (t.includes('TASK'))    return '/assets/Icons-Neutral/Icon-Calendar.png';
        if (t.includes('STREAK'))  return '/assets/Icons-Neutral/Icon-Streak.png';
        if (t.includes('TROPHY'))  return '/assets/Icons-Neutral/Icon-Trophy.png';
        if (t.includes('BADGE'))   return '/assets/Icons-Neutral/Icon-Badge.png';

        // Fallback: infer from description keywords
        if (desc.includes('quiz'))    return '/assets/Icons-Neutral/Icon-Content-Quiz.png';
        if (desc.includes('puzzle'))  return '/assets/Icons-Neutral/Icon-Content-Puzzle.png';
        if (desc.includes('article')) return '/assets/Icons-Neutral/Icon-Content-Articles.png';
        if (desc.includes('journal')) return '/assets/Icons-Neutral/Icon-Notes.png';
        if (desc.includes('lesson') || desc.includes('academy') || desc.includes('learn'))
                                      return '/assets/Icons-Neutral/Icons-Coins-Learning.png';
        if (desc.includes('habit'))   return '/assets/Icons-Neutral/Icon-Streak.png';
        if (desc.includes('task'))    return '/assets/Icons-Neutral/Icon-Calendar.png';
        if (desc.includes('streak'))  return '/assets/Icons-Neutral/Icon-Streak.png';

        return '/assets/Icons-Neutral/Icons-Coins.png';
    }

    /**
     * Get tag icon mapping
     */
    private getTagIcon(tag: string): string {
        const tagIconMap: { [key: string]: string } = {
            'Reading':  '/assets/Icons-Neutral/Icon-Content-Articles.png',
            'Running':  '/assets/Icons-Neutral/Icon-Streak.png',
            'Exercise': '/assets/Icons-Neutral/Icon-Streak.png',
            'Skill':    '/assets/Icons-Neutral/Icon-Trophy.png',
        };
        return tagIconMap[tag] || '/assets/Icons-Neutral/Icons-Coins.png';
    }

    /**
     * Get label for item
     */
    private getLabelForItem(item: CoinHistoryItem): string {
        if (item.habit) return item.habit.title || 'Habit Completed';
        if (item.task)  return item.task.title  || 'Task Completed';
        if (item.description) return item.description;

        const t = (item.type || '').toUpperCase();
        if (t === 'DAILY_LOGIN_BONUS') return 'Daily login bonus';
        if (t === 'CHALLENGE_BATCH_REWARD') return 'Challenge reward';
        if (t === 'HINT_USED') return 'Spent coins';
        if (t.includes('QUIZ'))    return 'Quiz Completed';
        if (t.includes('PUZZLE'))  return 'Puzzle Completed';
        if (t.includes('ARTICLE')) return 'Article Read';
        if (t.includes('JOURNAL')) return 'Journal Entry';
        if (t.includes('LESSON'))  return 'Lesson Completed';
        if (t.includes('ACADEMY')) return 'Academy Lesson Completed';
        if (t.includes('LEARNING')) return 'Learning Completed';
        if (t === 'STREAK_7DAY_BONUS') return '7 Day Streak Bonus';
        if (t.includes('STREAK'))  return 'Streak Bonus';
        if (t.includes('TROPHY'))  return 'Trophy Earned';
        if (t.includes('BADGE'))   return 'Badge Earned';

        return item.description || 'Coin Earned';
    }
}
