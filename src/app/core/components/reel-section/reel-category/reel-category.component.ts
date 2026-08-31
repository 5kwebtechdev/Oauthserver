import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

import { ReelsExpandComponent } from '../reel-expand/reels-expand.component';
import { ReelService, YoutubeReel } from '../../../services/reel.service';
import { ReelBookmarksService } from '../../../services/reel-bookmarks.service';

interface ReelCategory {
  label: string;
  icon: string;
}

interface ReelItem {
  id: number;
  videoId: string;
  category: string;
  author: string;
  title: string;
  duration: string;
  likes: string;
  tags: string;
  image: string;
  avatar: string;
  video: string;
  aiGenerated?: boolean;
  saved: boolean;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  link?: string;
}

@Component({
  selector: 'reel-category',
  templateUrl: './reel-category.component.html',
  styleUrls: ['./reel-category.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReelsExpandComponent]
})
export class ReelCategoryComponent implements OnInit {
  readonly categories: ReelCategory[] = [
    { label: 'Education', icon: 'assets/figma/reels/categories/education.png' },
    { label: 'How-to', icon: 'assets/figma/reels/categories/how-to.png' },
    { label: 'Arts & Creativity', icon: 'assets/figma/reels/categories/arts-creativity.png' },
    { label: 'Entertainment', icon: 'assets/figma/reels/categories/entertainment.png' },
    { label: 'Fitness', icon: 'assets/figma/reels/categories/fitness.png' },
    { label: 'Animals & Nature', icon: 'assets/figma/reels/categories/animals-nature.png' },
    { label: 'Food', icon: 'assets/figma/reels/categories/food.png' },
    { label: 'STEM', icon: 'assets/figma/reels/categories/stem.png' },
    { label: 'Motivational', icon: 'assets/figma/reels/categories/motivational.png' },
    { label: 'Gaming', icon: 'assets/figma/reels/categories/gaming.png' },
    { label: 'People & Vlogs', icon: 'assets/figma/reels/categories/people-vlogs.png' },
    { label: 'Productivity', icon: 'assets/figma/reels/categories/productivity.png' }
  ];

  slides: ReelItem[] = [];

  selectedCategory = 'All';
  searchTerm = '';

  constructor(
    private readonly router: Router,
    private readonly reelService: ReelService,
    private readonly reelBookmarks: ReelBookmarksService
  ) {}

  ngOnInit(): void {
    this.loadReels();
  }

  get filteredSlides(): ReelItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.slides.filter(reel => {
      const matchesCategory = this.selectedCategory === 'All' || reel.category === this.selectedCategory;
      const matchesSearch = !query || [reel.title, reel.author, reel.category, reel.tags]
        .some(value => value.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }

  goBack(): void {
    window.history.back();
  }

  openBookmarks(): void {
    this.router.navigate(['/authed/bookmark-reels']);
  }

  goToMyReels(): void {
    this.router.navigate(['/authed/bookmark-reels'], { queryParams: { source: 'my-reels' } });
  }

  openUpload(): void {
    this.router.navigate(['/authed/upload-reel']);
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  openReel(reel: ReelItem, event?: Event): void {
    event?.stopPropagation();
    const playlist = this.filteredSlides;
    const startIndex = playlist.findIndex(item => item.id === reel.id);
    window.dispatchEvent(new CustomEvent('openReelPlayAll', {
      detail: {
        slides: playlist,
        startIndex: Math.max(0, startIndex)
      }
    }));
  }

  toggleSave(reel: ReelItem, event: Event): void {
    event.stopPropagation();
    reel.saved = this.reelBookmarks.toggle(reel.id);
  }

  onCardKeydown(event: KeyboardEvent, reel: ReelItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openReel(reel, event);
    }
  }

  trackCategory(_index: number, category: ReelCategory): string {
    return category.label;
  }

  trackReel(_index: number, reel: ReelItem): number {
    return reel.id;
  }

  private loadReels(): void {
    this.reelService.getReels().subscribe({
      next: reels => {
        this.slides = reels.map(reel => this.toReelItem(reel));
      },
      error: () => {
        this.slides = [];
      }
    });
  }

  private toReelItem(reel: YoutubeReel): ReelItem {
    const source = reel as Record<string, unknown>;
    const videoId = String(reel.videoId || '').trim();
    const category = this.firstText(source['categoryName'], source['category']) || '';
    const author = this.firstText(source['author'], source['creatorName']) || 'SuperMe Creator';
    const title = this.firstText(source['title'], source['caption'], source['description']) || 'YouTube Reel';
    const duration = this.firstText(source['duration'], source['timeDuration']) || '';
    const image = this.firstText(source['thumbnailUrl'], source['thumbnail'])
      || (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : 'assets/figma/reels/reel-volcano.png');
    const avatar = this.firstText(source['authorAvatarUrl'], source['avatarUrl']) || 'assets/figma/reels/avatar.png';

    return {
      id: reel.id,
      videoId,
      category,
      author,
      title,
      duration,
      likes: this.formatCount(reel.likeCount),
      tags: this.firstText(source['tags'], source['hashtags']) || '',
      image,
      avatar,
      video: '',
      aiGenerated: Boolean(source['aiGenerated']),
      saved: this.reelBookmarks.isSaved(reel.id),
      liked: Boolean(reel.liked),
      likeCount: Number(reel.likeCount) || 0,
      commentCount: Number(reel.commentCount) || 0,
      link: videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : undefined
    };
  }

  private firstText(...values: unknown[]): string | undefined {
    const match = values.find(value => typeof value === 'string' && value.trim());
    return typeof match === 'string' ? match.trim() : undefined;
  }

  private formatCount(value: unknown): string {
    const count = Number(value) || 0;
    return count >= 1000
      ? `${Number((count / 1000).toFixed(count >= 10000 ? 0 : 1))}K`
      : String(count);
  }
}
