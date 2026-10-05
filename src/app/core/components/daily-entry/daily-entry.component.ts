import { CommonModule } from '@angular/common';
import { Component, Input, NgZone, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { firstValueFrom, Subscription, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ApiOverlayType, PetMessageApiService, PetMessageApiResponse, isReferralOverlay } from '../../services/pet-message-api.service';
import { ReferralTestPopupComponent } from './referral-test-popup.component';
import { ENABLE_REFERRAL_TEST_POPUP } from './referral-popup-testing.config';
import { StreakRestoreApi } from '../../api/streak-restore.api';
import { StreakMilestoneComponent } from '../streak-milestone/streak-milestone.component';
import { MoodSelectorComponent } from '../mood-selector/mood-selector.component';
import { messageWithUsername } from '../../models/greeting-username';

/** One owner for entry overlays, independent of the destination route. */
@Component({
  selector: 'app-daily-entry', standalone: true,
  imports: [CommonModule, StreakMilestoneComponent, MoodSelectorComponent, ReferralTestPopupComponent],
  template: `
    <div *ngIf="active && !blocked" class="entry-backdrop"
      [class.entry-backdrop--referral-received]="active === 'REFERRAL_RECEIVED' && referralTestUiEnabled"
      [class.entry-backdrop--referral-joined]="active === 'REFERRAL_JOINED' && referralTestUiEnabled"
      role="dialog" aria-modal="true" [attr.aria-label]="isReferral ? 'Referral celebration' : 'Daily check-in'">
      <!-- TEMP REFERRAL POPUP UI FOR TESTING - REMOVE/DISABLE AFTER TESTING -->
      <app-referral-test-popup *ngIf="isReferral && referralTestUiEnabled && referralEvent; else existingOverlay"
        [event]="referralEvent" [busy]="busy" [notice]="notice" (dismiss)="dismiss()"></app-referral-test-popup>
      <ng-template #existingOverlay>
      <app-streak-milestone *ngIf="isReward; else prompt" [days]="days" [celebrateProgress]="true"
        [dailyCoins]="rewardDailyCoins" [milestoneCoins]="rewardMilestoneCoins"
        [restoreMode]="canRestore" [restoreCost]="restoreCost" [restoreDisabled]="busy" [restoring]="busy"
        [notice]="notice" (restore)="restore()"
        (continue)="dismiss()"></app-streak-milestone>
      <ng-template #prompt><section *ngIf="active === 'MOOD_PROMPT'" class="entry-mood-sheet" aria-labelledby="entry-mood-title">
        <button class="entry-mood-close" type="button" aria-label="Close mood popup" [disabled]="busy" (click)="dismiss()">
          <img src="assets/figma/mood-popup/close.svg" alt="">
        </button>
        <header class="entry-mood-heading">
          <h2 id="entry-mood-title">How are you feeling now?</h2>
          <p>Select a mood to update your vibe.</p>
        </header>
        <mood-selector presentation="entry" (moodSaved)="moodSaved()"></mood-selector>
      </section></ng-template>
      </ng-template>
    </div>`,
  styles: [`
    .entry-backdrop { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.35);
      display:flex; align-items:flex-end; justify-content:center; padding-top:12px; }
    .entry-backdrop--referral-received, .entry-backdrop--referral-joined { align-items:center; padding:12px 16px; }
    app-streak-milestone { width:min(100%,480px); max-height:calc(100dvh - 12px); overflow:auto; }
    .entry-mood-sheet { position:relative; box-sizing:border-box; width:min(100%,393px); padding:12px 16px max(12px,env(safe-area-inset-bottom));
      border-radius:44px 44px 0 0; overflow:hidden; display:flex; flex-direction:column; align-items:center; gap:12px;
      background:linear-gradient(180deg,#ebe6f5 0%,#fff 45.545%); color:#432477;
      box-shadow:inset 0 2px 2px .5px rgba(255,255,255,.5); font-family:var(--font-sans,'Nunito',sans-serif); }
    .entry-mood-heading { width:100%; padding:2px 28px 0; text-align:center; }
    .entry-mood-heading h2 { margin:0; color:#432477; font-size:20px; font-weight:700; line-height:27px; white-space:nowrap; }
    .entry-mood-heading p { margin:0; color:#432477; font-size:13px; font-weight:600; line-height:18px; }
    .entry-mood-close { position:absolute; z-index:1; top:12px; right:16px; width:36px; height:36px; margin:0; padding:8px;
      border:0; border-radius:50%; background:transparent; cursor:pointer; }
    .entry-mood-close img { display:block; width:20px; height:20px; }
    .entry-mood-close:focus-visible { outline:2px solid #432477; }
    .entry-mood-close:disabled { opacity:.5; }
    .entry-mood-sheet mood-selector { width:100%; }
    @media(max-width:350px) { .entry-mood-heading { padding-inline:20px; }
      .entry-mood-heading h2 { font-size:clamp(16px,5vw,20px); }
      .entry-mood-close { right:10px; } }
  `]
})
export class DailyEntryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() blocked = false;
  active: ApiOverlayType | null = null;
  message = '';
  days = 0;
  rewardDailyCoins = 5;
  rewardMilestoneCoins: number | null = null;
  busy = false;
  canRestore = false;
  restoreCost = 5;
  restoreToStreak: number | null = null;
  availableCoins: number | null = null;
  notice = '';
  readonly referralTestUiEnabled = ENABLE_REFERRAL_TEST_POPUP;
  referralEvent: PetMessageApiResponse | null = null;
  private rewardEventId: string | number | null = null;
  private destroyed = false;
  private entryKey = '';
  private finishedKey = '';
  private lastAttempt = 0;
  private subscriptions = new Subscription();
  private listener?: PluginListenerHandle;
  private timer?: ReturnType<typeof setInterval>;
  private seen = new Set<string>();
  private skippedRewardClaims = new Set<string>();
  private wake = () => this.zone.run(() => { void this.check(); });

  constructor(private auth: AuthService, private api: PetMessageApiService,
    private streak: StreakRestoreApi, private router: Router, private zone: NgZone,
    private userService: UserService) {}

  get isReward(): boolean { return this.active === 'DAILY_LOGIN' || this.active === 'STREAK_MILESTONE'; }
  get isReferral(): boolean { return isReferralOverlay(this.active); }

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
    if (/\/(login|signup|sign-up|join-family|instructions-for|select-role|family-onboard)(\/|\?|$)/.test(this.router.url)) return '';
    const id = user.id ?? user.userId ?? this.auth.getUserId();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return id ? `${id}:${date}` : '';
  }

  private marker(type: ApiOverlayType, key = this.entryKey, eventId?: string | number | null): string {
    if (isReferralOverlay(type)) return `superme_referral_seen_${key.split(':')[0]}:${type}:${eventId}`;
    const category = type === 'STREAK_MILESTONE' ? 'DAILY_LOGIN' : type;
    return `superme_entry_seen_${key}:${category}`;
  }
  private hasSeen(type: ApiOverlayType, eventId?: string | number | null): boolean {
    const marker = this.marker(type, this.entryKey, eventId);
    try {
      const [userId, date] = this.entryKey.split(':');
      const legacyRewardSeen = (type === 'DAILY_LOGIN' || type === 'STREAK_MILESTONE')
        && localStorage.getItem(`superme_daily_streak_seen_${userId}`) === date;
      return legacyRewardSeen || this.seen.has(marker) || localStorage.getItem(marker) === 'true';
    }
    catch { return this.seen.has(marker); }
  }
  private markSeen(type: ApiOverlayType, eventId?: string | number | null): void {
    const marker = this.marker(type, this.entryKey, eventId);
    this.seen.add(marker);
    try { localStorage.setItem(marker, 'true'); } catch { /* In-memory guard remains active. */ }
  }

  private claimSkipMarker(eventId: string | number): string {
    return `superme_reward_claim_skipped_${this.entryKey.split(':')[0]}:${eventId}`;
  }
  private hasSkippedClaim(eventId: string | number): boolean {
    const marker = this.claimSkipMarker(eventId);
    try { return this.skippedRewardClaims.has(marker) || localStorage.getItem(marker) === 'true'; }
    catch { return this.skippedRewardClaims.has(marker); }
  }
  private skipClaim(eventId: string | number): void {
    const marker = this.claimSkipMarker(eventId);
    this.skippedRewardClaims.add(marker);
    try { localStorage.setItem(marker, 'true'); } catch { /* In-memory guard remains active. */ }
  }

  async check(): Promise<void> {
    if (this.blocked) return;
    const key = this.context();
    if (key !== this.entryKey) { this.active = null; this.referralEvent = null; this.rewardEventId = null; this.entryKey = key; this.finishedKey = ''; this.lastAttempt = 0; }
    // New referrals can arrive after today's normal entry queue has finished.
    const retryInterval = key === this.finishedKey ? 30_000 : 10_000;
    if (!key || this.busy || this.active || Date.now() - this.lastAttempt < retryInterval) return;
    this.busy = true;
    this.lastAttempt = Date.now();
    try {
      // Bounded drain: a stale server overlay or failed dismissal cannot create a request loop.
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await firstValueFrom(this.api.getHomeOverlay(true).pipe(timeout(15_000)));
        if (this.destroyed || this.blocked || this.context() !== key) return;
        let type = response.hasOverlay ? response.overlayType : null;
        const isParent = String(this.auth.getUserData()?.relationship).toUpperCase() === 'PARENT';
        // Bonus coins are already celebrated by the reward/streak popup. Acknowledge
        // the queued overlay without showing a second Welcome sheet, then fetch the next.
        // Parents also skip other child/self daily prompts.
        if (type === 'BONUS_COINS' || (isParent && type && type !== 'NONE' && !isReferralOverlay(type))) {
          await firstValueFrom(this.api.dismissHomeOverlay(type, undefined, true).pipe(timeout(15_000)));
          if (this.destroyed || this.blocked || this.context() !== key) return;
          this.markSeen(type);
          continue;
        }
        if (isParent && (!type || type === 'NONE')) { this.finishedKey = key; return; }
        if (isReferralOverlay(type)) {
          if (response.eventId == null || !String(response.eventId).trim()) return;
          if (!this.referralTestUiEnabled || this.hasSeen(type, response.eventId)) {
            await firstValueFrom(this.api.dismissHomeOverlay(type, response.eventId).pipe(timeout(15_000)));
            if (this.destroyed || this.context() !== key) return;
            this.markSeen(type, response.eventId);
            continue;
          }
          this.referralEvent = response;
          this.notice = '';
          this.active = type;
          // Reward credit already happened on the server; refresh, never add amount locally.
          this.subscriptions.add(this.userService.refreshStats().subscribe({ error: () => {} }));
          return;
        }
        if (!type || type === 'NONE') {
          // Only the account-level server overlay may authorize a reward popup.
          // A per-device login flag can replay the same reward on other devices.
          this.finishedKey = key;
          return;
        }
        if (this.hasSeen(type)) {
          await firstValueFrom(this.api.dismissHomeOverlay(type, response.eventId).pipe(timeout(15_000)));
          continue;
        }
        if (type === 'DAILY_LOGIN' || type === 'STREAK_MILESTONE') {
          // The GET is read-only: only the winner of the account-wide atomic claim
          // may present this reward. Never retry-and-show on an uncertain claim.
          if (response.eventId == null || !String(response.eventId).trim()) return;
          if (this.hasSkippedClaim(response.eventId)) { this.finishedKey = key; return; }
          let claim;
          try {
            claim = await firstValueFrom(this.api.claimRewardOverlay(response.eventId).pipe(timeout(15_000)));
          } catch { this.skipClaim(response.eventId); this.finishedKey = key; return; }
          if (this.destroyed || this.blocked || this.context() !== key) return;
          if (!claim.claimed || (claim.type !== 'DAILY_LOGIN' && claim.type !== 'STREAK_MILESTONE')
            || String(claim.eventId) !== String(response.eventId)) {
            this.skipClaim(response.eventId);
            this.finishedKey = key;
            return;
          }
          type = claim.type;
          this.rewardEventId = claim.eventId;
          this.rewardDailyCoins = claim.dailyCoins ?? 5;
          this.rewardMilestoneCoins = claim.type === 'STREAK_MILESTONE' ? claim.milestoneCoins : null;
          let status;
          try {
            status = await firstValueFrom(this.streak.getStreakStatus(Number(key.split(':')[0])).pipe(timeout(15_000)));
          } catch {
            // The claim is already consumed; a status outage must not re-offer it.
            status = null;
          }
          if (this.destroyed || this.blocked || this.context() !== key) return;
          this.days = Number(claim.milestoneDay ?? status?.currentStreak ?? 0);
          this.canRestore = status?.canRestore ?? false;
          this.restoreCost = status?.restoreCost ?? 5;
          this.restoreToStreak = status?.restoreToStreak ?? null;
          this.availableCoins = status && Number.isFinite(Number(status.coins)) ? Number(status.coins) : null;
        }
        this.message = messageWithUsername(response.message || '', this.auth.getUserData());
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
    if (isReferralOverlay(type)) {
      const eventId = this.referralEvent?.eventId;
      this.busy = true;
      this.notice = '';
      try {
        await firstValueFrom(this.api.dismissHomeOverlay(type, eventId).pipe(timeout(15_000)));
        if (this.destroyed || this.context() !== key) return;
        this.markSeen(type, eventId);
        this.active = null;
        this.referralEvent = null;
      } catch {
        if (this.context() === key) this.notice = 'Couldn’t close this celebration. Please try again.';
      } finally {
        this.busy = false;
        this.lastAttempt = 0;
        if (!this.destroyed && (!this.active || this.context() !== key)) void this.check();
      }
      return;
    }
    if (type === 'MOOD_PROMPT') this.markSeen(type);
    this.active = null;
    this.busy = true;
    try { await firstValueFrom(this.api.dismissHomeOverlay(type, this.rewardEventId).pipe(timeout(15_000))); }
    catch { /* Presentation receipt prevents a repeat; retry consumption on the next check. */ }
    finally {
      this.rewardEventId = null;
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
      const restoredStreak = result.currentStreak ?? this.restoreToStreak;
      const remainingCoins = result.coins ?? result.userCoins
        ?? (this.availableCoins == null ? null : Math.max(0, this.availableCoins - this.restoreCost));
      if (restoredStreak != null) {
        this.days = Number(restoredStreak);
        this.userService.updateStreakAfterRestore(this.days, remainingCoins);
      }
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
