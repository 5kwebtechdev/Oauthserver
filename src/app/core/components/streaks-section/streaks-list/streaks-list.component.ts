import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';

export interface StreakItem {
  rank: number;
  name: string;
  days: number;
  avatar?: string; // path to avatar image
  change?: 'up' | 'down' | 'same';
}

@Component({
  selector: 'app-streaks-list',
  templateUrl: './streaks-list.component.html',
  styleUrls: ['./streaks-list.component.scss']
  ,
  standalone: true,
  imports: [CommonModule]
})
export class StreaksListComponent implements OnInit {
  // sample data — replace or bind to an API as needed
  items: StreakItem[] = [
    { rank: 1, name: 'Penguin', days: 105, avatar: 'assets/avatars/penguin.png', change: 'up' },
    { rank: 2, name: 'Lion', days: 100, avatar: 'assets/avatars/lion.png', change: 'up' },
    { rank: 3, name: 'Fox', days: 90, avatar: 'assets/avatars/fox.png', change: 'down' },
    { rank: 4, name: 'Koala', days: 85, avatar: 'assets/avatars/koala.png' },
    { rank: 5, name: 'Giraffe', days: 80, avatar: 'assets/avatars/giraffe.png' },
    { rank: 6, name: 'Elephant', days: 75, avatar: 'assets/avatars/elephant.png' },
    { rank: 7, name: 'Zebra', days: 70, avatar: 'assets/avatars/zebra.png' },
    { rank: 8, name: 'Lion', days: 65, avatar: 'assets/avatars/lion2.png' },
    { rank: 9, name: 'You', days: 56, avatar: 'assets/avatars/you.png' },
    { rank: 10, name: 'Panda', days: 52, avatar: 'assets/avatars/panda.png' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Update 'You' item with current user's avatar
    this.updateUserAvatar();
    
    // Subscribe to user profile changes
    this.userService.getUserProfile$().subscribe(() => {
      this.updateUserAvatar();
    });
  }

  private updateUserAvatar(): void {
    const userItem = this.items.find(item => item.name === 'You');
    if (userItem) {
      userItem.avatar = this.userService.getUserAvatarUrl();
      const userName = this.userService.getUserName();
      if (userName && userName !== 'User') {
        userItem.name = userName;
      }
    }
  }

  // allow parent components to pass a list of streaks; falls back to internal sample data
  @Input('streaks')
  set streaksInput(value: StreakItem[] | undefined) {
    if (value && value.length) {
      this.items = value;
    }
  }

  // helper for display
  formatDays(days: number) {
    return `${days} days`;
  }
}
