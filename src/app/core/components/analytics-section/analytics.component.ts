import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { NavigationService } from '../../services/navigation.service';
import { StreaksService, CurrentUserStreak, StreakLeaderboardResponse } from '../../services/streaks.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  currentUser: CurrentUserStreak | null = null;
  topStreaks: any[] = [];
  loading = true;

  constructor(
    private navigation: NavigationService,
    private streaksService: StreaksService
  ) {}

  ngOnInit(): void {
    this.streaksService.getLeaderboard().subscribe({
      next: (response: StreakLeaderboardResponse) => {
        this.currentUser = response.currentUser;
        this.topStreaks = (response.topUsers || [])
          .slice()
          .sort((a: any, b: any) => (b.highestStreak || 0) - (a.highestStreak || 0));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  goBack(): void {
    this.navigation.back();
  }
}
