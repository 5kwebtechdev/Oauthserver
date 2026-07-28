import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

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
}

@Component({
  selector: 'reel-preview-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reel-preview.component.html',
  styleUrls: ['./reel-preview.component.scss']
})
export class ReelPreviewSectionComponent implements OnInit {
  @Input() title = 'Made by Kids, for Kids!';
  @Input() subtitle = 'Watch reels • Create • Get Inspired';
  @Input() maxItems = 6;

  items: ReelPreviewItem[] = [];
  isLoading = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadReels();
  }

  trackByReel(_: number, item: ReelPreviewItem): string | number {
    return item.id;
  }

  onThumbnailError(item: ReelPreviewItem): void {
    item.thumbnailUrl = undefined;
  }

  private loadReels(): void {
    this.http.get<unknown>(`${environment.apiUrl}/reels`).pipe(
      map(response => this.normalizeResponse(response)),
      switchMap(items => items.length ? of(items) : this.loadPublicReels()),
      catchError(() => this.loadPublicReels())
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

  private loadPublicReels() {
    const userId = this.authService.getUserId();
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<unknown>(`${environment.apiUrl}/api/reels`, { params }).pipe(
      map(response => this.normalizeResponse(response)),
      catchError(() => of([] as ReelPreviewItem[]))
    );
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
        const videoId = String(raw?.videoId ?? raw?.youtubeVideoId ?? '').trim() || undefined;
        const thumbnailUrl = String(
          raw?.thumbnailUrl ?? raw?.thumbnail ?? raw?.imageUrl ?? raw?.image ?? ''
        ).trim() || (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : undefined);

        return {
          id: raw?.id ?? videoId ?? index,
          videoId,
          thumbnailUrl,
          category: this.firstText(raw?.category?.name, raw?.categoryName, raw?.category),
          author: this.firstText(raw?.author?.name, raw?.user?.name, raw?.creatorName, raw?.authorName),
          authorAvatarUrl: this.firstText(raw?.author?.avatarUrl, raw?.user?.profilePicUrl, raw?.creatorAvatarUrl),
          title: this.firstText(raw?.title, raw?.reelTitle, raw?.caption, raw?.description),
          likeCount: this.toOptionalNumber(raw?.likeCount ?? raw?.likes),
          commentCount: this.toOptionalNumber(raw?.commentCount ?? raw?.comments)
        };
      })
      .filter((item: ReelPreviewItem) => !!item.thumbnailUrl || !!item.videoId || !!item.title);
  }

  private firstText(...values: unknown[]): string | undefined {
    const match = values.find(value => typeof value === 'string' && value.trim().length);
    return typeof match === 'string' ? match.trim() : undefined;
  }

  private toOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
