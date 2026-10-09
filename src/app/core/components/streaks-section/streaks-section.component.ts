import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CurrentUserStreak, StreaksService } from '../../services/streaks.service';
import { StreakCalendarResponse, StreakMilestone, StreakRestoreApi, StreakStatus } from '../../api/streak-restore.api';
import { STREAK_MILESTONES } from '../streak-milestone/streak-milestones';

type DayState = 'streak' | 'restored' | 'missed' | 'unknown';
interface CalendarDay {
  date: number;
  key: string;
  outside: boolean;
  today: boolean;
  future: boolean;
  state: DayState;
}

function calendarDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setFullYear(year, monthIndex, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function currentIndiaMonth(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric'
  }).formatToParts(new Date());
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  return calendarDate(year, month - 1, 1);
}

function currentIndiaDateKey(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

@Component({
  selector: 'app-streaks-section',
  templateUrl: './streaks-section.component.html',
  styleUrls: ['./streaks-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class StreaksSectionComponent implements OnInit, OnDestroy, ViewWillEnter {
  currentUser: CurrentUserStreak | null = null;
  status: StreakStatus | null = null;
  milestones: StreakMilestone[] = STREAK_MILESTONES.map(({ days, coins }) => ({ days, coins }));
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  displayedMonth = currentIndiaMonth();
  calendarDays: CalendarDay[] = [];
  calendarLoading = false;
  calendarError = false;
  private loadedOnce = false;
  private statusRequest?: Subscription;
  private calendarRequest?: Subscription;

  constructor(
    private streaksService: StreaksService,
    private streakRestoreApi: StreakRestoreApi,
    private authService: AuthService,
    private location: Location
  ) {
    this.buildCalendar();
  }

  ngOnInit(): void { this.loadData(); }
  ionViewWillEnter(): void {
    if (this.loadedOnce) this.loadData();
    this.loadedOnce = true;
  }
  ngOnDestroy(): void {
    this.statusRequest?.unsubscribe();
    this.calendarRequest?.unsubscribe();
  }

  get currentDays(): number {
    return Math.max(0, this.status?.currentStreak ?? this.currentUser?.currentStreak ?? 0);
  }

  get bestDays(): number {
    return Math.max(0, this.status?.highestStreak ?? this.currentUser?.highestStreak ?? 0);
  }

  get totalActiveDays(): number {
    return Math.max(0, this.currentUser?.totalActiveDays ?? 0);
  }

  get nextMilestone(): { days: number; coins: number } | null {
    const fromSchedule = this.milestones.find(item => !this.isMilestoneClaimed(item));
    if (this.status?.nextMilestoneDay && this.status.nextMilestoneDay > this.currentDays) {
      return {
        days: this.status.nextMilestoneDay,
        coins: this.status.nextMilestoneCoins ?? fromSchedule?.coins ?? 0
      };
    }
    return fromSchedule ? { days: fromSchedule.days, coins: fromSchedule.coins } : null;
  }

  isMilestoneClaimed(item: StreakMilestone): boolean {
    return item.claimed ?? this.currentDays >= item.days;
  }

  get milestoneStart(): number {
    const next = this.nextMilestone;
    if (!next) return 0;
    const previous = this.milestones.filter(item => item.days < next.days);
    return previous.length ? previous[previous.length - 1].days : 0;
  }

  get milestoneProgress(): number {
    const next = this.nextMilestone;
    if (!next) return 100;
    const span = Math.max(1, next.days - this.milestoneStart);
    return Math.min(100, Math.max(0, ((this.currentDays - this.milestoneStart) / span) * 100));
  }

  get monthLabel(): string {
    return this.displayedMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  get canGoForward(): boolean {
    const now = currentIndiaMonth();
    return this.displayedMonth.getFullYear() < now.getFullYear() ||
      (this.displayedMonth.getFullYear() === now.getFullYear() && this.displayedMonth.getMonth() < now.getMonth());
  }

  goBack(): void { this.location.back(); }
  retryCalendar(): void { this.loadCalendar(); }

  changeMonth(offset: number): void {
    if (offset > 0 && !this.canGoForward) return;
    if (offset < 0 && this.displayedMonth.getFullYear() === 1 && this.displayedMonth.getMonth() === 0) return;
    this.displayedMonth = calendarDate(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + offset, 1);
    this.loadCalendar();
  }

  private loadData(): void {
    this.streaksService.getLeaderboard(0, 1).subscribe({
      next: response => { this.currentUser = response.currentUser; },
      error: error => { console.error('Error fetching streak totals:', error); }
    });

    const userId = Number(this.authService.getUserId());
    if (Number.isSafeInteger(userId) && userId > 0) {
      this.statusRequest?.unsubscribe();
      this.statusRequest = this.streakRestoreApi.getStreakStatus(userId).subscribe({
        next: status => {
          this.status = status;
          const backendMilestones = status.milestones?.filter(item =>
            Number.isFinite(item.days) && item.days > 0 && Number.isFinite(item.coins) && item.coins >= 0
          );
          this.milestones = backendMilestones?.length
            ? [...backendMilestones].sort((a, b) => a.days - b.days)
            : STREAK_MILESTONES.map(({ days, coins }) => ({ days, coins }));
          this.loadCalendar();
        },
        error: error => {
          console.error('Error fetching streak status:', error);
          this.loadCalendar();
        }
      });
    } else {
      this.loadCalendar();
    }
  }

  private loadCalendar(): void {
    this.calendarRequest?.unsubscribe();
    const year = this.displayedMonth.getFullYear();
    const month = this.displayedMonth.getMonth() + 1;
    this.calendarLoading = true;
    this.calendarError = false;
    this.buildCalendar();
    this.calendarRequest = this.streakRestoreApi.getStreakCalendar(year, month).subscribe({
      next: response => {
        if (response.year !== year || response.month !== month || !Array.isArray(response.days)) {
          this.calendarError = true;
          this.calendarLoading = false;
          return;
        }
        this.buildCalendar(response);
        this.calendarLoading = false;
      },
      error: error => {
        console.error('Error fetching streak calendar:', error);
        this.calendarError = true;
        this.calendarLoading = false;
      }
    });
  }

  private buildCalendar(response?: StreakCalendarResponse): void {
    const year = this.displayedMonth.getFullYear();
    const month = this.displayedMonth.getMonth();
    const firstWeekday = calendarDate(year, month, 1).getDay();
    const numberOfDays = calendarDate(year, month + 1, 0).getDate();
    const slots = Math.ceil((firstWeekday + numberOfDays) / 7) * 7;
    const todayKey = currentIndiaDateKey();
    const knownDays = new Map<string, DayState>();
    for (const day of response?.days ?? []) {
      const key = this.dateKey(day.date);
      if (!key) continue;
      const state: DayState = day.status === 'STREAK' ? 'streak'
        : day.status === 'RESTORED' ? 'restored'
        : day.status === 'MISSED' ? 'missed' : 'unknown';
      knownDays.set(key, state);
    }
    this.calendarDays = Array.from({ length: slots }, (_, index) => {
      const actual = calendarDate(year, month, index - firstWeekday + 1);
      const key = this.dateKey(actual);
      const future = key > todayKey;
      return {
        date: actual.getDate(),
        key,
        outside: actual.getMonth() !== month,
        today: key === todayKey,
        future,
        state: future ? 'unknown' : knownDays.get(key) ?? 'unknown'
      };
    });
  }

  private dateKey(value: string | Date): string {
    if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? '';
    const year = String(value.getFullYear()).padStart(4, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
