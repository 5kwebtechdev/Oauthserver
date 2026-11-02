import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BadgesCardComponent } from '../../badges-section/badges-card/badges-card.component';
import { BadgeService, Badge, BadgeProgressResponse } from '../../../services/badge.service';
import { Challenge, ChallengeSubmissionResponse } from '../learning.models';

@Component({
    selector: 'sm-result-page',
    standalone: true,
    imports: [CommonModule, BadgesCardComponent],
    templateUrl: './result-page.component.html',
    styleUrls: ['./result-page.component.scss']
})
export class ResultPageComponent implements OnInit, OnDestroy {
    submissionResult: ChallengeSubmissionResponse | null = null;
    challenge: Challenge | null = null;
    timeTaken = 0;
    badges: Badge[] = [];
    badgesLoading = true;

    totalQuestions = 0;
    correctAnswers = 0;
    scorePercentage = 0;
    coinsEarned = 0;
    trophiesEarned = 0;
    celebrationText = '';

    private popStateHandler = () => this.onBack();

    constructor(private router: Router, private badgeService: BadgeService) {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras?.state as {
            submissionResult?: ChallengeSubmissionResponse;
            challenge?: Challenge;
            timeTaken?: number;
        };

        if (state?.submissionResult) {
            this.submissionResult = state.submissionResult;
            this.challenge = state.challenge || null;
            this.timeTaken = state.timeTaken || 0;
        }
    }

    ngOnInit(): void {
        if (this.submissionResult) {
            this.totalQuestions = this.submissionResult.totalQuestions;
            this.correctAnswers = this.submissionResult.correctCount;
            this.scorePercentage = this.submissionResult.percentageScore;
            this.coinsEarned = this.submissionResult.coinsEarned;
            this.trophiesEarned = this.submissionResult.trophiesEarned;
            this.celebrationText = this.submissionResult.celebrationText || this.defaultCelebrationText;
        }

        this.loadBadges();
        window.addEventListener('popstate', this.popStateHandler);
    }

    ngOnDestroy(): void {
        window.removeEventListener('popstate', this.popStateHandler);
    }

    private loadBadges(): void {
        this.badgeService.getBadgeProgress().subscribe({
            next: (response: BadgeProgressResponse) => {
                const result = this.badgeService.processBadgeResponse(response);
                // Show only quiz and puzzle related badges
                this.badges = result.badges.filter(b =>
                    /quiz|puzzle/i.test(b.name)
                );
                this.badgesLoading = false;
            },
            error: () => {
                this.badges = [];
                this.badgesLoading = false;
            }
        });
    }

    get defaultCelebrationText(): string {
        if (this.scorePercentage >= 80) return 'Great work!';
        if (this.scorePercentage >= 40) return 'Good effort!';
        return 'Every step counts!';
    }

    get scoreColor(): string {
        if (this.scorePercentage >= 80) return '#4CAF50';
        if (this.scorePercentage >= 40) return '#F0AD4E';
        return '#BB2124';
    }

    get isHighScore(): boolean {
        return this.scorePercentage >= 80;
    }

    get petImage(): string {
        if (this.scorePercentage >= 80) return 'assets/Images-Pet/Panda-Age1-Happy.png';
        if (this.scorePercentage >= 40) return 'assets/Images-Pet/Panda-Age1-Playful.png';
        return 'assets/Images-Pet/Panda-Age1-Base.png';
    }

    get sparkleCount(): number[] {
        return [1, 2, 3, 4, 5, 6, 7, 8];
    }

    onBack(): void {
        this.router.navigateByUrl('/home/learning', { replaceUrl: true });
    }
}
