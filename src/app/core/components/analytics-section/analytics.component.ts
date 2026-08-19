import { CommonModule, Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ParentAnalyticsService, InsightsResponseDto } from '../../services/parent-analytics.service';
import { ProfileStoreService } from '../../services/profile-store.service';
import { ChildInfo } from '../../models/child-info.model';
import { FooterComponent } from '../footer/footer.component';
import { environment } from '../../../../environments/environment';

type InsightsContextKind = 'child' | 'self' | 'unavailable';
type MetricTone = 'habit' | 'task' | 'knowledge' | 'journal' | 'achievement';

interface InsightsContext {
  key: string;
  kind: InsightsContextKind;
  userId: string | number | null;
  /** Journal entries are private when a parent is viewing a selected child. */
  canReadJournal: boolean;
}

interface InsightMetric {
  id: string;
  label: string;
  value: number | null;
  description: string;
  icon: string;
  tone: MetricTone;
}

interface InsightSection {
  id: string;
  title: string;
  metrics: InsightMetric[];
}

/**
 * The same Figma layout is intentionally used for a signed-in child and a
 * SELF user. The data context is still explicit so parent-selected child data
 * cannot leak into a SELF session (or the other way around).
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  readonly skeletonSections = [1, 2, 3, 4, 5];

  sections: InsightSection[] = [];
  isLoading = true;
  hasError = false;
  isEmpty = false;
  emptyMessage = 'Insights will appear here as you build your progress.';

  private readonly destroy$ = new Subject<void>();
  private requestVersion = 0;
  private context: InsightsContext = {
    key: 'unavailable',
    kind: 'unavailable',
    userId: null,
    canReadJournal: false,
  };

  constructor(
    private readonly location: Location,
    private readonly authService: AuthService,
    private readonly profileStore: ProfileStoreService,
    private readonly parentAnalyticsService: ParentAnalyticsService,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.authService.userData$.pipe(startWith(this.authService.getUserData())),
      this.profileStore.selectionChanged$.pipe(startWith(this.profileStore.getSelectedChildSync())),
    ])
      .pipe(
        map(([user, selectedChild]) => this.resolveContext(user, selectedChild)),
        distinctUntilChanged((previous, current) => previous.key === current.key),
        takeUntil(this.destroy$),
      )
      .subscribe(context => this.loadInsights(context));
  }

  ngOnDestroy(): void {
    this.requestVersion++;
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.location.back();
  }

  retry(): void {
    this.loadInsights(this.context);
  }

  trackSection = (_: number, section: InsightSection): string => section.id;

  trackMetric = (_: number, metric: InsightMetric): string => metric.id;

  displayValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  }

  private resolveContext(userData: any, selectedChild: ChildInfo | null): InsightsContext {
    const user = userData?.user ?? userData?.data?.user ?? userData?.data ?? userData ?? {};
    const relationship = String(user?.relationship || this.authService.getUserRelationship() || '').toUpperCase();
    const currentUserId = user?.id ?? user?.userId ?? this.authService.getUserId() ?? null;

    if (relationship === 'PARENT') {
      if (!selectedChild?.id) {
        return {
          key: 'parent-without-child',
          kind: 'unavailable',
          userId: null,
          canReadJournal: false,
        };
      }

      return {
        key: `child:${selectedChild.id}`,
        kind: 'child',
        userId: selectedChild.id,
        canReadJournal: false,
      };
    }

    if (!currentUserId) {
      return {
        key: `unavailable:${relationship || 'unknown'}`,
        kind: 'unavailable',
        userId: null,
        canReadJournal: false,
      };
    }

    const isChild = relationship === 'CHILD';
    return {
      key: `${isChild ? 'child' : 'self'}:${currentUserId}`,
      kind: isChild ? 'child' : 'self',
      userId: currentUserId,
      canReadJournal: true,
    };
  }

  private loadInsights(context: InsightsContext): void {
    const requestVersion = ++this.requestVersion;
    this.context = context;
    this.sections = [];
    this.hasError = false;
    this.isEmpty = false;
    this.isLoading = false;

    if (context.kind === 'unavailable' || context.userId === null) {
      this.isEmpty = true;
      this.emptyMessage = 'Select a child to see their Insights.';
      return;
    }

    const userId = context.userId;
    this.isLoading = true;
    forkJoin({
      insights: this.parentAnalyticsService.getInsights(userId).pipe(catchError(() => of(null))),
      journal: context.canReadJournal ? this.getJournalEntries() : of(null),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (requestVersion !== this.requestVersion) return;

          this.isLoading = false;
          if (!response.insights) {
            this.hasError = true;
            return;
          }

          this.sections = this.buildSections(response.insights, response.journal, context);
        },
        error: () => {
          if (requestVersion !== this.requestVersion) return;
          this.isLoading = false;
          this.hasError = true;
        },
      });
  }

  private buildSections(insights: InsightsResponseDto, journal: unknown[] | null, context: InsightsContext): InsightSection[] {
    const sections: InsightSection[] = [
      {
        id: 'habits',
        title: 'Habits',
        metrics: [
          this.metric('habits-week', 'This week', this.asNumber(insights.habits?.thisWeek), 'Habits progress in the last 7 days', 'assets/figma/insights/habits-week.png', 'habit'),
          this.metric('habits-month', 'This month', this.asNumber(insights.habits?.thisMonth), 'Growing stronger over 30 days', 'assets/figma/insights/habits-month.png', 'habit'),
        ],
      },
      {
        id: 'tasks',
        title: 'Tasks',
        metrics: [
          this.metric('tasks-week', 'This week', this.asNumber(insights.tasks?.thisWeek), 'Tasks progress in the last 7 days', 'assets/figma/insights/tasks-week.png', 'task'),
          this.metric('tasks-month', 'This month', this.asNumber(insights.tasks?.thisMonth), 'Growing stronger over 30 days', 'assets/figma/insights/tasks-month.png', 'task'),
        ],
      },
      {
        id: 'knowledge',
        title: 'Knowledge gained',
        metrics: [
          this.metric('quizzes', 'Quizzes', this.asNumber(insights.knowledgeGained?.quizzes), 'Quizzes conquered so far', 'assets/figma/insights/knowledge-quizzes.png', 'knowledge'),
          this.metric('puzzles', 'Puzzles', this.asNumber(insights.knowledgeGained?.puzzles), 'Puzzles cracked since you started', 'assets/figma/insights/knowledge-puzzles.png', 'knowledge'),
          this.metric('articles', 'Articles', this.asNumber(insights.knowledgeGained?.articles), 'Ideas absorbed since you joined', 'assets/figma/insights/knowledge-articles.png', 'knowledge'),
          this.metric('lessons', 'Lessons', this.asNumber(insights.knowledgeGained?.lessons), 'Lessons progress since you started', 'assets/figma/insights/knowledge-lessons.png', 'knowledge'),
        ],
      },
    ];

    if (context.canReadJournal) {
      sections.push({
        id: 'journal',
        title: 'Journal',
        metrics: [
          this.metric('journal-week', 'This week', this.countJournalDays(journal, 'week'), 'Days you showed up this week', 'assets/figma/insights/journal-week.png', 'journal'),
          this.metric('journal-month', 'This month', this.countJournalDays(journal, 'month'), 'Days you showed up this month', 'assets/figma/insights/journal-month.png', 'journal'),
        ],
      });
    }

    sections.push({
      id: 'achievements',
      title: 'Achievements',
      metrics: [
        this.metric('badges', 'Badges', this.asNumber(insights.achievements?.badges), 'Badges earned in the last 30 days', 'assets/figma/insights/achievement-badges.png', 'achievement'),
        this.metric('trophies', 'Trophies', this.asNumber(insights.achievements?.trophies), 'Trophies unlocked this month', 'assets/figma/insights/achievement-trophies.png', 'achievement'),
        this.metric('streaks', 'Streaks', this.asNumber(insights.achievements?.streaks), 'Your longest streak this month', 'assets/figma/insights/achievement-streaks.png', 'achievement'),
        this.metric('coins', 'Coins', this.asNumber(insights.achievements?.coins), 'Coins collected this month', 'assets/figma/insights/achievement-coins.png', 'achievement'),
      ],
    });

    return sections;
  }

  private metric(
    id: string,
    label: string,
    value: number | null,
    description: string,
    icon: string,
    tone: MetricTone,
  ): InsightMetric {
    return { id, label, value, description, icon, tone };
  }

  private getJournalEntries(): Observable<unknown[] | null> {
    const now = new Date();
    let params = new HttpParams()
      .set('type', 'MONTH')
      .set('month', String(now.getMonth() + 1))
      .set('year', String(now.getFullYear()));
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    return this.http.get<unknown>(`${environment.apiUrl}/journal/entries`, { headers, params }).pipe(
      map(response => Array.isArray(response) ? response : null),
      catchError(() => of(null)),
    );
  }

  private countJournalDays(entries: unknown[] | null, period: 'week' | 'month'): number | null {
    if (entries === null) return null;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === 'week') {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
    } else {
      start.setDate(1);
    }

    const uniqueDates = new Set<string>();
    entries.forEach(entry => {
      const item = entry as Record<string, unknown>;
      const rawDate = item?.['creationDate'] ?? item?.['date'] ?? item?.['createdAt'];
      const date = rawDate ? new Date(String(rawDate)) : null;
      if (!date || Number.isNaN(date.getTime()) || date < start || date > now) return;
      uniqueDates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    return uniqueDates.size;
  }

  private asNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
  }
}
