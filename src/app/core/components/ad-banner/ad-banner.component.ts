import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';

export type AdScreen =
  // Student screens
  | 'HOME'
  | 'COLINS'
  | 'LEARNING'
  | 'ROCKS'
  | 'TUTOR'
  | 'ACCELERARY'
  | 'ARTICLES'
  | 'EDUHUB'
  | 'TUTOR_HOME'
  | 'STUDENT_STORE'
  // Parent screens
  | 'HOME_PARENTS'
  | 'PARENT_TUTOR'
  | 'EDUHUB_PARENTS'
  | 'COLINS_PARENTS'
  | 'TUTOR_PARENTS'
  | 'ROCKS_PARENTS';

type AdClickActionType = 'IN_APP_SCREEN' | 'EXTERNAL_URL';

interface AdItem {
  id: number;
  title: string;
  order: number;
  image: string;
  clickActionType?: AdClickActionType;
  externalUrl?: string | null;
  inAppScreen?: AdScreen | null;
}

const IN_APP_ROUTE_MAP: Record<string, string> = {
  HOME:           '/authed/user-dashboard',
  HOME_PARENTS:   '/authed/parent-account',
  LEARNING:       '/authed/content',
  COLINS:         '/authed/content',
  COLINS_PARENTS: '/authed/content',
  // Keep the destination tab explicit. Without this, the Learning page falls
  // back to its default Puzzles tab when an Articles banner is selected.
  ARTICLES:       '/authed/content?tab=articles',
  ROCKS:          '/authed/reel-section',
  ROCKS_PARENTS:  '/authed/reel-section',
  TUTOR:          '/authed/tutors',
  TUTOR_PARENTS:  '/authed/tutors',
  PARENT_TUTOR:   '/authed/tutors',
  ACCELERARY:     '/authed/academy',
  EDUHUB:         '/authed/education',
  EDUHUB_PARENTS: '/authed/education',
  STUDENT_STORE:  '/authed/school-store',
};

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
  /** Optional Figma layout used by screens with a dedicated ad treatment. */
  @Input() variant: 'default' | 'article-details' | 'eduhub-parent' | 'eduhub-inner' | 'parent-learning' = 'default';

  @ViewChild('scrollTrack') scrollTrackRef?: ElementRef<HTMLElement>;

  ads: AdItem[] = [];
  currentIndex = 0;
  isVisible = false;

  private readonly intervalMs = 4500;
  private timer: any;
  private touchStartX = 0;
  private readonly swipeThreshold = 40;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['screen'] && !changes['screen'].firstChange) {
      this.loadAds();
      return;
    }
    if (changes['variant'] && !changes['variant'].firstChange) {
      setTimeout(() => this.updateTrackPosition(), 0);
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateTrackPosition();
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
        if (!Array.isArray(ads)) { this.isVisible = false; return; }
        const candidates = ads.filter(ad => !!ad?.image);
        if (candidates.length === 0) { this.isVisible = false; return; }
        // Preload all images — only keep ones that actually load
        this.preloadImages(candidates).then(valid => {
          if (valid.length === 0) { this.isVisible = false; return; }
          this.ads = valid;
          this.isVisible = true;
          this.currentIndex = 0;
          this.cdr.detectChanges();
          this.startAutoPlay();
          setTimeout(() => this.updateTrackPosition(), 50);
        });
      },
      error: () => { this.isVisible = false; }
    });
  }

  private preloadImages(ads: AdItem[]): Promise<AdItem[]> {
    return Promise.all(
      ads.map(ad => new Promise<AdItem | null>(resolve => {
        const img = new Image();
        img.onload = () => resolve(ad);
        img.onerror = () => resolve(null);
        img.src = ad.image;
      }))
    ).then(results => results.filter((ad): ad is AdItem => ad !== null));
  }

  private startAutoPlay(): void {
    this.clearTimer();
    if (this.ads.length > 1) {
      this.timer = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.ads.length;
        this.updateTrackPosition();
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
    this.updateTrackPosition();
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
    this.updateTrackPosition();
  }

  updateTrackPosition(): void {
    const el = this.scrollTrackRef?.nativeElement;
    if (!el) return;
    const containerWidth = (el.parentElement?.clientWidth ?? el.clientWidth);
    const articleDetails = this.variant === 'article-details';
    const parentEduHub = this.variant === 'eduhub-parent';
    const parentEduHubInner = this.variant === 'eduhub-inner';
    const parentLearning = this.variant === 'parent-learning';
    const cardWidth = parentLearning
      ? Math.min(305, containerWidth * 0.845)
      : containerWidth * (articleDetails ? 0.845 : (parentEduHub || parentEduHubInner) ? 0.81 : 0.82);
    const gap = articleDetails || parentEduHub || parentEduHubInner || parentLearning ? 8 : 10;
    const peekOffset = articleDetails || parentEduHub || parentEduHubInner || parentLearning ? 0 : (containerWidth - cardWidth) / 2;
    const translateX = peekOffset - this.currentIndex * (cardWidth + gap);
    el.style.transform = `translateX(${translateX}px)`;
  }

  onAdClick(ad: AdItem): void {
    try {
      if (ad.clickActionType === 'EXTERNAL_URL' && ad.externalUrl) {
        window.open(ad.externalUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (ad.clickActionType === 'IN_APP_SCREEN' && ad.inAppScreen) {
        const route = IN_APP_ROUTE_MAP[ad.inAppScreen];
        if (route) {
          this.router.navigateByUrl(route).catch(() => {});
        }
      }
    } catch (e) {}
  }

  onAdImageError(index: number): void {
    if (index < 0 || index >= this.ads.length) return;

    this.ads = this.ads.filter((_, i) => i !== index);
    if (this.ads.length === 0) {
      this.clearTimer();
      this.currentIndex = 0;
      this.isVisible = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.currentIndex >= this.ads.length) {
      this.currentIndex = this.ads.length - 1;
    }
    this.startAutoPlay();
    this.cdr.detectChanges();
    setTimeout(() => this.updateTrackPosition(), 0);
  }
}
