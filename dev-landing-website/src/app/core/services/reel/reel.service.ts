import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Reel {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  views: number;
  likes: number;
  bookmarks: number;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  userId: number;
  username: string;
  userAvatar: string;
}

export interface ReelCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export interface ReelUploadRequest {
  title: string;
  description: string;
  categoryId: number;
  videoBlob: Blob;
  thumbnailBlob: Blob;
}

@Injectable({
  providedIn: 'root'
})
export class ReelService {
  private apiUrl = `${environment.apiUrl}/reels`;
  // Provide sensible defaults so UI works offline or before the API responds
  private defaultCategories: ReelCategory[] = [
    { id: 1, name: 'Science Wonders', description: 'Explore science and experiments', icon: '' },
    { id: 2, name: 'Creative Arts', description: 'Art, craft and creative projects', icon: '' },
    { id: 3, name: 'Comedy & Fun', description: 'Funny and entertaining reels', icon: '' }
  ];

  private categoriesSubject = new BehaviorSubject<ReelCategory[]>(this.defaultCategories);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCategories();
  }

  /**
   * Load reel categories
   */
  private loadCategories(): void {
    this.getCategories().subscribe({
      next: (categories) => {
        // If API returns an empty list, keep the defaults; otherwise use API list
        if (categories && categories.length > 0) {
          this.categoriesSubject.next(categories);
        } else {
          this.categoriesSubject.next(this.defaultCategories);
        }
      },
      error: (error) => {
        console.error('Failed to load reel categories:', error);
        // keep the defaults already seeded in the subject
      }
    });
  }

  /**
   * Get all reels
   */
  getReels(): Observable<Reel[]> {
    return this.http.get<Reel[]>(this.apiUrl);
  }

  /**
   * Get reel by ID
   */
  getReelById(id: number): Observable<Reel> {
    return this.http.get<Reel>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get reels by category
   */
  getReelsByCategory(categoryId: number): Observable<Reel[]> {
    return this.http.get<Reel[]>(`${this.apiUrl}?categoryId=${categoryId}`);
  }

  /**
   * Get all categories
   */
  getCategories(): Observable<ReelCategory[]> {
    return this.http.get<ReelCategory[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Upload a new reel
   */
  uploadReel(request: ReelUploadRequest): Observable<Reel> {
    const formData = new FormData();
    formData.append('title', request.title);
    formData.append('description', request.description);
    formData.append('categoryId', request.categoryId.toString());
    formData.append('video', request.videoBlob, 'video.mp4');
    formData.append('thumbnail', request.thumbnailBlob, 'thumbnail.jpg');

    return this.http.post<Reel>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Like a reel
   */
  likeReel(reelId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reelId}/like`, {});
  }

  /**
   * Bookmark a reel
   */
  bookmarkReel(reelId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reelId}/bookmark`, {});
  }

  /**
   * Get bookmarked reels for user
   */
  getBookmarkedReels(): Observable<Reel[]> {
    return this.http.get<Reel[]>(`${this.apiUrl}/bookmarked`);
  }

  /**
   * Search reels by query
   */
  searchReels(query: string): Observable<Reel[]> {
    return this.http.get<Reel[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }
}