import { CommonModule } from '@angular/common';
import { Component, Input, NgZone, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { firstValueFrom, Subscription, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiOverlayType, PetMessageApiService } from '../../services/pet-message-api.service';
import { StreakRestoreApi } from '../../api/streak-restore.api';
import { StreakMilestoneComponent } from '../streak-milestone/streak-milestone.component';
import { MoodSelectorComponent } from '../mood-selector/mood-selector.component';

/** One owner for entry overlays, independent of the destination route. */
@Component({
  selector: 'app-daily-entry', standalone: true,
  imports: [CommonModule, StreakMilestoneComponent, MoodSelectorComponent],
  template: `
    <div *ngIf="active && !blocked" class="entry-backdrop" role="dialog" aria-modal="true" aria-label="Daily check-in">
      <app-streak-milestone *ngIf="isReward; else prompt" [days]="days" [celebrateProgress]="true"
        [restoreMode]="canRestore" [restoreCost]="restoreCost" [restoreDisabled]="busy" [restoring]="busy"
        [notice]="notice" (restore)="restore()"
        (continue)="dismiss()"></app-streak-milestone>
      <ng-template #prompt><section class="entry-prompt">
        <h2>{{ active === 'MOOD_PROMPT' ? 'How are you feeling today?' : 'Welcome!' }}</h2>
        <p>{{ message }}</p>
        <ng-container *ngIf="active === 'MOOD_PROMPT'; else continueButton">
          <mood-selector #picker (moodSaved)="moodSaved()"></mood-selector>
          <button *ngIf="picker.hasSavedMood" type="button" (click)="dismiss()">Keep Going</button>
        </ng-container>
        <ng-template #continueButton><button type="button" (click)="dismiss()">Continue</button></ng-template>
      </section></ng-template>
    </div>`,
  styles: [`
    .entry-backdrop { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.35);
      display:flex; align-items:flex-end; justify-content:center; padding-top:12px; }
    app-streak-milestone { width:min(100%,480px); max-height:calc(100dvh - 12px); overflow:auto; }
    .entry-prompt { width:min(100%,480px); max-height:90dvh; overflow:auto; padding:24px 20px calc(24px + env(safe-area-inset-bottom));
      border-radius:28px 28px 0 0; background:#f4eefb; color:#492581; text-align:center; }
    h2 { font-size:22px; } p { white-space:pre-line; }
    button { border:0; border-radius:24px; padding:12px 28px; margin-top:16px; background:#512b83; color:white; }
  `]
})
export class DailyEntryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() blocked = false;
  active: ApiOverlayType | null = null;
  message = '';
  days = 0;
  busy = false;
  canRestore = false;
  restoreCost = 5;
  notice = '';
  private destroyed = false;
  private entryKey = '';
  private finishedKey = '';
  private lastAttempt = 0;
  private subscriptions = new Subscription();
  private listener?: PluginListenerHandle;
  private timer?: ReturnType<typeof setInterval>;
  private seen = new Set<string>();
  private wake = () => this.zone.run(() => { void this.check(); });

  constructor(private auth: AuthService, private api: PetMessageApiService,
    private streak: StreakRestoreApi, private router: Router, private zone: NgZone) {}

  get isReward(): boolean { return this.active === 'DAILY_LOGIN' || this.active === 'STREAK_MILESTONE'; }

  ngOnChanges(): void { if (!this.blocked) this.wake(); }

  ngOnInit(): void {
    this.subscriptions.add(this.router.events.subscribe(event => { if (event instanceof NavigationEnd) this.wake(); }));
    this.subscriptions.add(this.auth.isAuthenticated$.subscribe(() => this.wake()));
    document.addEventListener('visibilitychange', this.wake);
    window.addEventListener('online', this.wake);
    window.addEventListener('family-monitoring-changed', this.wake);
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', state => { if (state.isActive) this.wake(); })
        .then(listener => { if (this.destroyed) void listener.remove(); else this.listener = listener; });
    }
    // Also handle midnight while the app remains in the foreground, and retry transient failures.
    this.timer = setInterval(this.wake, 30_000);
    this.wake();
  }

  private context(): string {
    const user = this.auth.getUserData();
    if (!this.auth.isLoggedIn() || !user || document.visibilityState === 'hidden') return '';
    if (localStorage.getItem('family_parent_user_data')) return '';
    if (String(user.relationship).toUpperCase() === 'PARENT') return '';
    if (/\/(login|signup|sign-up|join-family|instructions-for|select-role|family-onboard)(\/|\?|$)/.test(this.router.url)) return '';
    const id = user.id ?? user.userId ?? this.auth.getUserId();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return id ? `${id}:${date}` : '';
  }

  private marker(type: ApiOverlayType, key = this.entryKey): string {
    const category = type === 'STREAK_MILESTONE' ? 'DAILY_LOGIN' : type;
    return `superme_entry_seen_${key}:${category}`;
  }
  private hasSeen(type: ApiOverlayType): boolean {
    const marker = this.marker(type);
    try {
      const [userId, date] = this.entryKey.split(':');
      const legacyRewardSeen = (type === 'DAILY_LOGIN' || type === 'STREAK_MILESTONE')
        && localStorage.getItem(`superme_daily_streak_seen_${userId}`) === date;
      return legacyRewardSeen || this.seen.has(marker) || localStorage.getItem(marker) === 'true';
    }
    catch { return this.seen.has(marker); }
  }
  private markSeen(type: ApiOverlayType): void {
    const marker = this.marker(type);
    this.seen.add(marker);
    try { localStorage.setItem(marker, 'true'); } catch { /* In-memory guard remains active. */ }
  }

  async check(): Promise<void> {
    if (this.blocked) return;
    const key = this.context();
    if (key !== this.entryKey) { this.active = null; this.entryKey = key; this.finishedKey = ''; this.lastAttempt = 0; }
    if (!key || this.busy || this.active || key === this.finishedKey || Date.now() - this.lastAttempt < 10_000) return;
    this.busy = true;
    this.lastAttempt = Date.now();
    try {
      // Bounded drain: a stale server overlay or failed dismissal cannot create a request loop.
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await firstValueFrom(this.api.getHomeOverlay(true).pipe(timeout(15_000)));
        if (this.destroyed || this.blocked || this.context() !== key) return;
        let type = response.hasOverlay ? response.overlayType : null;
        if (!type || type === 'NONE') {
          // Fresh login remains a valid fallback, but yesterday's stored flag never is.
          if (this.auth.isFirstLoggedForTheDay() && !this.hasSeen('DAILY_LOGIN')) type = 'DAILY_LOGIN';
          else { this.finishedKey = key; return; }
        }
        if (this.hasSeen(type)) {
          await firstValueFrom(this.api.dismissHomeOverlay(type).pipe(timeout(15_000)));
          continue;
        }
        if (type === 'DAILY_LOGIN' || type === 'STREAK_MILESTONE') {
          const status = await firstValueFrom(this.streak.getStreakStatus(Number(key.split(':')[0])).pipe(timeout(15_000)));
          if (this.destroyed || this.blocked || this.context() !== key) return;
          this.days = Number(status.currentStreak ?? 0);
          this.canRestore = status.canRestore;
          this.restoreCost = status.restoreCost ?? 5;
        }
        this.message = response.message || '';
        this.notice = '';
        this.active = type;
        // A mood prompt is not complete until the user saves a mood. Keep it
        // eligible if the app is backgrounded before the selection is made.
        if (type !== 'MOOD_PROMPT') this.markSeen(type);
        return;
      }
    } catch { /* Do not mark the day checked on failure; next foreground/timer retries. */ }
    finally {
      this.busy = false;
      if (!this.destroyed && this.context() !== key) this.wake();
    }
  }

  async dismiss(): Promise<void> {
    const type = this.active;
    if (!type || this.busy) return;
    const key = this.entryKey;
    if (type === 'MOOD_PROMPT') this.markSeen(type);
    this.active = null;
    this.busy = true;
    try { await firstValueFrom(this.api.dismissHomeOverlay(type).pipe(timeout(15_000))); }
    catch { /* Presentation receipt prevents a repeat; retry consumption on the next check. */ }
    finally {
      this.busy = false;
      this.lastAttempt = 0;
      if (!this.destroyed && this.context() === key) void this.check();
    }
  }

  moodSaved(): void { void this.dismiss(); }

  async restore(): Promise<void> {
    if (this.busy || !this.canRestore) return;
    const key = this.entryKey;
    this.busy = true;
    try {
      const result = await firstValueFrom(this.streak.postRestoreStreak(Number(key.split(':')[0])).pipe(timeout(15_000)));
      if (this.destroyed || this.context() !== key) return;
      this.days = result.currentStreak ?? this.days;
      this.canRestore = false;
      this.notice = 'Streak restored!';
    } catch { this.notice = 'Unable to restore your streak. Please try again.'; }
    finally { this.busy = false; }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscriptions.unsubscribe();
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.wake);
    window.removeEventListener('online', this.wake);
    window.removeEventListener('family-monitoring-changed', this.wake);
    void this.listener?.remove();
  }
}
