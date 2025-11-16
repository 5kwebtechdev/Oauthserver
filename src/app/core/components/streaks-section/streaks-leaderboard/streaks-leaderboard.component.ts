import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreaksListComponent, StreakItem } from '../streaks-list/streaks-list.component';
import { StreaksService } from '../../../services/streaks.service';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { IonicModule } from '@ionic/angular';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';

@Component({
  selector: 'app-streaks-leaderboard',
  templateUrl: './streaks-leaderboard.component.html',
  styleUrls: ['./streaks-leaderboard.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, StreaksListComponent, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent]
})
export class StreaksLeaderboardComponent implements OnInit {
  @Input() title: string = 'Top Streakers';
  @Input() showRankBanner: boolean = true;
  streaks: StreakItem[] = [];

  constructor(private streaksService: StreaksService) { }

  ngOnInit(): void {
    this.streaksService.getLeaderboard().subscribe({
      next: (data: StreakItem[]) => {
        this.streaks = data;
      },
      error: (err: any) => {
        // Optionally handle error, fallback to empty or show message
        this.streaks = [];
      }
    });
  }
}
