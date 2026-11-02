import { Component, OnInit, OnDestroy } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule, NgIf, NgForOf, NgClass } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';
import { StreakStatCardComponent } from '../streak-stat-card/streak-stat-card.component';
import { StreaksService, StreakLeaderboardUser, CurrentUserStreak, StreakLeaderboardResponse } from '../../../services/streaks.service';
import { ChildSelfImageService } from '../../../services/child-self-image.service';

interface TopStreaker {
  rank: number;
  avatarName: string;
  days: number;
  avatar?: string;
}

@Component({
  selector: 'streak-homepage',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, NgClass, PublicNavbarComponent, FooterComponent, StreakStatCardComponent],
  templateUrl: './streak-homepage.component.html',
  styleUrls: ['./streak-homepage.component.scss']
})
export class StreakHomepageComponent implements OnInit {
  // Stats
  currentStreakDays = 0;
  bestStreakDays = 0;
  totalActiveDays = 0;

  // Current user info
  currentUser: CurrentUserStreak | null = null;
  petMessage = 'No spot on the board...yet!\nBuild your streak and show them how it\'s done!';

  // Leaderboard data
  topStreakers: TopStreaker[] = [];

  // Loading state
  isLoading = false;
  // UI message when there's no leaderboard data
  emptyMessage: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private streaksService: StreaksService, private childSelfImageService: ChildSelfImageService) { }

  ngOnInit(): void {
    this.loadStreakData();
  }

  /**
   * Load streak leaderboard data from API
   */
  loadStreakData(): void {
    this.isLoading = true;
    this.streaksService.getLeaderboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: StreakLeaderboardResponse) => {
        this.currentUser = response.currentUser;

        // Set user stats (use fields available on CurrentUserStreak)
        this.currentStreakDays = this.currentUser?.currentStreak ?? 0;
        this.bestStreakDays = this.currentUser?.highestStreak ?? 0;
        this.totalActiveDays = this.currentUser?.totalActiveDays ?? 0;
        this.petMessage = this.currentUser?.petMessage || this.petMessage;

        // Map API `topUsers` to the component model used by the template.
        // Use ChildSelfImageService to resolve avatar URLs from `avatarImageName` or avatar data.
        this.topStreakers = (response.topUsers || []).map((u: any, index: number) => {
          const avatarSource = u.avatarImageName ? { avatarImageName: u.avatarImageName } : (u.avatar ? { avatar: u.avatar } : u);
          const avatarInfo = this.childSelfImageService.resolveAvatarForMember(avatarSource as any) || { url: null, alt: null };
          return {
            rank: u.rank ?? (index + 1),
            avatarName: u.avatarName || '',
            days: u.currentStreak ?? 0,
            avatar: avatarInfo.url || (u.avatar?.url || '/assets/icon/child-avatar.png')
          } as TopStreaker;
        }).sort((a, b) => (b.days || 0) - (a.days || 0));

        // If totalActiveDays was not provided by API, approximate from leaderboard
        // (but now it's provided, so no need)
        // if (!this.totalActiveDays) {
        //   this.totalActiveDays = this.topStreakers.reduce((s, t) => s + (t.days || 0), 0);
        // }

        this.emptyMessage = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching leaderboard data:', error);
        this.currentUser = null;
        this.topStreakers = [];
        // If API returns 404, show friendly empty message
        if (error && error.status === 404) {
          this.emptyMessage = 'No leaderboard data yet';
        } else {
          this.emptyMessage = 'Unable to load leaderboard';
        }
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatDays(d: number) {
    return `${d} day${d === 1 ? '' : 's'}`;
  }
}
