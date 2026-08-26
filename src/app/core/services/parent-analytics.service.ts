import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type ParentAnalyticsBand = 'red' | 'yellow' | 'green';
export type ParentAnalyticsScoreLabel = 'Needs attention' | 'Doing okay' | 'Excellent!';

export interface ParentAnalyticsResponseDto {
  completionRate: number;
  consistencyRate: number;
  improvementRate: number;
  appScore: number;

  completionRateColor: ParentAnalyticsBand;
  consistencyRateColor: ParentAnalyticsBand;
  improvementRateColor: ParentAnalyticsBand;
  appScoreColor: ParentAnalyticsBand;
  appScoreLabel: ParentAnalyticsScoreLabel;

  totalCompletedActivities: number;
  totalScheduledActivities: number;
  activeDaysThisWeek: number;
  daysInWeek: number;
  isFirstWeek: boolean;
  period: string;
}

export interface InsightsResponseDto {
  habits: { thisWeek: number; thisMonth: number };
  tasks: { thisWeek: number; thisMonth: number };
  knowledgeGained: {
    quizzes: number | { thisWeek: number; thisMonth: number };
    puzzles: number | { thisWeek: number; thisMonth: number };
    articles: number | { thisWeek: number; thisMonth: number };
    lessons: number | { thisWeek: number; thisMonth: number };
  };
  /** Aggregate-only journal counts are safe for a parent to view. */
  journal?: { thisWeek: number; thisMonth: number };
  timeManagement?: { thisWeek: number; thisMonth: number };
  achievements: { badges: number; trophies: number; streaks: number; coins: number };
}

@Injectable({
  providedIn: 'root'
})
export class ParentAnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) { }

  /**
   * GET /analytics/parent-home?childId={id}
   * Weekly performance summary (completion/consistency/improvement/app score)
   * shown on the parent home "This Week's Performance" card.
   */
  getParentHomeAnalytics(childId: string | number): Observable<ParentAnalyticsResponseDto> {
    return this.http.get<ParentAnalyticsResponseDto>(`${this.apiUrl}/parent-home`, {
      params: { childId: String(childId) }
    });
  }

  /**
   * GET /analytics/insights?userId={id}
   * Weekly/monthly habits, tasks, knowledge-gained, and achievement totals
   * shown on the Insights page. A parent may pass any linked child's userId;
   * a child/self user may only pass their own.
   */
  getInsights(userId: string | number): Observable<InsightsResponseDto> {
    return this.http.get<InsightsResponseDto>(`${this.apiUrl}/insights`, {
      params: { userId: String(userId) }
    });
  }
}
