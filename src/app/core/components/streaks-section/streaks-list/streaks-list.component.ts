import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { SortStreaksPipe } from './sort-streaks.pipe';

export interface StreakItem {
  name: string;
  highestStreak: number;
  avatar?: string;
}

@Component({
  selector: 'app-streaks-list',
  templateUrl: './streaks-list.component.html',
  styleUrls: ['./streaks-list.component.scss'],
  standalone: true,
  imports: [CommonModule, SortStreaksPipe]
})
export class StreaksListComponent implements OnInit {
  items: StreakItem[] = [];

  constructor(private userService: UserService) { }

  ngOnInit(): void { }

  @Input('streaks')
  set streaksInput(value: StreakItem[] | undefined) {
    if (value && value.length) {
      this.items = value;
    }
  }

  formatDays(days: number) {
    return `${days} days`;
  }
}
