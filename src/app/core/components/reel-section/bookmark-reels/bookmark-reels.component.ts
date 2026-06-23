import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';

@Component({
  selector: 'bookmark-reels',
  templateUrl: './bookmark-reels.component.html',
  styleUrls: ['./bookmark-reels.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeCardHeaderComponent]
})
export class BookmarkReelsComponent implements OnInit {
  @Input() items: any[] = [];
  title = 'Bookmarked Reels';

  constructor(private router: Router, private route: ActivatedRoute) { }
  // Bookmarked categories with their reels
  bookmarkedCategories = [
    {
      category: 'Science Wonders',
      reels: [
        { id: 1, image: 'assets/images/reel-1-placeholder.png', title: 'Epic Volcano Eruption' },
        { id: 2, image: 'assets/images/reel-1-placeholder.png', title: 'Crystal Growing' },
        { id: 3, image: 'assets/images/reel-1-placeholder.png', title: 'Magnet Tricks' },
        { id: 4, image: 'assets/images/reel-1-placeholder.png', title: 'Physics Fun' }
      ]
    },
    {
      category: 'Creative Arts',
      reels: [
        { id: 5, image: 'assets/images/reel-1-placeholder.png', title: 'Sunset Painting' },
        { id: 6, image: 'assets/images/reel-1-placeholder.png', title: 'Finger Art' },
        { id: 7, image: 'assets/images/reel-1-placeholder.png', title: 'Paper Crafts' },
        { id: 8, image: 'assets/images/reel-1-placeholder.png', title: 'Drawing Tips' }
      ]
    },
    {
      category: 'Comedy & Fun',
      reels: [
        { id: 9, image: 'assets/images/reel-1-placeholder.png', title: 'Funny Faces' },
        { id: 10, image: 'assets/images/reel-1-placeholder.png', title: 'Pet Tricks' },
        { id: 11, image: 'assets/images/reel-1-placeholder.png', title: 'Dance Moves' },
        { id: 12, image: 'assets/images/reel-1-placeholder.png', title: 'Jokes Time' }
      ]
    },
    {
      category: 'Science Wonders',
      reels: [
        { id: 13, image: 'assets/images/reel-1-placeholder.png', title: 'Space Facts' },
        { id: 14, image: 'assets/images/reel-1-placeholder.png', title: 'Robot Building' },
        { id: 15, image: 'assets/images/reel-1-placeholder.png', title: 'Chemistry Fun' },
        { id: 16, image: 'assets/images/reel-1-placeholder.png', title: 'Cool Experiments' }
      ]
    }
  ];

  ngOnInit() {
    // Load bookmarked reels from a service or local storage
    // For now, using mock data above

    // Detect if we came from My Reels (router set query param) so header reads "My Reels"
    const src = this.route.snapshot.queryParamMap.get('source');
    if (src === 'my-reels') {
      this.title = 'My Reels';
    }
  }

  goBack(): void {
    window.history.back();
  }

  onViewAll(): void {
    // Navigate to the global reels listing (adjust route if needed)
    this.router.navigate(['/authed/reels']);
  }

  openReel(reelOrCategory: any): void {
    // If this looks like a category object, navigate to the all-reels listing
    // passing the category name as a route parameter so AllReelsComponent
    // can read it via route.paramMap.get('category').
    if (reelOrCategory && reelOrCategory.category) {
      const cat = reelOrCategory.category;
      // Use matrix param so paramMap will contain 'category'
      this.router.navigate(['/authed/reels', { category: encodeURIComponent(cat) }]);
      return;
    }

    // Otherwise treat it as a single reel selection (placeholder behavior)
    console.log('Opening reel:', reelOrCategory);
  }
}
