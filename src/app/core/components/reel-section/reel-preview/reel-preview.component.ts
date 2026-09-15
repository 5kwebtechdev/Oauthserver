import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ReelService } from '../../../services/reel.service';
import { ReelBookmarksService } from '../../../services/reel-bookmarks.service';
import { ReelsExpandComponent } from '../reel-expand/reels-expand.component';

export interface ReelPreviewItem {
  id: string | number;
  videoId?: string;
  thumbnailUrl?: string;
  category?: string;
  author?: string;
  authorAvatarUrl?: string;
  title?: string;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
}

@Component({
  selector: 'reel-preview-section',
  standalone: true,
  imports: [CommonModule, RouterModule, ReelsExpandComponent],
  templateUrl: './reel-preview.component.html',
  styleUrls: ['./reel-preview.component.scss']
})
export class ReelPreviewSectionComponent implements OnInit {
  private readonly fallbackThumbnailUrl = 'assets/figma/reels/reel-volcano.webp';

  @Input() title = 'Made by Kids, for Kids!';
  @Input() subtitle = 'Watch reels • Create • Get Inspired';
  @Input() maxItems = 6;

  items: ReelPreviewItem[] = [];
  isLoading = true;

  constructor(
    private readonly reelService: ReelService,
    private readonly reelBookmarks: ReelBookmarksService
  ) {}

  ngOnInit(): void {
    this.loadReels();
  }

  trackByReel(_: number, item: ReelPreviewItem): string | number {
    return item.id;
  }

  onThumbnailError(item: ReelPreviewItem): void {
    item.thumbnailUrl = item.thumbnailUrl === this.fallbackThumbnailUrl
      ? undefined
      : this.fallbackThumbnailUrl;
  }

  openReel(item: ReelPreviewItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const slides = this.items.map(reel => ({
      id: reel.id,
      videoId: reel.videoId || '',
      image: reel.thumbnailUrl || this.fallbackThumbnailUrl,
      avatar: reel.authorAvatarUrl || 'assets/figma/reels/avatar.webp',
      author: reel.author || 'SuperMe Creator',
      title: reel.title || 'YouTube Reel',
      category: reel.category || '',
      tags: '',
      video: '',
      duration: '',
      liked: Boolean(reel.liked),
      saved: this.reelBookmarks.isSaved(reel.id),
      likeCount: reel.likeCount || 0,
      likes: String(reel.likeCount || 0),
      commentCount: reel.commentCount || 0,
      link: reel.videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(reel.videoId)}` : undefined
    }));
    const startIndex = this.items.findIndex(reel => reel.id === item.id);

    window.dispatchEvent(new CustomEvent('openReelPlayAll', {
      detail: { slides, startIndex: Math.max(0, startIndex) }
    }));
  }

  private loadReels(): void {
    this.reelService.getReels().pipe(
      map(response => this.normalizeResponse(response)),
      catchError(() => of([] as ReelPreviewItem[]))
    ).subscribe({
      next: items => {
        this.items = items.slice(0, this.maxItems);
        this.isLoading = false;
      },
      error: () => {
        this.items = [];
        this.isLoading = false;
      }
    });
  }

  private normalizeResponse(response: unknown): ReelPreviewItem[] {
    const payload = response as any;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.reels)
            ? payload.reels
            : [];

    return rows
      .map((raw: any, index: number): ReelPreviewItem => {
        const videoSource = this.firstText(
          raw?.videoId,
          raw?.youtubeVideoId,
          raw?.videoUrl,
          raw?.reelUrl,
          raw?.url
        );
        const youtubeVideoId = this.extractYoutubeVideoId(videoSource);
        const videoId = youtubeVideoId || videoSource;
        const suppliedThumbnail = this.firstText(
          raw?.thumbnailUrl,
          raw?.thumbnail,
          raw?.thumbnailImageUrl,
          raw?.coverUrl,
          raw?.posterUrl,
          raw?.imageUrl,
          raw?.image
        );
        const thumbnailUrl = this.normalizeMediaUrl(suppliedThumbnail)
          || (youtubeVideoId
            ? `https://i.ytimg.com/vi/${encodeURIComponent(youtubeVideoId)}/hqdefault.jpg`
            : this.fallbackThumbnailUrl);

        return {
          id: raw?.id ?? videoId ?? index,
          videoId,
          thumbnailUrl,
          category: this.firstText(raw?.category?.name, raw?.categoryName, raw?.category),
          author: this.firstText(raw?.author?.name, raw?.user?.name, raw?.creatorName, raw?.authorName),
          authorAvatarUrl: this.firstText(raw?.author?.avatarUrl, raw?.user?.profilePicUrl, raw?.creatorAvatarUrl),
          title: this.firstText(raw?.title, raw?.reelTitle, raw?.caption, raw?.description),
          likeCount: this.toOptionalNumber(raw?.likeCount ?? raw?.likes),
          commentCount: this.toOptionalNumber(raw?.commentCount ?? raw?.comments),
          liked: Boolean(raw?.liked)
        };
      })
      .filter((item: ReelPreviewItem) => !!item.thumbnailUrl || !!item.videoId || !!item.title);
  }

  private firstText(...values: unknown[]): string | undefined {
    const match = values.find(value => typeof value === 'string' && value.trim().length);
    return typeof match === 'string' ? match.trim() : undefined;
  }

  private extractYoutubeVideoId(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    );
    return match?.[1];
  }

  private normalizeMediaUrl(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (/^(?:https?:|data:|blob:)/i.test(trimmed) || trimmed.startsWith('assets/')) {
      return trimmed;
    }

    try {
      return new URL(trimmed, `${environment.apiUrl.replace(/\/$/, '')}/`).toString();
    } catch {
      return undefined;
    }
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
