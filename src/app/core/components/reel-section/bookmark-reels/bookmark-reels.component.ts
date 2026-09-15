import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { SupermeCardHeaderComponent } from '../../superme-navigator/superme-card-header/superme-card-header.component';
import { ReelsExpandComponent } from '../reel-expand/reels-expand.component';
import { ReelService, YoutubeReel } from '../../../services/reel.service';
import { ReelBookmarksService } from '../../../services/reel-bookmarks.service';

interface BookmarkedReel {
  id: number;
  videoId: string;
  image: string;
  title: string;
  author: string;
  avatar: string;
  likes: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  video: string;
  tags: string;
  category: string;
  duration: string;
  link?: string;
}

@Component({
  selector: 'bookmark-reels',
  templateUrl: './bookmark-reels.component.html',
  styleUrls: ['./bookmark-reels.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeCardHeaderComponent, ReelsExpandComponent]
})
export class BookmarkReelsComponent implements OnInit {
  readonly fallbackThumbnail = 'assets/figma/reels/reel-volcano.webp';
  title = 'Bookmarked Reels';
  reels: BookmarkedReel[] = [];
  isLoading = true;
  private showMyReels = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly reelService: ReelService,
    private readonly reelBookmarks: ReelBookmarksService
  ) {}

  ngOnInit(): void {
    this.showMyReels = this.route.snapshot.queryParamMap.get('source') === 'my-reels';
    if (this.showMyReels) {
      this.title = 'My Reels';
    }
    this.loadReels();
  }

  goBack(): void {
    window.history.back();
  }

  openReel(reel: BookmarkedReel): void {
    const startIndex = this.reels.findIndex(item => item.id === reel.id);
    window.dispatchEvent(new CustomEvent('openReelPlayAll', {
      detail: { slides: this.reels, startIndex: Math.max(0, startIndex) }
    }));
  }

  onThumbnailError(reel: BookmarkedReel): void {
    if (reel.image !== this.fallbackThumbnail) {
      reel.image = this.fallbackThumbnail;
    }
  }

  removeBookmark(reel: BookmarkedReel, event: Event): void {
    event.stopPropagation();
    this.reelBookmarks.toggle(reel.id);
    this.reels = this.reels.filter(item => item.id !== reel.id);
  }

  trackReel(_index: number, reel: BookmarkedReel): number {
    return reel.id;
  }

  private loadReels(): void {
    const savedIds = this.reelBookmarks.savedIds();
    this.reelService.getReels().subscribe({
      next: rows => {
        const sourceRows = this.showMyReels ? rows : rows.filter(reel => savedIds.has(String(reel.id)));
        this.reels = sourceRows.map(reel => this.toViewModel(reel));
        this.isLoading = false;
      },
      error: () => {
        this.reels = [];
        this.isLoading = false;
      }
    });
  }

  private toViewModel(reel: YoutubeReel): BookmarkedReel {
    const raw = reel as Record<string, unknown>;
    const videoId = String(reel.videoId || '').trim();
    return {
      id: reel.id,
      videoId,
      image: this.firstText(raw['thumbnailUrl'], raw['thumbnail'])
        || (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : this.fallbackThumbnail),
      title: this.firstText(raw['title'], raw['caption'], raw['description']) || 'YouTube Reel',
      author: this.firstText(raw['author'], raw['creatorName']) || 'SuperMe Creator',
      avatar: this.firstText(raw['authorAvatarUrl'], raw['avatarUrl']) || 'assets/figma/reels/avatar.webp',
      likes: String(Number(reel.likeCount) || 0),
      likeCount: Number(reel.likeCount) || 0,
      commentCount: Number(reel.commentCount) || 0,
      liked: Boolean(reel.liked),
      saved: this.reelBookmarks.isSaved(reel.id),
      video: '',
      tags: this.firstText(raw['tags'], raw['hashtags']) || '',
      category: this.firstText(raw['categoryName'], raw['category']) || '',
      duration: this.firstText(raw['duration'], raw['timeDuration']) || '',
      link: videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : undefined
    };
  }

  private firstText(...values: unknown[]): string | undefined {
    const match = values.find(value => typeof value === 'string' && value.trim());
    return typeof match === 'string' ? match.trim() : undefined;
  }
}
