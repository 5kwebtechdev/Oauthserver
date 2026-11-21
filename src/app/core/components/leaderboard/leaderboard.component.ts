import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { BrowserRankShare, LeaderboardRankShareService } from '../../services/leaderboard-rank-share.service';
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
  sharingRank = false;
  browserShare: BrowserRankShare | null = null;
  browserShareUrl: string | null = null;
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
    private readonly location: Location,
    private readonly rankShare: LeaderboardRankShareService
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
  ionViewWillLeave(): void { this.active = false; this.clearBrowserShare(); }
  ngOnDestroy(): void {
    this.active = false;
    this.clearBrowserShare();
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
    this.clearBrowserShare();
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
    if (!this.currentUserInTopTen || this.sharingRank) return;
    this.sharingRank = true;
    this.clearBrowserShare();
    this.shareFeedback = 'Preparing your achievement card…';
    try {
      const fallback = await this.rankShare.share(message => {
        if (this.active) this.shareFeedback = message;
      });
      this.shareFeedback = '';
      if (fallback && this.active && this.scope === 'GLOBAL') {
        this.browserShare = fallback;
        this.browserShareUrl = URL.createObjectURL(fallback.file);
        if (fallback.canShare) {
          this.shareFeedback = 'Your card is ready. Choose Share image, or download it and copy the message.';
        } else {
          this.downloadRankImage();
          // Clipboard permissions can stay pending in an unfocused browser.
          // The prepared download must remain usable while that resolves.
          void this.copyRankMessage();
        }
      }
    } catch (error) {
      this.shareFeedback = '';
      if (!this.isShareCancelled(error)) {
        this.shareFeedback = error instanceof Error ? error.message : 'Unable to share your rank right now.';
      }
    } finally {
      this.sharingRank = false;
    }
  }

  downloadRankImage(): void {
    if (!this.browserShare || !this.browserShareUrl) return;
    const link = document.createElement('a');
    link.href = this.browserShareUrl;
    link.download = this.browserShare.file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async copyRankMessage(): Promise<void> {
    const prepared = this.browserShare;
    if (!prepared) return;
    const copied = await this.rankShare.copyMessage(prepared.text);
    if (this.browserShare !== prepared) return;
    this.shareFeedback = copied
      ? 'Sharing message copied. Download the image below if the download did not start.'
      : 'Download your image below. Choose Copy message, or select and copy the message manually.';
  }

  async sharePreparedImage(): Promise<void> {
    if (!this.browserShare || this.sharingRank) return;
    this.sharingRank = true;
    try {
      const shared = await this.rankShare.shareInBrowser(this.browserShare.file, this.browserShare.text);
      this.shareFeedback = shared ? 'Your achievement card was shared.'
        : 'Image sharing is unavailable. Download your image and copy the message below.';
    } catch (error) {
      if (!this.isShareCancelled(error)) this.shareFeedback = 'Download your image and copy the message below.';
    } finally {
      this.sharingRank = false;
    }
  }

  private clearBrowserShare(): void {
    if (this.browserShareUrl) URL.revokeObjectURL(this.browserShareUrl);
    this.browserShareUrl = null;
    this.browserShare = null;
  }

  private isShareCancelled(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    const message = typeof error === 'object' && error && 'message' in error
      ? error.message
      : error;
    return /\b(cancel(?:ed|led|lation)?|abort(?:ed)?)\b/i.test(String(message));
  }

  avatarUrl(user: CoinLeaderboardUser): string | null {
    const key = String(user.userId);
    if (this.failedAvatars.has(key)) return this.defaultAvatarUrl;
    const value = user.avatar?.trim();
    if (value && (/^https?:\/\//i.test(value) || value.startsWith('assets/'))) return value;
    const asset = this.avatars.getLeaderboardAvatar(value, user.age);
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
