import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export type AdScreen =
  | 'HOME' | 'COLINS' | 'LEARNING' | 'ROCKS' | 'TUTOR'
  | 'ACCELERARY' | 'ARTICLES' | 'EDUHUB' | 'STUDENT_STORE'
  | 'HOME_PARENTS' | 'PARENT_TUTOR' | 'EDUHUB_PARENTS'
  | 'COLINS_PARENTS' | 'TUTOR_PARENTS' | 'ROCKS_PARENTS';

interface AdItem {
  id: number;
  title: string;
  order: number;
  image: string;
}

@Component({
  selector: 'ad-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-banner.component.html',
  styleUrls: ['./ad-banner.component.scss']
})
export class AdBannerComponent implements OnInit, OnChanges, OnDestroy {
  /** Which screen this banner is on - determines which ads the API returns */
  @Input() screen: AdScreen = 'HOME';

  ads: AdItem[] = [];
  currentIndex = 0;
  isVisible = false;

  private readonly intervalMs = 4500;
  private timer: any;
  private touchStartX = 0;
  private readonly swipeThreshold = 40;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['screen'] && !changes['screen'].firstChange) {
      this.loadAds();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private loadAds(): void {
    this.clearTimer();
    this.ads = [];
    this.currentIndex = 0;
    this.isVisible = false;

    const token = this.authService.getToken();
    if (!token) return;

    const age = this.authService.getCurrentUserAge();
    if (!age) return;

    const headers = new HttpHeaders({
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'x-skip-loading': '1'
    });

    const params = new HttpParams()
      .set('age', String(age))
      .set('screen', this.screen);

    this.http.get<AdItem[]>(`${environment.apiUrl}/ads/age`, { headers, params }).subscribe({
      next: (ads) => {
        if (!Array.isArray(ads)) {
          this.isVisible = false;
          return;
        }
        // API already returns in correct order; do not re-sort.
        this.ads = ads.filter(ad => !!ad?.image);
        if (this.ads.length === 0) {
          return;
        }
        this.isVisible = true;
        this.currentIndex = 0;
        this.startAutoPlay();
      },
      error: () => {
        // Hide silently on error; no placeholder.
        this.isVisible = false;
      }
    });
  }

  private startAutoPlay(): void {
    this.clearTimer();
    if (this.ads.length > 1) {
      this.timer = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.ads.length;
      }, this.intervalMs);
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.ads.length || index === this.currentIndex) return;
    this.currentIndex = index;
    this.startAutoPlay();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.ads.length <= 1) return;
    const deltaX = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(deltaX) < this.swipeThreshold) return;

    if (deltaX < 0) {
      this.currentIndex = (this.currentIndex + 1) % this.ads.length;
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.ads.length) % this.ads.length;
    }
    this.startAutoPlay();
  }

  onAdImageError(index: number): void {
    if (index < 0 || index >= this.ads.length) return;

    this.ads = this.ads.filter((_, i) => i !== index);
    if (this.ads.length === 0) {
      this.clearTimer();
      this.currentIndex = 0;
      this.isVisible = false;
      return;
    }

    if (this.currentIndex >= this.ads.length) {
      this.currentIndex = this.ads.length - 1;
    }
    this.startAutoPlay();
  }
}
