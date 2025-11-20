import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Habit } from '../habit.types';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCalendarComponent } from '../../mindful-inputs/mindful-calendar/mindful-calendar.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { NavigationContextService } from '../../../services/navigation-context.service';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,

  selector: 'habit-detail',
  templateUrl: './habit-detail.component.html',
  styleUrls: ['./habit-detail.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, MindfulCoinsStatsComponent, MindfulCalendarComponent, MindfulButtonComponent, MindfulInputsModule, MindfulBadgeComponent]
})
export class HabitDetailComponent implements OnChanges {
  public title: string = 'Habit Details';

  // true when navigated from a long-press on a card
  public cameFromLongPress: boolean = false;
  // 'habits' | 'tasks' | 'timetable' - origin type from navigation state
  public navigationOriginType: string = '';

  @Input()
  public habit: Habit | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private HabitApi: HabitApi,
    private TaskApi: TaskApi,
    private navigationContext: NavigationContextService
  ) { }

  ngOnInit() {
    // Try to get state from router's current navigation state
    const stateHabit = history.state?.['habit'];
    const habitType = history.state?.['type'] || stateHabit?.type;

    // Detect whether we arrived here via a long-press navigation
    this.cameFromLongPress = !!history.state?.['fromLongPress'];
    this.navigationOriginType = String(history.state?.['type'] || stateHabit?.type || habitType || 'habits');

    if (stateHabit) {
      this.habit = stateHabit;
      // Prepare UI fields now
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
      console.log('Loaded habit/task from navigation state:', this.habit);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      const type = this.route.snapshot.queryParamMap.get('type') || 'habits';
      if (id) {
        console.log(`Loading ${type} by id from URL:`, id);
        this.loadDetail(+id, type as 'habits' | 'tasks' | 'timetable');
      } else {
        console.warn('No habit/task data found in navigation or params');
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['habit'] && !changes['habit'].isFirstChange()) {
      // Recompute derived values when habit @Input changes
      this.prepareCoinStats();
      this.prepareMilestoneBadges();
    }
  }

  /** Fetch detail from API based on type */
  loadDetail(id: number, type: 'habits' | 'tasks' | 'timetable') {
    const api$ = type === 'tasks' ? this.TaskApi.getTaskById(id) : this.HabitApi.getHabitById(id);

    api$.pipe(
      finalize(() => {
        // Ensure any cleanup happens even if there's an error
        console.log(`Completed loading ${type} detail (success or error)`);
      })
    ).subscribe({
      next: (res) => {
        this.habit = this.normalizeResponse(res, type);
        // Setup computed display values
        this.prepareCoinStats();
        this.prepareMilestoneBadges();
        console.log(`Fetched ${type} detail:`, this.habit);
      },
      error: (err) => {
        console.error(`Error loading ${type} detail:`, err);
        // Could show error message to user here
      }
    });
  }

  /** Normalize API response to Habit type */
  private normalizeResponse(res: any, type: 'habits' | 'tasks' | 'timetable'): Habit {
    return {
      ...res,
      type,
      id: res.id?.toString() || '',
      notes: res.description || res.notes || '',
      description: res.description || res.notes || '',
      startDate: res.startDate ? new Date(res.startDate) : null,
      endDate: res.endDate ? new Date(res.endDate) : null,
      startTime: res.startTime || res.start_time || '',
      endTime: res.endTime || res.end_time || '',
      startTimeStamp: 0,
      endTimeStamp: 0,
      isPrivate: !res.sharedWithParents,
      selectedRoutine: res.routine || '',
      routineTags: [],
      everyday: res.everyday || false,
      selectedDays: res.daysOfWeek || [],
      daysOfWeek: res.daysOfWeek || [],
      priority: (res.priority?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high',
      routine: res.routine || '',
      status: (res.status?.toLowerCase() || 'pending') as 'pending' | 'ongoing' | 'completed',
      createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
      tags: res.tags || [],
      coinReward: res.rewardCoins || 0,
      rewardCoins: res.rewardCoins || 0,
      streak: res.streak || 0,
      highestStreak: res.highestStreak || 0,
      coinsEarned: res.coinsEarned || 0,
      completionPercentage: res.completionPercentage || 0,
      totalScheduledDays: res.totalScheduledDays || 0,
      totalCompletedDays: res.totalCompletedDays || 0,
      milestoneBadges: res.milestoneBadges || [],
      assignedToId: res.assignedToId,
      assignedToName: res.assignedToName,
      createdById: res.createdById,
      createdByName: res.createdByName,
      createdBy: res.createdBy || res.createdByName,
      sharedWithParents: res.sharedWithParents || false,
      completed: res.completed || false,
      familyId: res.familyId,
      updatedAt: res.updatedAt
    };
  }

  /** Legacy method for backward compatibility */
  loadHabitDetail(id: number) {
    this.loadDetail(id, 'habits');
  }

  /** Local UI fields */
  public coinStats = {
    userCoins: 0,
    userStreaks: 0,
    userDays: 0,
    userBadges: 0,
    successPercentage: 0,
    totalStreaks: 0
  };

  public badgeList: Array<any> = [];

  /** Prepare coins widget data */
  prepareCoinStats() {
    const h: any = this.habit as any;
    // Normalize numbers safely
    const coins = Number(h?.coinsEarned ?? h?.coinReward ?? 0) || 0;
    const streak = Number(h?.streak ?? 0) || 0; // current streak
    const highestStreak = Number(h?.highestStreak ?? 0) || 0;
    const totalCompletedDays = Number(h?.totalCompletedDays ?? 0) || 0; // completed days
    const completion = this.getDisplayCompletion(h?.completionPercentage ?? 0);
    const badgesEarned = (h?.milestoneBadges || []).filter((b: any) => !!b.isEarned).length;

    this.coinStats = {
      userCoins: coins,
      userStreaks: totalCompletedDays, // using completed days for the trophy slot
      userDays: streak,
      userBadges: badgesEarned,
      successPercentage: completion,
      totalStreaks: highestStreak,
    };
  }

  /** Convert completion value to a 0-100 percentage for display */
  getDisplayCompletion(value: number) {
    if (value === undefined || value === null) return 0;
    const num = Number(value) || 0;
    // If backend uses 0..1 decimal or 0..100, deal with both
    if (num <= 1) return Math.round(num * 100);
    return Math.round(num);
  }

  /** Badge helpers */
  private BADGE_ICON_MAP: Record<string, string> = {
    'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
    'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png',
    'Habit Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
    'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png'
  };

  getBadgeIcon(title: string) {
    return this.BADGE_ICON_MAP[title] || ('assets/Icons-Neutral/Icon-Badge-CoinCollector.png');
  }

  private getBadgeColor(completionPercentage: number): string {
    // Keep consistent with BadgeSection's getProgressColor implementation
    if (completionPercentage >= 100) return '#4CAF50'; // Green - completed
    if (completionPercentage >= 50) return '#FF9800';  // Orange - halfway
    if (completionPercentage > 0) return '#2196F3';    // Blue - started
    return '#9E9E9E';                                   // Gray - not started
  }

  prepareMilestoneBadges() {
    const h: any = this.habit as any;
    this.badgeList = (h?.milestoneBadges || []).map((b: any) => {
      const progress = Number(b?.progress ?? 0) || 0;
      const target = Number(b?.target ?? 0) || 0;
      const percent = target > 0 ? Math.round((progress / target) * 100) : 0;
      return {
        name: b.title || b.name || 'Badge',
        description: b.description || b.achievementText || '',
        currentProgress: progress,
        targetProgress: target,
        progressText: `${progress}/${target}`,
        completionPercent: Math.min(percent, 100),
        isEarned: !!b?.isEarned,
        levelText: b?.levelText || '',
        progressColor: this.getBadgeColor(percent),
        iconUrl: this.getBadgeIcon(b.title || b.name || ''),
      };
    });
  }

  get speechMessage(): string {
    const desc = (this.habit as any)?.description ?? (this.habit as any)?.notes ?? '';
    // Return the raw description (no prefixed text), trimmed for display safety
    return desc ? String(desc).trim() : '';
  }

  get shortDaysOfWeek(): string {
    const rawDays = this.habit?.daysOfWeek || [];

    // 1️⃣ If everyday flag true OR 7 days present
    if (this.habit?.everyday || rawDays.length === 7) {
      return 'Everyday';
    }

    // 2️⃣ No special weekend flag — rely on daysOfWeek or everyday

    // 3️⃣ Normalize and format the days in canonical Mon..Sun order
    const canonicalOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const abbrMap: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun'
    };

    const normalized = rawDays.map((d: string) => String(d).trim().toUpperCase());
    const filtered = canonicalOrder.filter((c) => normalized.includes(c));
    if (filtered.length > 0) {
      return filtered.map((d) => abbrMap[d] || d.substring(0, 3)).join(', ');
    }

    // 4️⃣ Fallback if no data
    return '—';
  }

  onEdit() {
    // Store the current route context before navigating
    this.navigationContext.pushContext('/authed/habit-detail', { habit: this.habit });

    // Navigate to the habit-input page and pass the current habit/task in navigation state
    if (this.habit) {
      this.router.navigate(['/authed/habit-input'], {
        state: {
          habit: this.habit,
          type: this.habit.type
        }
      });
    } else {
      console.log('Edit action triggered but no habit/task is loaded');
      this.router.navigate(['/authed/habit-input']);
    }
  }

  //routine handler
  getRoutineIcon(): string {
    try {
      const routineValue = this.habit?.routine;
      if (!routineValue) {
        return 'assets/Icons-Neutral/Icon-Routine-Morning.png';
      }

      // Convert to proper case for filename
      const routine = String(routineValue).toLowerCase();
      const capitalizedRoutine = routine.charAt(0).toUpperCase() + routine.slice(1);
      const fileName = `Icon-Routine-${capitalizedRoutine}.png`;

      return `assets/Icons-Neutral/${fileName}`;
    } catch (e) {
      console.error('Error getting routine icon:', e);
      return 'assets/Icons-Neutral/Icon-Routine-Morning.png';
    }
  }


  getRoutineName(): string {
    const routineValue = this.habit?.routine;
    if (!routineValue) return 'Morning';

    const routine = String(routineValue).toLowerCase();
    return routine.charAt(0).toUpperCase() + routine.slice(1);
  }
}
