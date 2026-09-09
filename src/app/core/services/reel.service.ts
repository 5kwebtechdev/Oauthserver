import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface YoutubeReel {
  id: number;
  videoId: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  [key: string]: unknown;
}

export interface ReelStatus {
  liked: boolean;
  likeCount: number;
  commentCount: number;
}

export interface ReelLikeResult {
  liked: boolean;
  likeCount: number;
}

export interface ReelComment {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface ReelCategory {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ReelService {
  private readonly endpoint = `${environment.apiUrl}/api/reels`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  getReels(): Observable<YoutubeReel[]> {
    return this.http.get<YoutubeReel[]>(this.endpoint, this.authOptions());
  }

  /** Categories are managed in the admin panel and intentionally public. */
  getCategories(): Observable<ReelCategory[]> {
    return this.http.get<ReelCategory[]>(`${this.endpoint}/categories`);
  }

  getStatus(reelId: number | string): Observable<ReelStatus> {
    return this.http.get<ReelStatus>(`${this.endpoint}/${reelId}/status`, this.authOptions());
  }

  toggleLike(reelId: number | string): Observable<ReelLikeResult> {
    return this.http.post<ReelLikeResult>(`${this.endpoint}/${reelId}/like`, {}, this.authOptions());
  }

  getComments(reelId: number | string): Observable<ReelComment[]> {
    return this.http.get<ReelComment[]>(`${this.endpoint}/${reelId}/comments`, this.authOptions());
  }

  addComment(reelId: number | string, text: string): Observable<ReelComment> {
    return this.http.post<ReelComment>(
      `${this.endpoint}/${reelId}/comments`,
      { text },
      this.authOptions()
    );
  }

  addReel(youtubeLink: string): Observable<YoutubeReel> {
    return this.http.post<YoutubeReel>(this.endpoint, { youtubeLink }, this.authOptions());
  }

  deleteReel(reelId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${reelId}`, this.authOptions());
  }

  private authOptions(): { headers: HttpHeaders } {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }
    return { headers };
  }
}
