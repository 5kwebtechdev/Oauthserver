import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StreaksService, StreakLeaderboardUser, CurrentUserStreak, StreakLeaderboardResponse } from '../../services/streaks.service';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../mindful-pet/mindful-pet.component';

@Component({
    selector: 'app-streaks-section',
    template: `
<ion-content class="streaks-page" fullscreen>
    <mindful-navigator heading="Your Streak Journey" backIcon="arrowSvg"></mindful-navigator>
    <div class="leaderboard-card">
        <div class="streaks-status">
            <div class="streaks-status-item">
                <span class="status-label">Current Streak</span>
                <img src="assets/Icons-Neutral/Icon-Streak.png" alt="fire icon" class="icon" />
                <span class="status-value">{{ currentUser?.streakDays || 0 }} days</span>
            </div>
            <div class="streaks-status-item">
                <span class="status-label">Best Streak</span>
                <img src="assets/Icons-Neutral/Icon-BestStreak.png" alt="trophy icon" class="icon" />
                <span class="status-value">{{ currentUser?.streakDays || 0 }} days</span>
            </div>
            <div class="streaks-status-item">
                <span class="status-label">Total days Active</span>
                <img src="assets/Icons-Neutral/Icon-TotalActiveDays.png" alt="total active days icon" class="icon" />
                <span class="status-value">{{ currentUser?.streakDays || 0 }} days</span>
            </div>
        </div>
        <div class="streak-container">
            <h2 class="title mb-0">Top Streakers</h2>
        </div>
        <div class="top-strickers-header d-flex align-items-center justify-content-end">
            <div class="d-flex align-items-center gap-2">
                <app-speech-bubble [message]="currentUser?.petMessage || 'Keep going champ!'" type="talking"
                    arrowSide="right" color="#F0AD4E" style="width: 209px;"></app-speech-bubble>
                <mindful-pet pet="panda" mood="tired" [size]="44"></mindful-pet>
            </div>
        </div>
        <div class="streaks-card">
            <ul class="streaks-list">
                <li *ngFor="let item of rankedStreaks; let i = index" class="streak-item">
                    <div class="left">
                        <div class="d-flex flex-column" style="align-items: center; margin-right: 16px;">
                            <div class="rank">{{ i + 1 }}</div>
                            <div class="trend" *ngIf="item.highestStreak === 0 || item.highestStreak === 1">
                                <span class="triangle down"></span>
                            </div>
                            <div class="trend" *ngIf="item.highestStreak > 1">
                                <span class="triangle up"></span>
                            </div>
                        </div>
                        <div class="avatar-wrap">
                            <img class="avatar" [src]="item.avatar || 'assets/avatar/ChildAvatar.png'"
                                [alt]="item.name + ' avatar'">
                        </div>
                        <div class="name">{{ item.name }}</div>
                    </div>
                    <div class="right">
                        <div class="days">{{ item.highestStreak }} days</div>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</ion-content>
    `,
    styles: [`
:host {
    display: block;
}

ion-content.streaks-page {
    --padding-top: 0 !important;
    --ion-safe-area-top: 0 !important;
    padding-top: 0 !important;
}

.leaderboard-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    margin-top: 66px;
}

.title {
    font-weight: 700;
    font-size: 20px;
    margin: 0 0 12px 0;
    color: #282527;
    font-family: Nunito;
    line-height: 140%;
}

.streaks-status {
    display: flex;
    gap: 16px;
    align-items: stretch;
    flex-wrap: wrap;
}

.streaks-status-item {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    padding: 12px 10px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #FFF;
    box-shadow: 0 0 2px 2px rgba(107, 101, 106, 0.10);
    min-height: 120px;
    height: auto;
}

.status-label {
    color: #6B656A;
    text-align: center;
    font-family: Nunito;
    font-size: 16px;
    font-weight: 600;
    line-height: 140%;
}

.status-value {
    align-self: stretch;
    color: #282527;
    text-align: center;
    font-family: Nunito;
    font-size: 20px;
    font-weight: 700;
    line-height: 140%;
}

.icon {
    width: 40px;
    height: 40px;
    align-items: center;
    aspect-ratio: 1/1;
}

.streak-container {
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #fff;
    gap: 16px;
}

.top-strickers-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.streaks-card {
    padding: 10px 8px;
    margin: 0 auto;
    border-radius: 8px;
    background: #FDFDFD;
    box-shadow: 0 0 2px 2px rgba(107, 101, 106, 0.10);
}

.streaks-list {
    list-style: none;
    margin: 0;
    padding: 8px 0;
}

.streak-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.left {
    display: flex;
    align-items: center;
}

.rank {
    width: 28px;
    text-align: center;
    font-weight: 700;
    color: #4a4a4a;
    font-size: 18px;
}

.trend {
    width: 14px;
}

.triangle {
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
}

.triangle.up {
    border-bottom: 10px solid #33a853;
}

.triangle.down {
    border-top: 10px solid #d23f3f;
}

.avatar-wrap {
    width: 44px;
    height: 44px;
    margin-right: 8px;
    border-radius: 50%;
    padding: 3px;
    box-shadow: 0 0 0 4px rgba(255, 200, 80, 0.12);
}

.avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
}

.name {
    font-size: 18px;
    color: #333333;
    font-weight: 600;
}

.right {
    display: flex;
    align-items: center;
}

.days {
    color: #777777;
    font-size: 18px;
    font-weight: 500;
}

@media (max-width: 420px) {
    .streaks-card {
        padding: 6px;
    }

    .streak-item {
        padding: 10px 8px;
    }

    .name,
    .days,
    .rank {
        font-size: 16px;
    }

    .avatar-wrap {
        width: 40px;
        height: 40px;
    }
}
    `],
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent]
})
export class StreaksSectionComponent implements OnInit {
    @Input() title = 'Top Streakers';
    @Input() showRankBanner = true;
    
    currentUser: CurrentUserStreak | null = null;
    streaks: StreakLeaderboardUser[] = [];

    get rankedStreaks(): StreakLeaderboardUser[] {
        return this.streaks?.length ? this.streaks.slice().sort((a, b) => b.highestStreak - a.highestStreak) : [];
    }

    constructor(private streaksService: StreaksService) { }

    ngOnInit(): void {
        this.streaksService.getLeaderboard().subscribe({
            next: (response: StreakLeaderboardResponse) => {
                this.currentUser = response.currentUser;
                this.streaks = response.topUsers;
            },
            error: (error) => {
                console.error('Error fetching leaderboard data:', error);
                this.currentUser = null;
                this.streaks = [];
            }
        });
    }
}