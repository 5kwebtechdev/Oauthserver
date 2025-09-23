import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreaksListComponent, StreakItem } from '../streaks-list/streaks-list.component';

@Component({
  selector: 'app-streaks-leaderboard',
  templateUrl: './streaks-leaderboard.component.html',
  styleUrls: ['./streaks-leaderboard.component.scss']
  ,
  standalone: true,
  imports: [CommonModule, StreaksListComponent]
})
export class StreaksLeaderboardComponent {
  @Input() title: string = 'Top Streakers';
  @Input() showRankBanner: boolean = true;

  // sample data — use the StreakItem shape so binding is type-safe
  @Input() streaks: StreakItem[] = [
    { rank: 1, name: 'Penguin', days: 105, avatar: 'assets/app-assets/Child Avatar.png', change: 'up' },
    { rank: 2, name: 'Lion', days: 100, avatar: 'assets/app-assets/Child Avatar.png', change: 'up' },
    { rank: 3, name: 'Fox', days: 90, avatar: 'assets/app-assets/Child Avatar.png', change: 'down' },
    { rank: 4, name: 'Koala', days: 85, avatar: 'assets/app-assets/Child Avatar.png' },
    { rank: 5, name: 'Giraffe', days: 80, avatar: 'assets/app-assets/Child Avatar.png' }
  ];

  // minor helper
  getDaysLabel(days:number){
    return `${days} days`;
  }
}
