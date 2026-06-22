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
        </div>

        <!-- Error State -->
        <div class="error-state" *ngIf="errorMessage && !isLoading">
          <img class="error-art" src="/assets/app-assets/error-icon.png" alt="Error illustration" />
          <h2 class="error-title">Oops!</h2>
          <p class="error-sub">{{ errorMessage }}</p>
          <ion-button expand="block" class="retry-btn" (click)="loadTrophies()" aria-label="Retry">
            Try Again
          </ion-button>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="!isLoading && !errorMessage && !grouped.length">
          <img class="empty-art" src="/assets/Images-Transparent/Image-Trophies-Blank.png" alt="No trophies illustration" />
          <h2 class="empty-title">No Trophies Yet!</h2>
          <p class="empty-sub">Your journey is just beginning. Earn some cool trophies and show them off here!</p>
          <ion-button expand="block" class="earn-btn" aria-label="Earn Trophies" routerLink="/content">Earn Trophies</ion-button>
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

    .trophy-content {
      --padding-top: 8px;
      --padding-bottom: 0;
      --padding-start: 0;
      --padding-end: 0;
    }

    .trophy-page-container {
      padding: 0 16px max(24px, env(safe-area-inset-bottom, 24px));
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    /* ── Loading ── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
      text-align: center;
    }
    .loading-state ion-spinner {
      --color: #d45aa3;
      transform: scale(1.5);
    }

    /* ── Error ── */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 24px 16px;
    }
    .error-art {
      width: min(200px, 60vw);
      height: auto;
    }
    .error-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: clamp(17px, 4vw, 20px);
      margin: 6px 0 0;
      color: #e74c3c;
    }
    .error-sub {
      color: #6b6b6b;
      font-size: clamp(13px, 3.5vw, 15px);
      max-width: 320px;
      margin: 6px 0 12px;
    }
    .retry-btn {
      --background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
      --color: #fff;
      border-radius: 20px;
      height: 52px;
      font-size: 16px;
      font-weight: 800;
    }

    /* ── Empty ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 24px 16px;
    }
    .empty-art {
      width: min(280px, 70vw);
      height: auto;
    }
    .empty-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: clamp(17px, 4vw, 20px);
      margin: 6px 0 0;
    }
    .empty-sub {
      color: #6b6b6b;
      font-size: clamp(13px, 3.5vw, 15px);
      max-width: 300px;
      margin: 6px 0 12px;
      line-height: 1.5;
    }
    .earn-btn {
      --background: linear-gradient(90deg, #d45aa3 0%, #b85aa6 50%, #8f3aa0 100%);
      --color: #fff;
      border-radius: 20px;
      height: 52px;
      font-size: 16px;
      font-weight: 800;
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

    /* ── Section ── */
    .section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
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
      opacity: 0.15;
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
