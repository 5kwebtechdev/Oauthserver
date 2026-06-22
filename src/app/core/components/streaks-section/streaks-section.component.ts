import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { StreaksService, StreakLeaderboardUser, CurrentUserStreak, StreakLeaderboardResponse } from '../../services/streaks.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { SupermeSpeechBubbleComponent } from '../superme-speech-bubble/superme-speech-bubble.component';
import { SupermePetComponent } from '../superme-pet/superme-pet.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-streaks-section',
  templateUrl: './streaks-section.component.html',
  styleUrls: ['./streaks-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent, SupermeSpeechBubbleComponent, SupermePetComponent, FooterComponent]
})
export class StreaksSectionComponent implements OnInit, ViewWillEnter {
  @Input() title = 'Top Streakers';
  @Input() showRankBanner = true;

  currentUser: CurrentUserStreak | null = null;
  currentUserAvatarUrl: string | null = null;
  streaks: any[] = [];

  get rankedStreaks(): any[] {
    return this.streaks?.length
      ? this.streaks.slice().sort((a: any, b: any) => (b.highestStreak || 0) - (a.highestStreak || 0))
      : [];
  }

  /** True when the current user already appears in the top list */
  get currentUserInList(): boolean {
    if (!this.currentUser?.rank) return true;
    return this.rankedStreaks.some(s => s.rank === this.currentUser!.rank);
  }

  constructor(private streaksService: StreaksService, private childImageService: ChildSelfImageService) { }

  ngOnInit(): void { this.loadData(); }
  ionViewWillEnter(): void { this.loadData(); }

  private loadData(): void {
    this.streaksService.getLeaderboard().subscribe({
      next: (response: StreakLeaderboardResponse) => {
        this.currentUser = response.currentUser;

        // Resolve current user avatar
        if (response.currentUser?.avatarName) {
          const info = this.childImageService.resolveAvatarForMember({ avatarImageName: response.currentUser.avatarName });
          this.currentUserAvatarUrl = info.url || null;
        } else {
          this.currentUserAvatarUrl = null;
        }

        this.streaks = (response.topUsers || []).map(u => {
          const uu: any = u as any;
          const highest = uu.highestStreak ?? uu.currentStreak ?? 0;
          const avatarSource = uu.avatarImageName ? { avatarImageName: uu.avatarImageName } : (uu.avatar ? { avatar: uu.avatar } : uu);
          const avatarInfo = this.childImageService.resolveAvatarForMember(avatarSource);
          return {
            rank: uu.rank,
            avatarName: uu.avatarName || '',
            highestStreak: highest,
            avatar: avatarInfo.url || null,
            avatarAlt: avatarInfo.alt || (uu.avatarName ? `${uu.avatarName} avatar` : null)
          };
        });
      },
      error: (error) => {
        console.error('Error fetching leaderboard data:', error);
        this.currentUser = null;
        this.streaks = [];
      }
    });
  }
}
