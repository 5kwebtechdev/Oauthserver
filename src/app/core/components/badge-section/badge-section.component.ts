import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BadgeApi } from '../../api/badge.api';
import { BadgeArtComponent } from './badge-art.component';
import { BadgeCard, BadgeView, emptyBadgeView, mapBadgeResponse } from './badge-view-model';
import { SupermePopupComponent, SupermePopupConfig } from '../superme-popup/superme-popup.component';
@Component({
  selector: 'app-badge-section', standalone: true,
  imports: [CommonModule, IonicModule, BadgeArtComponent, SupermePopupComponent],
  templateUrl: './badge-section.component.html', styleUrls: ['./badge-section.component.scss'],
})
export class BadgeSectionComponent implements OnInit, OnDestroy {
  view: BadgeView = emptyBadgeView();
  tab: 'progress' | 'earned' = 'progress';
  /** Display-only values; the API-backed BadgeCard values are never changed. */
  readonly animatedProgress = new Map<string, number>();
  readonly settledProgress = new Set<string>();
  earnedRevealActive = false;
  loading = true;
  error = false;
  allIndividuals = false;
  selected: BadgeCard | null = null;
  shareMessage = '';
  sharePopupVisible = false;
  sharePopupConfig: SupermePopupConfig = {
    heading: 'Share Now', showCloseButton: true, backdrop: true, ctaDirection: 'column',
    primaryCTA: { text: 'Copy Link', buttonStyle: 'white', buttonLarge: true, callback: () => this.copyShareLink() },
    secondaryCTA: { text: 'Share through WhatsApp', buttonStyle: 'white', buttonLarge: true, callback: () => this.shareWhatsapp() },
  };
  private request?: Subscription;
  private routeSubscription?: Subscription;
  private progressFrame = 0;
  private progressStartTimer: ReturnType<typeof setTimeout> | undefined;
  private earnedRevealTimer: ReturnType<typeof setTimeout> | undefined;
  private earnedRevealPlayed = false;
  constructor(private badgeApi: BadgeApi, private route: ActivatedRoute,
    private router: Router, private location: Location) {}
  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      this.allIndividuals = params.get('view') === 'individual';
      if (this.allIndividuals) this.selectTab('earned');
    });
    this.loadBadges();
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe(); this.routeSubscription?.unsubscribe();
    this.stopProgressAnimation();
    if (this.earnedRevealTimer) clearTimeout(this.earnedRevealTimer);
  }
  loadBadges(): void {
    this.request?.unsubscribe(); this.stopProgressAnimation(); this.loading = true; this.error = false;
    this.request = this.badgeApi.getBadgeProgress().subscribe({
      next: response => {
        this.loading = false;
        if (!response || !Array.isArray(response.badges)) { this.error = true; return; }
        this.view = mapBadgeResponse(response);
        this.startProgressAnimation();
        if (this.tab === 'earned') this.startEarnedReveal();
        this.shareMessage = response.celebrationCard?.showCelebration === true && typeof response.celebrationCard?.shareMessage === 'string' ? response.celebrationCard.shareMessage : '';
      },
      error: () => { this.loading = false; this.error = true; },
    });
  }
  onBackClick(): void { this.location.back(); }
  selectTab(tab: 'progress' | 'earned'): void {
    this.tab = tab;
    if (tab === 'progress') this.earnedRevealActive = false;
    if (tab === 'earned' && !this.loading) this.startEarnedReveal();
  }
  private startEarnedReveal(): void {
    if (this.earnedRevealPlayed || typeof window === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.earnedRevealPlayed = true;
    this.earnedRevealActive = true;
    this.earnedRevealTimer = setTimeout(() => this.earnedRevealActive = false, 1100);
  }
  displayedProgress(badge: BadgeCard): number {
    return this.animatedProgress.get(badge.key) ?? badge.progress ?? 0;
  }
  displayedPercent(badge: BadgeCard): number {
    return badge.target && badge.target > 0 ? Math.min(100, this.displayedProgress(badge) / badge.target * 100) : 0;
  }
  private stopProgressAnimation(): void {
    if (this.progressStartTimer) clearTimeout(this.progressStartTimer);
    this.progressStartTimer = undefined;
    if (this.progressFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.progressFrame);
    this.progressFrame = 0;
  }
  private startProgressAnimation(): void {
    this.animatedProgress.clear();
    this.settledProgress.clear();
    const cards = this.view.progress.filter(badge => badge.percent !== null && badge.progress !== null);
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      for (const badge of cards) this.animatedProgress.set(badge.key, badge.progress!);
      return;
    }
    for (const badge of cards) this.animatedProgress.set(badge.key, 0);
    if (!cards.length) return;
    // Let Angular paint the zero state before starting the shared animation clock.
    this.progressStartTimer = setTimeout(() => {
      const start = performance.now();
      const frame = (now: number) => {
        let pending = false;
        cards.forEach((badge, index) => {
          const delay = Math.min(index * 55, 550);
          const elapsed = Math.max(0, now - start - delay);
          const fraction = Math.min(1, elapsed / 680);
          const eased = 1 - Math.pow(1 - fraction, 3);
          this.animatedProgress.set(badge.key, Math.round(badge.progress! * eased));
          if (fraction < 1) pending = true;
          else this.settledProgress.add(badge.key);
        });
        this.progressFrame = pending ? requestAnimationFrame(frame) : 0;
      };
      this.progressFrame = requestAnimationFrame(frame);
    }, 50);
  }
  openDetail(badge: BadgeCard): void { if (!badge.individual) this.selected = badge; }
  viewAll(): void { void this.router.navigate([], { relativeTo: this.route, queryParams: { view: 'individual' }, queryParamsHandling: 'merge' }); }
  trackBadge(_: number, badge: BadgeCard): string { return badge.key; }
  copyShareLink(): void {
    if (this.shareMessage && navigator.clipboard) void navigator.clipboard.writeText(this.shareMessage).catch(() => {});
    this.sharePopupVisible = false;
  }
  shareWhatsapp(): void {
    if (this.shareMessage) window.open(`https://wa.me/?text=${encodeURIComponent(this.shareMessage)}`, '_blank', 'noopener,noreferrer');
    this.sharePopupVisible = false;
  }
}
