import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SupermeCardHeaderComponent } from '../superme-navigator/superme-card-header/superme-card-header.component';
import { TrophyService, Trophy, GroupedTrophies } from '../../services/trophy.service';

@Component({
  selector: 'app-trophy-page',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeCardHeaderComponent, RouterModule],
  template: `
        <superme-card-header [title]="pageTitle" [subtitleMiddle]="'See wins • Know dates • Keep going'"
          [showBackArrow]="true" (backClick)="onBack()">
          <div superme-header-actions class="trophy-section">
            <img class="trophy-icon" src="/assets/Icons-Neutral/Icon-Trophy.webp" alt="trophy" />
            <span class="trophy-count">{{ trophyCount }}</span>
          </div>
        </superme-card-header>
    <ion-content class="trophy-content">
      <div class="trophy-page-container">

        <!-- Loading State -->
        <div class="loading-state" *ngIf="isLoading">
          <ion-spinner name="crescent"></ion-spinner>
          <p class="loading-label">Loading your trophies…</p>
        </div>

        <!-- Error State -->
        <div class="error-state" *ngIf="errorMessage && !isLoading">
          <img class="error-art" src="/assets/app-assets/error-icon.webp" alt="Error" />
          <h2 class="error-title">Oops!</h2>
          <p class="error-sub">{{ errorMessage }}</p>
          <button class="action-btn error-btn" (click)="loadTrophies()">Try Again</button>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && !errorMessage && !grouped.length">
          <div class="empty-art-wrap">
            <img class="empty-art" src="/assets/Images-Transparent/Image-Trophies-Blank.webp" alt="No trophies yet" />
          </div>
          <div class="empty-copy">
            <h2 class="empty-title">No Trophies Yet!</h2>
            <p class="empty-sub">Your journey is just beginning. Earn some cool trophies and show them off here!</p>
          </div>
          <button class="action-btn earn-btn" routerLink="/authed/content" aria-label="Earn Trophies">
            Earn Trophies
          </button>
        </div>

        <!-- Trophy List -->
        <div class="section" *ngIf="!isLoading && !errorMessage && grouped.length">
          <ng-container *ngFor="let g of grouped">
            <h3 class="group-title">{{ g.title }}</h3>
            <div class="group-divider" aria-hidden="true"></div>
            <div class="trophy-list">
              <ng-container *ngFor="let trophy of g.items">
                <div class="trophy-row">
                  <div class="trophy-main">
                    <div class="thumb-circle" [ngClass]="getThumbClass(trophy)" role="img" [attr.aria-label]="trophy.contentTitle || trophy.contentType || 'trophy'">
                      <img *ngIf="getThumbSrc(trophy)"
                           class="thumb-img"
                           [src]="getThumbSrc(trophy)"
                           [alt]="trophy.contentTitle || trophy.title"
                           (error)="onThumbError($event, trophy)" />
                      <ng-container *ngIf="!getThumbSrc(trophy)">{{ getCategoryLetter(trophy.contentType) }}</ng-container>
                    </div>
                    <div class="meta">
                      <div class="title">
                        {{ getTrophyDisplayTitle(trophy) }}
                        <span class="difficulty" [ngClass]="trophy.difficulty">• {{ trophy.difficulty }}</span>
                      </div>
                      <div class="earned">{{ formatEarnedOn(trophy.earnedOn, trophy.earnedOnDisplay) }}</div>
                    </div>
                  </div>

                  <div class="trophy-side">
                    <div class="points">
                      <img class="points-icon" src="/assets/Icons-Neutral/Icon-Trophy.webp" alt="trophy" />
                      {{ trophy.points }}
                    </div>
                  </div>
                </div>
              </ng-container>
            </div>
          </ng-container>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding-top: constant(safe-area-inset-top);
      padding-top: env(safe-area-inset-top, 0px);
    }

    /* Make inner scroll div a flex column so children can fill height */
    .trophy-content::part(scroll) {
      display: flex;
      flex-direction: column;
    }

    .trophy-content {
      flex: 1;
      --padding-top: 0;
      --padding-bottom: 0;
      --padding-start: 0;
      --padding-end: 0;
    }

    .trophy-page-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 12px 20px max(32px, env(safe-area-inset-bottom, 32px));
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      box-sizing: border-box;
      min-height: calc(100vh - 80px);
    }

    /* ── Loading ── */
    .loading-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      text-align: center;
      padding: 40px 24px;
    }
    .loading-state ion-spinner {
      --color: #d45aa3;
      width: 40px;
      height: 40px;
    }
    .loading-label {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      color: #6b6b6b;
      margin: 0;
    }

    /* ── Error ── */
    .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 10px;
      padding: 32px 24px;
    }
    .error-art {
      width: min(180px, 55vw);
      height: auto;
      margin-bottom: 8px;
    }
    .error-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 20px;
      margin: 0;
      color: #e74c3c;
    }
    .error-sub {
      color: #6b6b6b;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      max-width: 280px;
      margin: 4px 0 16px;
    }

    /* ── Shared action button ── */
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 16px;
      height: clamp(48px, 7vh, 56px);
      width: 100%;
      max-width: 400px;
      font-family: 'Nunito', sans-serif;
      font-size: clamp(15px, 4vw, 17px);
      font-weight: 800;
      color: #fff;
      cursor: pointer;
      letter-spacing: 0.2px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      -webkit-tap-highlight-color: transparent;
      text-decoration: none;
    }
    .action-btn:active {
      transform: scale(0.96);
    }
    .earn-btn {
      background: linear-gradient(135deg, #C2185B 0%, #90214D 50%, #7B1542 100%);
      box-shadow: 0 6px 20px rgba(144, 33, 77, 0.32);
    }
    .earn-btn:active {
      box-shadow: 0 3px 10px rgba(144, 33, 77, 0.2);
    }
    .error-btn {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      box-shadow: 0 6px 20px rgba(231, 76, 60, 0.28);
    }

    /* ── Empty State ── */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px 24px;
    }

    .empty-art-wrap {
      width: clamp(180px, 50vw, 260px);
      margin: 0 auto clamp(16px, 3vh, 28px);
    }
    .empty-art {
      width: 100%;
      height: auto;
      display: block;
    }

    .empty-copy {
      margin-bottom: clamp(20px, 4vh, 36px);
    }
    .empty-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: clamp(18px, 4.5vw, 22px);
      color: #282527;
      margin: 0 0 8px;
    }
    .empty-sub {
      font-family: 'Nunito', sans-serif;
      font-size: clamp(13px, 3.5vw, 15px);
      color: #6b6b6b;
      line-height: 1.65;
      max-width: 280px;
      margin: 0 auto;
    }

    /* ── Header trophy icon ── */
    .trophy-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .trophy-icon {
      width: auto;
      height: 26px;
      object-fit: contain;
    }
    .trophy-count {
      font-weight: 700;
      font-size: 15px;
      line-height: 1;
    }

    /* ── Section (trophy list) ── */
    .section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
      width: 100%;
    }

    .group-title {
      color: #282527;
      font-family: Nunito, sans-serif;
      font-size: clamp(14px, 3.5vw, 16px);
      font-weight: 700;
      margin: 4px 0 0;
    }

    .group-divider {
      background: #282527;
      opacity: 0.12;
      width: 100%;
      height: 1px;
      margin: 0;
    }

    /* ── Trophy list ── */
    .trophy-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 6px 0 4px;
      width: 100%;
    }

    .trophy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-width: 0;
    }

    .thumb-circle {
      width: clamp(44px, 11vw, 52px);
      height: clamp(44px, 11vw, 52px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
      font-size: clamp(14px, 3.5vw, 17px);
      flex: 0 0 clamp(44px, 11vw, 52px);
      margin-right: 10px;
      overflow: hidden;
    }
    .thumb-circle.cat-quiz      { background: linear-gradient(135deg, #6c5ce7, #8e7bff); }
    .thumb-circle.cat-challenge { background: linear-gradient(135deg, #ff7a7a, #ffb199); }
    .thumb-circle.cat-habit     { background: linear-gradient(135deg, #2ecc71, #5ce3a6); }
    .thumb-circle.cat-task      { background: linear-gradient(135deg, #3498db, #6bb9ff); }
    .thumb-circle.cat-default   { background: #bdbdbd; }
    .thumb-circle.cat-img       { background: #f0f0f0; }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }

    .trophy-main {
      flex: 1;
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      align-items: flex-start;
    }

    .title {
      color: #282527;
      font-family: Nunito, sans-serif;
      font-size: clamp(13px, 3.5vw, 15px);
      font-weight: 700;
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 4px;
      width: 100%;
      word-break: break-word;
      line-height: 1.35;
    }

    .difficulty {
      font-size: clamp(9px, 2.5vw, 11px);
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .difficulty.Easy { color: #2ecc71; }
    .difficulty.Hard { color: #e74c3c; }

    .badge-name {
      color: #8B6FA8;
      font-family: Nunito, sans-serif;
      font-size: clamp(10px, 2.5vw, 12px);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .earned {
      color: #6B656A;
      font-family: Nunito, sans-serif;
      font-size: clamp(11px, 3vw, 13px);
      font-weight: 600;
      white-space: nowrap;
    }

    .trophy-side {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      padding-left: 6px;
    }

    .points {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
      font-size: clamp(13px, 3.5vw, 16px);
      white-space: nowrap;
      color: #282527;
    }

    .points-icon {
      width: clamp(15px, 4vw, 18px);
      height: clamp(15px, 4vw, 18px);
      object-fit: contain;
      flex-shrink: 0;
    }
  `]
})
export class TrophyPageComponent implements OnInit, ViewWillEnter {
  pageTitle = 'Your Trophy Trail';
  grouped: GroupedTrophies[] = [];
  trophyCount = 0;
  isLoading = false;
  errorMessage = '';

  constructor(private trophyService: TrophyService, private location: Location) { }

  ngOnInit() { this.loadTrophies(); }

  ionViewWillEnter() { this.loadTrophies(); }

  loadTrophies() {
    this.isLoading = true;
    this.errorMessage = '';

    this.trophyService.fetchTrophies().subscribe({
      next: (response) => {
        this.trophyCount = response.totalCount;
        this.grouped = this.trophyService.groupTrophiesByMonth(response.trophies);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load trophies:', error);
        this.errorMessage = error.message || 'Failed to load trophies. Please try again later.';
        this.isLoading = false;
        this.trophyCount = 0;
        this.grouped = [];
      }
    });
  }

  getThumbSrc(trophy: Trophy): string | undefined {
    return trophy.contentThumbnailUrl || trophy.categoryIconUrl || undefined;
  }

  getThumbClass(trophy: Trophy): string {
    if (trophy.contentThumbnailUrl || trophy.categoryIconUrl) return 'cat-img';
    return this.getCategoryClass(trophy.contentType);
  }

  onThumbError(event: Event, trophy: Trophy): void {
    if (trophy.contentThumbnailUrl) {
      console.warn('[TrophyPage] content thumbnail failed, falling back to category icon:', trophy.contentThumbnailUrl);
      trophy.contentThumbnailUrl = undefined;
    } else {
      console.warn('[TrophyPage] category icon failed to load:', trophy.categoryIconUrl);
      trophy.categoryIconUrl = undefined;
    }
  }

  getCategoryLetter(contentType?: string): string {
    if (!contentType) return '★';
    const ct = contentType.toLowerCase();
    if (ct.includes('quiz')) return 'Q';
    if (ct.includes('challenge')) return 'C';
    if (ct.includes('habit')) return 'H';
    if (ct.includes('task')) return 'T';
    return contentType.charAt(0).toUpperCase();
  }

  getCategoryClass(contentType?: string): string {
    if (!contentType) return 'cat-default';
    const ct = contentType.toLowerCase();
    if (ct.includes('quiz')) return 'cat-quiz';
    if (ct.includes('challenge')) return 'cat-challenge';
    if (ct.includes('habit')) return 'cat-habit';
    if (ct.includes('task')) return 'cat-task';
    return 'cat-default';
  }

  getTrophyDisplayTitle(trophy: Trophy): string {
    if (trophy.contentTitle) return trophy.contentTitle;
    const t = (trophy.title || '').trim();
    if (t && t.toLowerCase() !== 'challenge completed') return t;
    return trophy.contentType || 'Trophy Earned';
  }

  formatEarnedOn(date: Date | string | undefined | null, preFormatted?: string): string {
    if (preFormatted) {
      const cleaned = preFormatted.replace(/^earned\s+on\s*/i, '').trim();
      return `Earned on ${cleaned}`;
    }
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return `Earned on ${d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  }

  onBack() {
    this.location.back();
  }
}
