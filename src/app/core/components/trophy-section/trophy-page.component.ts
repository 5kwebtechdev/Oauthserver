import { Component, OnInit } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { TrophyService, Trophy, GroupedTrophies } from '../../services/trophy.service';

@Component({
  selector: 'app-trophy-page',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, RouterModule],
  template: `
        <mindful-card-header [title]="pageTitle" [subtitleMiddle]="'See wins • Know dates • Keep going'"
          [showBackArrow]="true" (backClick)="onBack()">
          <div mindful-header-actions class="trophy-section d-flex flex-column gap-0 ">
            <img class="trophy-icon" src="/assets/Icons-Neutral/Icon-Trophy.png" alt="trophy" />
            <span class="trophy-count">{{ trophyCount }}</span>
          </div>
        </mindful-card-header>
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
                    <div class="thumb-circle" [ngClass]="getCategoryClass(trophy.contentType)" role="img" [attr.aria-label]="trophy.contentType || 'trophy'">
                      {{ getCategoryLetter(trophy.contentType) }}
                    </div>
                    <div class="meta">
                      <div class="title">
                        {{ trophy.title }}
                        <span class="difficulty" [ngClass]="trophy.difficulty">• {{ trophy.difficulty }}</span>
                      </div>
                      <div class="earned">Earned on {{ formatEarnedOn(trophy.earnedOn) }}</div>
                    </div>
                  </div>

                  <div class="trophy-side" aria-hidden="false">
                    <div class="points"><img class="points-icon" src="/assets/Icons-Neutral/Icon-Trophy.png" alt="trophy" /> {{ trophy.points }}</div>
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
    .trophy-content {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .trophy-page-container {
      padding: 16px;
      gap: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    
    /* Loading State */
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
    .loading-state p {
      color: #6b6b6b;
      font-size: 16px;
      margin: 0;
    }
    
    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 24px 12px;
    }
    .error-art {
      width: 200px;
      max-width: 100%;
      height: auto;
    }
    .error-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 20px;
      margin: 6px 0 0;
      color: #e74c3c;
    }
    .error-sub {
      color: #6b6b6b;
      max-width: 320px;
      margin: 6px 0 12px;
    }
    .retry-btn {
      --background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
      --color: #fff;
      border-radius: 20px;
      height: 56px;
      font-size: 18px;
      font-weight: 800;
      box-shadow: 0 8px 18px rgba(231, 76, 60, 0.25);
    }
    
    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
      width: 100%;
      max-width: 720px;
      align-items: center;
    }
    .section h3 {
      line-height: 140%;
    }

    .group-title {
      color: #282527;
      font-family: Nunito, sans-serif;
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      width: 100%;
      text-align: left;
      align-self: flex-start;
    }

    .group-divider {
      opacity: 0.2;
      background: #282527;
      width: 100%;
      height: 1px;
      margin: 0;
      align-self: stretch;
    }
    
    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 24px 12px;
    }
    .empty-art {
      width: 300px;
      max-width: 100%;
      height: auto;
    }
    .empty-title {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 20px;
      margin: 6px 0 0;
    }
    .empty-sub {
      color: #6b6b6b;
      max-width: 320px;
      margin: 6px 0 12px;
    }
    .earn-btn {
      --background: linear-gradient(90deg, #d45aa3 0%, #b85aa6 50%, #8f3aa0 100%);
      --color: #fff;
      border-radius: 20px;
      height: 56px;
      font-size: 18px;
      font-weight: 800;
      box-shadow: 0 8px 18px rgba(160, 50, 120, 0.25);
    }
    
    .trophy-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-left: 0;
    }
    .trophy-icon {
      width: auto;
      height: 26.5px;
      max-height: 26.5px;
      object-fit: contain;
      display: inline-block;
    }
    .trophy-count {
      font-weight: bold;
      font-size: 16px;
    }
    .points-icon {
      width: 18px;
      height: 18px;
      object-fit: contain;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }
    
    /* Trophy List */
    .trophy-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 8px 0;
      width: 100%;
    }
    .trophy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    }
    .trophy-row:hover {
      background: #f0f0f0;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .thumb {
      width: 56px;
      height: 56px;
      object-fit: cover;
      margin-right: 12px;
      border-radius: 8px;
    }
    .thumb-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #ffffff;
      font-size: 18px;
      margin-right: 12px;
      flex: 0 0 56px;
    }
    .thumb-circle.cat-quiz { background: linear-gradient(90deg,#6c5ce7,#8e7bff); }
    .thumb-circle.cat-challenge { background: linear-gradient(90deg,#ff7a7a,#ffb199); }
    .thumb-circle.cat-habit { background: linear-gradient(90deg,#2ecc71,#5ce3a6); }
    .thumb-circle.cat-task { background: linear-gradient(90deg,#3498db,#6bb9ff); }
    .thumb-circle.cat-default { background: #bdbdbd; }
    .trophy-main { flex: 1; display: flex; }
    .meta { 
      flex: 1; 
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
      justify-content: center;
      text-align: left;
    }

    .trophy-side {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 0 0 auto;
    }
    .title {
      color: #282527;
      font-family: Nunito, sans-serif;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .earned { 
      color: #6B656A; 
      font-family: Nunito, sans-serif;
      font-size: 13px;
      font-weight: 600;
    }
    .difficulty { 
      font-size: 10px;
      font-weight: 600;
      display: inline-block;
      margin: 0;
    }
    .difficulty.Easy { 
      color: #2ecc71; 
    }

    .difficulty.Hard { 
      color: #e74c3c; 
    }
    .points { 
      font-weight: 700; 
      margin-left: 12px;
      font-size: 16px;
      white-space: nowrap;
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
