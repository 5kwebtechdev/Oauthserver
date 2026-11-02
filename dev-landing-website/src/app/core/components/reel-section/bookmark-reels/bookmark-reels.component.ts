import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../footer/footer.component';
import { ReelService } from '../../../services/reel/reel.service';
import { combineLatest } from 'rxjs';

@Component({
            selector: 'app-bookmark-reels',
            standalone: true,
            imports: [CommonModule, FooterComponent],
            templateUrl: './bookmark-reels.component.html',
            styleUrls: ['./bookmark-reels.component.scss']
})
export class BookmarkReelsComponent implements OnInit {
    constructor(private router: Router, private reelService: ReelService) {}

        // user's bookmarked reels (flat)
        reels: any[] = [];

        // categories array grouped from bookmarked reels (title, key, reels)
        categories: any[] = [];

        allReels: any[] = [];

        ngOnInit() {
            // Combine categories (from service) and bookmarked reels so we can group bookmarks by category
            combineLatest([this.reelService.categories$, this.reelService.getBookmarkedReels()])
                .subscribe({
                    next: ([categories, reels]) => {
                        this.reels = reels || [];
                        this.allReels = this.reels;

                        // Map service categories to include bookmarked reels for each category (show all categories)
                        const mapped: any[] = [];
                        const knownCategoryIds = new Set<number>();
                        for (const cat of categories || []) {
                          knownCategoryIds.add(cat.id);
                          const catReels = (this.reels || []).filter(r => r.categoryId === cat.id);
                          mapped.push({ title: cat.name, key: cat.id, reels: catReels });
                        }

                        // Any reels with category ids not in the categories list -> group under 'Other'
                        const leftovers = (this.reels || []).filter(r => !knownCategoryIds.has(r.categoryId));
                        if (leftovers.length) {
                          mapped.push({ title: 'Other', key: 'other', reels: leftovers });
                        }

                        this.categories = mapped;
                    },
                    error: (err) => {
                        console.error('Failed to load bookmarked reels or categories:', err);
                        this.reels = [];
                        this.categories = [ { title: 'Science Wonders', key: 'bookmarked', reels: [] } ];
                        this.allReels = [];
                    }
                });
        }

    // helper to get preview images (ensures 4 thumbnails always)
    previewImages(cat: any) {
        const arr = [] as any[];
        for (let i = 0; i < 4; i++) {
            arr.push(cat.reels[i] ? cat.reels[i] : (cat.reels.length ? cat.reels[i % cat.reels.length] : { image: '/assets/images/Image-Reel-Random.jpg' }));
        }
        return arr;
    }

    // Return a category object by title (falls back to empty category)
    getCategoryByTitle(title: string) {
        const found = (this.categories || []).find((c: any) => c.title === title);
        if (found) return found;
        return { title, key: title.toLowerCase().replace(/\s+/g, '-'), reels: [] };
    }

    // Helper to get preview images by category title (safe wrapper)
    getPreviewImagesByTitle(title: string) {
        const cat = this.getCategoryByTitle(title);
        return this.previewImages(cat);
    }

    goBack() {
        // use browser history to go back; adjust to router.navigate if you prefer
        try { window.history.back(); } catch (e) { /* ignore */ }
    }
}
