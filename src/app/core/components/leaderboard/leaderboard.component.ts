import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Subscription } from 'rxjs';
import { AvatarService } from '../../services/avatar.service';
import {
  CoinLeaderboardResponse,
  CoinLeaderboardScope,
  CoinLeaderboardService,
  CoinLeaderboardUser,
  CoinLeaderboardGroup
} from '../../services/coin-leaderboard.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class LeaderboardComponent implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  scope: CoinLeaderboardScope = 'GLOBAL';
  result: CoinLeaderboardResponse | null = null;
  loading = false;
  loadingMore = false;
  error: 'unavailable' | 'failed' | 'access' | 'invalid' | null = null;
  paginationError = false;
  shareFeedback = '';
  groups: CoinLeaderboardGroup[] = [];
  private request?: Subscription;
  private groupRequest?: Subscription;
  private requestVersion = 0;
  private loadedOnce = false;
  private active = true;
  private readonly failedAvatars = new Set<string>();
  private defaultAvatarFailed = false;
  private readonly refreshIfVisible = () => { if (this.active && !document.hidden) this.load(); };

  constructor(
    private readonly leaderboard: CoinLeaderboardService,
    private readonly avatars: AvatarService,
    private readonly location: Location
  ) {}

  ngOnInit(): void {
    window.addEventListener('focus', this.refreshIfVisible);
    window.addEventListener('family-monitoring-changed', this.refreshIfVisible);
    document.addEventListener('visibilitychange', this.refreshIfVisible);
    this.load();
  }
  ionViewWillEnter(): void {
    this.active = true;
    if (this.loadedOnce) this.load();
    this.loadedOnce = true;
  }
  ionViewWillLeave(): void { this.active = false; }
  ngOnDestroy(): void {
    this.requestVersion++;
    this.request?.unsubscribe();
    this.groupRequest?.unsubscribe();
    window.removeEventListener('focus', this.refreshIfVisible);
    window.removeEventListener('family-monitoring-changed', this.refreshIfVisible);
    document.removeEventListener('visibilitychange', this.refreshIfVisible);
  }

  get podium(): CoinLeaderboardUser[] {
    return (this.result?.content ?? []).filter(user => user.rank != null && user.rank >= 1 && user.rank <= 3);
  }

  get rows(): CoinLeaderboardUser[] {
    const topTenRows = (this.result?.content ?? []).filter(user => user.rank != null && user.rank >= 4 && user.rank <= 10);
    const currentUser = this.result?.currentUser;
    if (this.scope !== 'GLOBAL' || !currentUser || (currentUser.rank != null && currentUser.rank >= 1 && currentUser.rank <= 10)) {
      return topTenRows;
    }
    return topTenRows.some(user => this.isCurrentUser(user)) ? topTenRows : [...topTenRows, currentUser];
  }

  get currentUserInTopTen(): boolean {
    const rank = this.result?.currentUser?.rank;
    return this.scope === 'GLOBAL' && this.result?.state === 'OK' && rank != null && rank >= 1 && rank <= 10;
  }

  podiumUser(rank: number): CoinLeaderboardUser | undefined {
    return this.podium.find(user => user.rank === rank);
  }

  selectScope(scope: CoinLeaderboardScope): void {
    if (scope === this.scope) return;
    this.scope = scope;
    this.result = null;
    this.shareFeedback = '';
    if (scope === 'GLOBAL') this.load();
    else {
      this.requestVersion++;
      this.request?.unsubscribe();
      this.groupRequest?.unsubscribe();
      this.loading = false;
      this.error = null;
    }
  }

  load(): void {
    if (this.scope === 'GROUP') return;
    const version = ++this.requestVersion;
    this.request?.unsubscribe();
    this.groupRequest?.unsubscribe();
    this.loading = true;
    this.loadingMore = false;
    this.error = null;
    this.paginationError = false;
    this.request = this.leaderboard.getLeaderboard('GLOBAL', 0, 10).subscribe({
      next: response => {
        if (version !== this.requestVersion) return;
        this.result = response;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (version !== this.requestVersion) return;
        this.result = null;
        this.loading = false;
        this.error = error.status === 403 ? 'access'
          : error.status === 400 ? 'invalid'
          : error.status === 404 || error.status === 501 ? 'unavailable' : 'failed';
      }
    });
  }

  loadMore(): void {
    if (!this.result?.hasMore || this.loadingMore) return;
    const previous = this.result;
    const version = this.requestVersion;
    this.loadingMore = true;
    this.paginationError = false;
    this.request = this.leaderboard.getLeaderboard(this.scope, previous.page + 1, previous.size).subscribe({
      next: response => {
        if (version !== this.requestVersion) return;
        this.result = { ...response, content: [...previous.content, ...response.content] };
        this.loadingMore = false;
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.loadingMore = false;
        this.paginationError = true;
      }
    });
  }

  async shareRank(): Promise<void> {
    if (!this.currentUserInTopTen) return;
    const rank = this.result!.currentUser.rank!;
    const text = `I am ranked #${rank} on SuperMeApp!`;
    this.shareFeedback = '';
    try {
      const capability = await Share.canShare();
      if (capability.value) {
        await Share.share({ title: 'My SuperMeApp rank', text, dialogTitle: 'Share your rank' });
        return;
      }
    } catch (error) {
      if (this.isShareCancelled(error)) return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My SuperMeApp rank', text });
        return;
      } catch (error) {
        if (this.isShareCancelled(error)) return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      this.shareFeedback = 'Your rank message was copied.';
    } catch {
      this.shareFeedback = 'Unable to share your rank right now.';
    }
  }

  private isShareCancelled(error: unknown): boolean {
    const value = String(error instanceof Error ? error.message : error).toLowerCase();
    return value.includes('cancel') || value.includes('abort');
  }

  avatarUrl(user: CoinLeaderboardUser): string | null {
    const key = String(user.userId);
    if (this.failedAvatars.has(key)) return this.defaultAvatarUrl;
    const value = user.avatar?.trim();
    if (value && (/^https?:\/\//i.test(value) || value.startsWith('assets/'))) return value;
    const asset = this.avatars.getAvatarAsset(value);
    return asset?.value ?? this.defaultAvatarUrl;
  }

  get defaultAvatarUrl(): string | null {
    return this.defaultAvatarFailed ? null : this.avatars.getFallbackAvatar(null, null).value;
  }

  avatarFailed(user: CoinLeaderboardUser): void {
    const key = String(user.userId);
    if (this.failedAvatars.has(key) || !user.avatar) this.defaultAvatarFailed = true;
    else this.failedAvatars.add(key);
  }
  initials(user: CoinLeaderboardUser): string { return user.displayName?.trim().slice(0, 1).toUpperCase() || '?'; }
  isCurrentUser(user: CoinLeaderboardUser): boolean {
    return !!this.result?.currentUser && String(user.userId) === String(this.result.currentUser.userId);
  }
  rankLabel(user: CoinLeaderboardUser): string { return user.rank == null ? 'Unranked' : String(user.rank); }
  trackUser(_: number, user: CoinLeaderboardUser): string { return String(user.userId); }
  back(): void { this.location.back(); }
}
