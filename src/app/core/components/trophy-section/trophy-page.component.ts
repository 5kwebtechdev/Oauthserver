import { Component, OnInit, Injectable } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';

interface Trophy {
    id: string;
    title: string;
    earnedOn: Date;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    points: number;
    image?: string;
}

@Injectable({ providedIn: 'root' })
class TrophyService {
    async fetchTrophies(): Promise<Trophy[]> {
        return [
            { id: 't1', title: 'Word Wizard', earnedOn: new Date('2025-03-02'), difficulty: 'Hard', points: 10, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
            { id: 't2', title: 'Shape Master', earnedOn: new Date('2025-03-05'), difficulty: 'Hard', points: 20, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
            { id: 't3', title: 'Color Connoisseur', earnedOn: new Date('2025-02-10'), difficulty: 'Hard', points: 15, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
            { id: 't4', title: 'Design Dynamo', earnedOn: new Date('2025-02-12'), difficulty: 'Easy', points: 5, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
            { id: 't5', title: 'Color Connoisseur', earnedOn: new Date('2025-01-10'), difficulty: 'Hard', points: 15, image: '/assets/Icons-Neutral/Icon-Trophy.png' },
            { id: 't6', title: 'Design Dynamo', earnedOn: new Date('2025-01-12'), difficulty: 'Easy', points: 5, image: '/assets/Icons-Neutral/Icon-Trophy.png' }
        ];
    }
}

@Component({
    selector: 'app-trophy-page',
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulCardHeaderComponent],
    template: `
        <mindful-card-header [title]="pageTitle" [subtitleMiddle]="'See wins • Know dates • Keep going'"
          [showBackArrow]="true" (backClick)="onBack()">
          <div mindful-header-actions class="trophy-section">
            <span class="trophy-icon">🏆</span>
            <span class="trophy-count">{{ trophyCount }}</span>
          </div>
        </mindful-card-header>
    <ion-content class="trophy-content">
      <div class="trophy-page-container">
        <div class="empty-state" *ngIf="!grouped.length">
          <img class="empty-art" src="/assets/app-assets/trophy-empty.png" alt="No trophies illustration" />
          <h2 class="empty-title">No Trophies Yet!</h2>
          <p class="empty-sub">Your journey is just beginning. Earn some cool trophies and show them off here!</p>
          <ion-button expand="block" class="earn-btn" aria-label="Earn Trophies">Earn Trophies</ion-button>
        </div>
        <div class="section" *ngIf="grouped.length">
          <ng-container *ngFor="let g of grouped">
            <h3>{{ g.title }}</h3>
            <div class="trophy-list">
              <ng-container *ngFor="let trophy of g.items">
                <div class="trophy-row">
                  <img class="thumb" [src]="trophy.image" alt="trophy" />
                  <div class="meta">
                    <div class="title">{{ trophy.title }} <span class="difficulty" [ngClass]="trophy.difficulty">• {{ trophy.difficulty }}</span></div>
                    <div class="date">Earned on {{ trophy.earnedOn | date:'MMM d' }}</div>
                  </div>
                  <div class="points">🏆 {{ trophy.points }}</div>
                </div>
              </ng-container>
            </div>
          </ng-container>
        </div>
      </div>
    </ion-content>
  `,
    styles: [`
    mindful-card-header { display: block; padding:72px 16px 16px 16px; }
    
    .trophy-page-container {
      padding: 16px;
      gap: 16px;
    }
    .section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }
    .section h3 {
      color: #282527;
      font-family: Nunito;
      font-size: 16px;
      font-weight: 700;
      line-height: 140%;
    }
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
      align-items: center;
      gap: 5px;
      margin-left: 32px;
    }
    .trophy-icon {
      font-size: 22px;
    }
    .trophy-count {
      font-weight: bold;
      font-size: 16px;
    }
    /* trophies-list styles (merged) */
    .trophy-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 8px 0;
    }
    .trophy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .thumb {
      width: 56px;
      height: 56px;
      object-fit: cover;
      margin-right: 12px;
    }
    .meta { flex: 1; }
    .title { font-weight: 700; font-size: 16px; color: #222; }
    .date { color: #777; font-size: 14px; }
    .difficulty { font-size: 12px; margin-left: 6px; color: #e74c3c; }
    .difficulty.Easy { color: #2ecc71; }
    .difficulty.Medium { color: #f1c40f; }
    .points { font-weight: 700; margin-left: 12px; }
  `]
})
export class TrophyPageComponent implements OnInit {
    pageTitle = 'Your Trophy Trail';
    grouped: { title: string; items: Trophy[] }[] = [];
    trophyCount = 0;

    constructor(private trophyService: TrophyService, private location: Location) { }

    async ngOnInit() {
        const list = await this.trophyService.fetchTrophies();
        this.trophyCount = list.length;

        const map = new Map<string, Trophy[]>();
        list.forEach(t => {
            const key = t.earnedOn.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            map.set(key, [...(map.get(key) || []), t]);
        });

        this.grouped = Array.from(map, ([title, items]) => ({ title, items }))
            .sort((a, b) => +b.items[0].earnedOn - +a.items[0].earnedOn);
    }

    onBack() {
        this.location.back();
    }
}
