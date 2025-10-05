import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';

@Component({
  selector: 'bookmark-reels',
  templateUrl: './bookmark-reels.component.html',
  styleUrls: ['./bookmark-reels.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent]
})
export class BookmarkReelsComponent implements OnInit {
  @Input() items: any[] = [];

  // Bookmarked categories with their reels
  bookmarkedCategories = [
    {
      category: 'Science Wonders',
      reels: [
        { id: 1, image: '/assets/images/reel-1-placeholder.png', title: 'Epic Volcano Eruption' },
        { id: 2, image: '/assets/images/reel-1-placeholder.png', title: 'Crystal Growing' },
        { id: 3, image: '/assets/images/reel-1-placeholder.png', title: 'Magnet Tricks' },
        { id: 4, image: '/assets/images/reel-1-placeholder.png', title: 'Physics Fun' }
      ]
    },
    {
      category: 'Creative Arts',
      reels: [
        { id: 5, image: '/assets/images/reel-1-placeholder.png', title: 'Sunset Painting' },
        { id: 6, image: '/assets/images/reel-1-placeholder.png', title: 'Finger Art' },
        { id: 7, image: '/assets/images/reel-1-placeholder.png', title: 'Paper Crafts' },
        { id: 8, image: '/assets/images/reel-1-placeholder.png', title: 'Drawing Tips' }
      ]
    },
    {
      category: 'Comedy & Fun',
      reels: [
        { id: 9, image: '/assets/images/reel-1-placeholder.png', title: 'Funny Faces' },
        { id: 10, image: '/assets/images/reel-1-placeholder.png', title: 'Pet Tricks' },
        { id: 11, image: '/assets/images/reel-1-placeholder.png', title: 'Dance Moves' },
        { id: 12, image: '/assets/images/reel-1-placeholder.png', title: 'Jokes Time' }
      ]
    },
    {
      category: 'Science Wonders',
      reels: [
        { id: 13, image: '/assets/images/reel-1-placeholder.png', title: 'Space Facts' },
        { id: 14, image: '/assets/images/reel-1-placeholder.png', title: 'Robot Building' },
        { id: 15, image: '/assets/images/reel-1-placeholder.png', title: 'Chemistry Fun' },
        { id: 16, image: '/assets/images/reel-1-placeholder.png', title: 'Cool Experiments' }
      ]
    }
  ];

  constructor(private router: Router) { }

  ngOnInit() {
    // Load bookmarked reels from a service or local storage
    // For now, using mock data above
  }

  goBack(): void {
    window.history.back();
  }

  openReel(reel: any): void {
    // Navigate to reel detail or play reel
    console.log('Opening reel:', reel);
  }
}
