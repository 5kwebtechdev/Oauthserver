import {
  Component,
  HostListener,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdsService, Ad } from '../../services/ads.service';
import { UserService } from '../../services/user.service';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';

@Component({
  selector: 'app-ad-slider',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  templateUrl: './ad-slider.component.html',
  styleUrls: ['./ad-slider.component.scss']
})
export class AdSliderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() screen: string = 'HOME';
  /** Overrides the age used for the ads request (e.g. the selected child's age on the parent dashboard). */
  @Input() age: number | null = null;

  ads: Ad[] = [];
  currentIndex = 0;
  visibleCount = 2;
  private sub?: Subscription;

  constructor(private adsService: AdsService, private userService: UserService, private router: Router) {
    this.updateVisibleCount();
  }

  ngOnInit(): void {
    this.loadAds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['age'] || changes['screen']) && !changes['age']?.firstChange) {
      this.loadAds();
    }
  }

  private loadAds(): void {
    const age = this.age ?? this.resolveAge();
    this.sub?.unsubscribe();
    this.sub = this.adsService.getAdsByAge(age, this.screen).subscribe({
      next: (ads) => { this.ads = (ads || []).slice().sort((a, b) => a.order - b.order); this.currentIndex = 0; },
      error: () => { this.ads = []; }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    const prev = this.visibleCount;
    this.updateVisibleCount();
    if (this.visibleCount !== prev) this.currentIndex = 0;
  }

  private updateVisibleCount(): void {
    const w = typeof window === 'undefined' ? 1200 : window.innerWidth;
    this.visibleCount = w <= 700 ? 1 : 2;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private resolveAge(): number {
    const profile = this.userService.getUserProfile();
    if (profile?.age) return profile.age;
    if (profile?.dob) {
      const dob = new Date(profile.dob);
      if (!isNaN(dob.getTime())) {
        const diffMs = Date.now() - dob.getTime();
        return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
      }
    }
    return 10;
  }

  get visibleAds(): Ad[] {
    return this.ads.slice(this.currentIndex, this.currentIndex + this.visibleCount);
  }

  get hasPrev(): boolean {
    return this.currentIndex > 0;
  }

  get hasNext(): boolean {
    return this.currentIndex + this.visibleCount < this.ads.length;
  }

  prev(): void {
    this.currentIndex = Math.max(0, this.currentIndex - this.visibleCount);
  }

  next(): void {
    if (this.hasNext) this.currentIndex += this.visibleCount;
  }

  onAdClick(ad: Ad): void {
    if (ad.clickActionType === 'EXTERNAL_URL' && ad.externalUrl) {
      window.open(ad.externalUrl, '_blank', 'noopener');
    } else if (ad.clickActionType === 'IN_APP_SCREEN' && ad.inAppScreen) {
      this.router.navigateByUrl(ad.inAppScreen);
    }
  }
}
