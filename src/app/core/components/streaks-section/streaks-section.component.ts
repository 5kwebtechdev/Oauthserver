import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { StreaksService, StreakLeaderboardUser, CurrentUserStreak, StreakLeaderboardResponse } from '../../services/streaks.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../mindful-pet/mindful-pet.component';

@Component({
  selector: 'app-streaks-section',
  templateUrl: './streaks-section.component.html',
  styleUrls: ['./streaks-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent]
})
export class StreaksSectionComponent implements OnInit, ViewWillEnter {
  @Input() title = 'Top Streakers';
  @Input() showRankBanner = true;

  currentUser: CurrentUserStreak | null = null;
  streaks: any[] = [];

  get rankedStreaks(): any[] {
    return this.streaks?.length ? this.streaks.slice().sort((a: any, b: any) => (b.highestStreak || 0) - (a.highestStreak || 0)) : [];
  }

  constructor(private streaksService: StreaksService, private childImageService: ChildSelfImageService) { }

  ngOnInit(): void { this.loadData(); }

  ionViewWillEnter(): void { this.loadData(); }

  private loadData(): void {
    this.streaksService.getLeaderboard().subscribe({
      next: (response: StreakLeaderboardResponse) => {
        this.currentUser = response.currentUser;

        // Map API `topUsers` to the component model used by the template.
        // Use ChildSelfImageService to resolve avatar URLs from `avatarImageName`.
        this.streaks = (response.topUsers || []).map(u => {
          const uu: any = u as any;
          // prefer normalized `highestStreak` (service maps from currentStreak if provided)
          const highest = uu.highestStreak ?? uu.currentStreak ?? 0;
          // give ChildSelfImageService the original avatarImageName if present, else the raw avatar url
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