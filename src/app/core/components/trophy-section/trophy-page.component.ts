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
            <img class="trophy-icon" src="/assets/Icons-Neutral/Icon-Trophy.png" alt="trophy" />
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
          <img class="error-art" src="/assets/app-assets/error-icon.png" alt="Error" />
          <h2 class="error-title">Oops!</h2>
          <p class="error-sub">{{ errorMessage }}</p>
          <button class="action-btn error-btn" (click)="loadTrophies()">Try Again</button>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && !errorMessage && !grouped.length">
          <div class="empty-art-wrap">
            <img class="empty-art" src="/assets/Images-Transparent/Image-Trophies-Blank.png" alt="No trophies yet" />
          </div>
          <div class="empty-copy">
            <h2 class="empty-title">No Trophies Yet!</h2>
            <p class="empty-sub">Your journey is just beginning. Earn some cool trophies and show them off here!</p>
          </div>
          <button class="action-btn earn-btn" routerLink="/content" aria-label="Earn Trophies">
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
                    <div class="thumb-circle" [ngClass]="trophy.categoryIconUrl ? 'cat-img' : getCategoryClass(trophy.contentType)" role="img" [attr.aria-label]="trophy.contentType || 'trophy'">
                      <img *ngIf="trophy.categoryIconUrl"
                           class="thumb-img"
                           [src]="trophy.categoryIconUrl"
                           [alt]="trophy.contentType || 'trophy'"
                           (error)="onThumbError($event, trophy)" />
                      <ng-container *ngIf="!trophy.categoryIconUrl">{{ getCategoryLetter(trophy.contentType) }}</ng-container>
                    </div>
                    <div class="meta">
                      <div class="title">
                        {{ trophy.title }}
                        <span class="difficulty" [ngClass]="trophy.difficulty">• {{ trophy.difficulty }}</span>
                      </div>
                      <div class="earned">Earned on {{ formatEarnedOn(trophy.earnedOn) }}</div>
                    </div>
                  </div>

                  <div class="trophy-side">
                    <div class="points">
                      <img class="points-icon" src="/assets/Icons-Neutral/Icon-Trophy.png" alt="trophy" />
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
      display: block;
    }

    /* Make inner scroll div a flex column so children can fill height */
    .trophy-content::part(scroll) {
      display: flex;
      flex-direction: column;
    }

    .trophy-content {
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50px;
      height: 54px;
      min-width: 200px;
      max-width: 280px;
      width: 100%;
      font-family: 'Nunito', sans-serif;
      font-size: 17px;
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
      background: linear-gradient(135deg, #d45aa3 0%, #b85aa6 50%, #8f3aa0 100%);
      box-shadow: 0 6px 20px rgba(180, 60, 170, 0.32);
    }
    .earn-btn:active {
      box-shadow: 0 3px 10px rgba(180, 60, 170, 0.2);
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
      padding: 16px 8px 40px;
    }

    .empty-art-wrap {
      width: 100%;
      max-width: 300px;
      margin: 0 auto 28px;
    }
    .empty-art {
      width: 100%;
      height: auto;
      display: block;
    }

    .empty-copy {
      margin-bottom: 36px;
    }
    .empty-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: clamp(20px, 5vw, 24px);
      color: #282527;
      margin: 0 0 10px;
    }
    .empty-sub {
      font-family: 'Nunito', sans-serif;
      font-size: clamp(14px, 3.8vw, 16px);
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
      width: clamp(44px, 12vw, 56px);
      height: clamp(44px, 12vw, 56px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
      font-size: clamp(15px, 4vw, 18px);
      flex: 0 0 clamp(44px, 12vw, 56px);
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
      font-weight: 600;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      width: 100%;
      word-break: break-word;
      line-height: 1.3;
    }

    .difficulty {
      font-size: clamp(9px, 2.5vw, 11px);
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .difficulty.Easy { color: #2ecc71; }
    .difficulty.Hard { color: #e74c3c; }

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

  onThumbError(event: Event, trophy: Trophy): void {
    console.warn('[TrophyPage] image failed to load:', trophy.categoryIconUrl);
    trophy.categoryIconUrl = undefined;
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

  private getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  formatEarnedOn(date: Date | string | undefined | null): string {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const suffix = this.getOrdinalSuffix(day);
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `${month} ${day}${suffix}`;
  }

  onBack() {
    this.location.back();
  }
}
