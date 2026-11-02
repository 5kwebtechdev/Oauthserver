import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-all-reels',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './all-reels.component.html',
  styleUrls: ['./all-reels.component.scss']
})
export class AllReelsComponent {
  constructor(private router: Router) {}

  // demo reels — same as reel-homepage
  reels = [
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'fun', author: 'Aanya', title: 'Magic Tricks', duration: '0:30', likes: '1.2k' },
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'science', author: 'Ravi', title: 'Simple Rocket', duration: '0:45', likes: '950' },
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'art', author: 'Maya', title: 'Clay Play', duration: '0:20', likes: '720' }
  ];

  // categories — same as reel-homepage
  categories = [
    {
      title: 'Science Wonders',
      key: 'science',
      reels: [this.reels[1], this.reels[0], this.reels[2]]
    },
    {
      title: 'Creative Arts',
      key: 'art',
      reels: [this.reels[2], this.reels[0], this.reels[1]]
    },
    {
      title: 'Comedy & Fun',
      key: 'fun',
      reels: [this.reels[0], this.reels[1], this.reels[2]]
    }
  ];

  // all reels from all categories
  allReels = this.categories.flatMap(cat => cat.reels);

  // helper to get preview images (ensures 4 thumbnails always)
  previewImages(cat: any) {
    const arr = [] as any[];
    for (let i = 0; i < 4; i++) {
      arr.push(cat.reels[i] ? cat.reels[i] : cat.reels[i % cat.reels.length]);
    }
    return arr;
  }

  goBack() {
    // use browser history to go back; adjust to router.navigate if you prefer
    try { window.history.back(); } catch (e) { /* ignore */ }
  }
}
