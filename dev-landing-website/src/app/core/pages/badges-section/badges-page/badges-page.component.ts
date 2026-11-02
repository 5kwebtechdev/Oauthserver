import { Component, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { FooterComponent } from '../../../components/footer/footer.component';
import { BadgesCardComponent } from '../badges-card/badges-card.component';
import { BadgeService, Badge, RecentAchievement, CelebrationCard, BadgeProgressResponse } from '../../../services/badge.service';

@Component({
  selector: 'app-badges-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FooterComponent,
    PublicNavbarComponent,
    BadgesCardComponent
  ],
  templateUrl: './badges-page.component.html',
  styleUrls: ['./badges-page.component.scss']
})
export class BadgesPageComponent implements OnInit {
  badges: Badge[] = [];
  recentAchievement: RecentAchievement | null = null;
  celebrationCard: CelebrationCard | null = null;
  isLoading = false;
  private currentShareMessage = '';

  // Modal state
  showShareModal = false;
  shareMessage = `I just earned a badge on SuperMe! Join me and level up together.`;

  // Congratulatory popup state
  congratsVisible = false;
  selectedBadge?: Badge;

  constructor(private badgeService: BadgeService) { }

  ngOnInit(): void {
    this.loadBadges();
  }

  /**
   * Load badge progress from API
   */
  loadBadges(): void {
    this.isLoading = true;
    this.badgeService.getBadgeProgress().subscribe({
      next: (response: BadgeProgressResponse) => {
        const result = this.badgeService.processBadgeResponse(response);
        this.badges = result.badges;
        this.recentAchievement = result.recentAchievement;
        this.celebrationCard = result.celebrationCard;

        if (this.recentAchievement?.shareMessage) {
          this.currentShareMessage = this.recentAchievement.shareMessage;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading badges:', error);
        this.badges = [];
        this.recentAchievement = null;
        this.isLoading = false;
      }
    });
  }

  /**
   * Get completion percentage for display
   */
  getCompletionPercentage(badge: Badge): number {
    if (badge.isLocked || badge.targetProgress === 0) {
      return 0;
    }
    return this.badgeService.calculateCompletionPercentage(badge.currentProgress, badge.targetProgress);
  }

  /**
   * Show congratulations popup for a specific badge
   */
  showBadgeCongratulation(badge: Badge): void {
    this.selectedBadge = badge;
    this.congratsVisible = true;
    this.currentShareMessage = badge.shareMessage || `I earned the ${badge.name} badge on SuperMe! 🚀`;
  }

  /**
   * View all badges - close congrats popup
   */
  onViewAllBadges(): void {
    this.congratsVisible = false;
    this.selectedBadge = undefined;
    this.currentShareMessage = this.celebrationCard?.shareMessage || '';
  }

  /**
   * Close congrats popup and clear selection
   */
  closeCongrats(): void {
    this.congratsVisible = false;
    this.selectedBadge = undefined;
    this.currentShareMessage = this.celebrationCard?.shareMessage || '';
  }

  openShareModal() {
    this.shareMessage = this.currentShareMessage || `I just earned a badge on SuperMe! Join me and level up together.`;
    this.showShareModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeShareModal() {
    this.showShareModal = false;
    document.body.style.overflow = '';
  }

  copyMessage() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.shareMessage).then(() => {
        this.closeShareModal();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = this.shareMessage;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        // ignore
      }
      document.body.removeChild(ta);
      this.closeShareModal();
    }
  }

  shareWhatsApp() {
    const encoded = encodeURIComponent(this.shareMessage);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    this.closeShareModal();
  }
}
