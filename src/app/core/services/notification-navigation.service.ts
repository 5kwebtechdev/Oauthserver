import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { filter, take, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileStoreService } from './profile-store.service';

export interface NotificationAction {
  actionScreen?: unknown;
  actionReferenceId?: unknown;
  referenceId?: unknown; // Older FCM payloads.
  notificationId?: unknown;
}

export function notificationId(value: unknown): string | null {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? text : null;
}

/** Explicit allowlist: notification data must never supply an arbitrary URL. */
export function notificationRoute(data: NotificationAction): string {
  const action = String(data.actionScreen ?? '').trim().toUpperCase();
  const id = notificationId(data.actionReferenceId ?? data.referenceId);
  switch (action) {
    case 'HABIT': case 'HABIT_DETAIL':
      return id ? `/authed/activity-detail/${id}?type=habits` : '/authed/activity-page?tab=habits';
    case 'TASK': case 'TASK_DETAIL':
      return id ? `/authed/activity-detail/${id}?type=tasks` : '/authed/activity-page?tab=tasks';
    case 'ACTIVITY': case 'VIEW_ALL_HABITS_TASKS': return '/authed/activity-page';
    case 'VIEW_ALL_HABITS': return '/authed/activity-page?tab=habits';
    case 'VIEW_ALL_TASKS': return '/authed/activity-page?tab=tasks';
    case 'ADD_HABIT_TASK': return '/authed/activity-input';
    case 'JOURNAL': return '/authed/journal-input';
    case 'NOTES': return '/authed/notes';
    case 'LEARNING': case 'LEARNINGS_HOME': case 'QUIZ_HOME': return '/authed/content';
    case 'COURSE': case 'COURSE_LESSON':
      return id ? `/authed/academy/course/${id}` : '/authed/academy';
    case 'ACADEMY_HOME': return '/authed/academy';
    case 'STREAK': case 'STREAKS': return '/authed/streaks';
    case 'SCREEN_ORDER_DETAIL':
      return id ? `/authed/school-store/my-orders?orderId=${id}` : '/authed/school-store/my-orders';
    case 'PARENT_DASHBOARD': return '/authed/parent-account';
    // HOME is role-aware through the existing dashboard guard.
    case 'HOME': case 'MOOD': default: return '/home';
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
  readonly changed$ = new Subject<void>();
  readonly destinationSettled$ = new Subject<void>();
  isOpeningDestination = false;
  private destinationSequence = 0;
  private pending: NotificationAction | null = null;
  private waitingForRouter = false;
  private reading = new Set<string>();

  constructor(private router: Router, private http: HttpClient, private profiles: ProfileStoreService) {}

  /** Called only for user taps, never for notification receipt. */
  open(data: NotificationAction): void {
    this.destinationSequence++;
    this.isOpeningDestination = true;
    this.pending = data;
    this.resume();
  }

  cancelPending(): void {
    this.destinationSequence++;
    this.pending = null;
    this.isOpeningDestination = false;
    this.destinationSettled$.next();
  }

  resume(): void {
    if (!this.pending || !localStorage.getItem('auth_token')) return;
    if (!this.router.navigated) {
      if (!this.waitingForRouter) {
        this.waitingForRouter = true;
        this.router.events.pipe(filter(event => event instanceof NavigationEnd), take(1)).subscribe(() => {
          this.waitingForRouter = false;
          this.resume();
        });
      }
      return;
    }
    const data = this.pending;
    const sequence = this.destinationSequence;
    this.pending = null;
    const id = notificationId(data.actionReferenceId ?? data.referenceId);
    if (String(data.actionScreen).trim().toUpperCase() === 'PARENT_DASHBOARD' && id) {
      this.profiles.selectWhenAvailable(id);
    }
    this.markPushRead(data.notificationId);
    void this.router.navigateByUrl(notificationRoute(data), { replaceUrl: false })
      .catch(() => { /* Leave current screen intact if routing fails. */ })
      .finally(() => {
        if (sequence === this.destinationSequence && !this.pending) {
          this.isOpeningDestination = false;
          this.destinationSettled$.next();
        }
      });
  }

  private markPushRead(value: unknown): void {
    const id = notificationId(value);
    const token = localStorage.getItem('auth_token');
    if (!id || !token || this.reading.has(id)) return;
    this.reading.add(id);
    const headers = new HttpHeaders({ Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, 'x-skip-loading': '1' });
    this.http.post(`${environment.apiUrl}/user/notifications/${id}/read`, {}, { headers }).subscribe({
      next: () => { this.reading.delete(id); this.changed$.next(); },
      error: () => { this.reading.delete(id); this.changed$.next(); }
    });
  }
}
