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
  constructor(private badgeApi: BadgeApi, private route: ActivatedRoute,
    private router: Router, private location: Location) {}
  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      this.allIndividuals = params.get('view') === 'individual';
      if (this.allIndividuals) this.tab = 'earned';
    });
    this.loadBadges();
  }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.routeSubscription?.unsubscribe(); }
  loadBadges(): void {
    this.request?.unsubscribe(); this.loading = true; this.error = false;
    this.request = this.badgeApi.getBadgeProgress().subscribe({
      next: response => {
        this.loading = false;
        if (!response || !Array.isArray(response.badges)) { this.error = true; return; }
        this.view = mapBadgeResponse(response);
        this.shareMessage = response.celebrationCard?.showCelebration === true && typeof response.celebrationCard?.shareMessage === 'string' ? response.celebrationCard.shareMessage : '';
      },
      error: () => { this.loading = false; this.error = true; },
    });
  }
  onBackClick(): void { this.location.back(); }
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
