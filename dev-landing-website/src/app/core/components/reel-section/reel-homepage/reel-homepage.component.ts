import { Component } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../../footer/footer.component';
import { ReelsCardComponent } from '../reels-card/reels-card.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';

@Component({
  selector: 'app-reel-homepage',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent, ReelsCardComponent, SupermeButtonComponent, RouterModule],
  templateUrl: './reel-homepage.component.html',
  styleUrls: ['./reel-homepage.component.scss']
})
export class ReelHomepageComponent {
  constructor(private router: Router) {}
  // demo reels — replace with real service data
  reels = [
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'fun', author: 'Aanya', title: 'Magic Tricks', duration: '0:30', likes: '1.2k' },
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'science', author: 'Ravi', title: 'Simple Rocket', duration: '0:45', likes: '950' },
    { image: '/assets/images/Image-Reel-Random.jpg', tag: 'art', author: 'Maya', title: 'Clay Play', duration: '0:20', likes: '720' }
  ];

  /** Category sections — used by the template to render each category block */
  categories = [
    {
      title: 'Science Wonders',
      key: 'science',
      // sample reels for this category (demo data)
      reels: [ this.reels[1], this.reels[0], this.reels[2] ]
    },
    {
      title: 'Creative Arts',
      key: 'art',
      reels: [ this.reels[2], this.reels[0], this.reels[1] ]
    },
    {
      title: 'Comedy & Fun',
      key: 'fun',
      reels: [ this.reels[0], this.reels[1], this.reels[2] ]
    }
  ];

  goBack() {
    // use browser history to go back; adjust to router.navigate if you prefer
    try { window.history.back(); } catch (e) { /* ignore */ }
  }

  // user-specific reels (empty by default) — used for the "My Reels" empty state
  userReels: any[] = this.categories.flatMap(cat => cat.reels).slice(0, 4);

  // scroll the page to the reels grid (used by My Reels -> View all)
  scrollToReels() {
    // Navigate to all reels page
    this.router.navigate(['/reels/all']);
  }

  openUpload() {
    // Navigate to the upload reel page
    this.router.navigate(['/reels/upload']);
  }

  openBookmarks() {
    // Navigate to the bookmarked reels page
    this.router.navigate(['/reels/bookmarks']);
  }
}
