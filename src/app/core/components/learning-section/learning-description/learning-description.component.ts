import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { Challenge } from 'src/app/core/models/learning.models';

@Component({
  selector: 'app-learning-description',
  standalone: true,
  imports: [CommonModule, HttpClientModule, SupermeNavigatorComponent],
  providers: [LearningService],
  template: `
    <div class="content-description-screen" *ngIf="!isLoading && challenge">
      <div class="back-title">
        <superme-navigator [heading]="challenge.name" backIcon="arrowSvg" (back)="onBack()"></superme-navigator>
      </div>
      <div class="desc-image">
        <img [src]="challenge.innerImageUrl || challenge.thumbnailImageUrl || 'assets/images/Quiz_Description_screen-Thumbnail.webp'" [alt]="challenge.name" class="hero-image" />
      </div>

      <div class="meta-cards">
        <div class="row">
          <div class="col-6">
            <div class="meta">
              <div class="meta-value">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M8.83333 2C8.6 2 8.40278 1.91944 8.24167 1.75833C8.08055 1.59722 8 1.4 8 1.16667C8 0.933333 8.08055 0.736111 8.24167 0.575C8.40278 0.413889 8.6 0.333333 8.83333 0.333333C9.06667 0.333333 9.26389 0.413889 9.425 0.575C9.58611 0.736111 9.66667 0.933333 9.66667 1.16667C9.66667 1.4 9.58611 1.59722 9.425 1.75833C9.26389 1.91944 9.06667 2 8.83333 2ZM8.83333 13C8.6 13 8.40278 12.9194 8.24167 12.7583C8.08055 12.5972 8 12.4 8 12.1667C8 11.9333 8.08055 11.7361 8.24167 11.575C8.40278 11.4139 8.6 11.3333 8.83333 11.3333C9.06667 11.3333 9.26389 11.4139 9.425 11.575C9.58611 11.7361 9.66667 11.9333 9.66667 12.1667C9.66667 12.4 9.58611 12.5972 9.425 12.7583C9.26389 12.9194 9.06667 13 8.83333 13ZM11.5 4.33333C11.2667 4.33333 11.0694 4.25278 10.9083 4.09167C10.7472 3.93056 10.6667 3.73333 10.6667 3.5C10.6667 3.26667 10.7472 3.06944 10.9083 2.90833C11.0694 2.74722 11.2667 2.66667 11.5 2.66667C11.7333 2.66667 11.9306 2.74722 12.0917 2.90833C12.2528 3.06944 12.3333 3.26667 12.3333 3.5C12.3333 3.73333 12.2528 3.93056 12.0917 4.09167C11.9306 4.25278 11.7333 4.33333 11.5 4.33333ZM11.5 10.6667C11.2667 10.6667 11.0694 10.5861 10.9083 10.425C10.7472 10.2639 10.6667 10.0667 10.6667 9.83333C10.6667 9.6 10.7472 9.40278 10.9083 9.24167C11.0694 9.08055 11.2667 9 11.5 9C11.7333 9 11.9306 9.08055 12.0917 9.24167C12.2528 9.40278 12.3333 9.6 12.3333 9.83333C12.3333 10.0667 12.2528 10.2639 12.0917 10.425C11.9306 10.5861 11.7333 10.6667 11.5 10.6667ZM12.5 7.5C12.2667 7.5 12.0694 7.41944 11.9083 7.25833C11.7472 7.09722 11.6667 6.9 11.6667 6.66667C11.6667 6.43333 11.7472 6.23611 11.9083 6.075C12.0694 5.91389 12.2667 5.83333 12.5 5.83333C12.7333 5.83333 12.9306 5.91389 13.0917 6.075C13.2528 6.23611 13.3333 6.43333 13.3333 6.66667C13.3333 6.9 13.2528 7.09722 13.0917 7.25833C12.9306 7.41944 12.7333 7.5 12.5 7.5ZM6.66667 13.3333C5.74444 13.3333 4.87778 13.1583 4.06667 12.8083C3.25556 12.4583 2.55 11.9833 1.95 11.3833C1.35 10.7833 0.875 10.0778 0.525 9.26667C0.175 8.45555 0 7.58889 0 6.66667C0 5.74444 0.175 4.87778 0.525 4.06667C0.875 3.25556 1.35 2.55 1.95 1.95C2.55 1.35 3.25556 0.875 4.06667 0.525C4.87778 0.175 5.74444 0 6.66667 0V1.33333C5.17778 1.33333 3.91667 1.85 2.88333 2.88333C1.85 3.91667 1.33333 5.17778 1.33333 6.66667C1.33333 8.15555 1.85 9.41667 2.88333 10.45C3.91667 11.4833 5.17778 12 6.66667 12V13.3333ZM6.66667 8C6.3 8 5.98611 7.86944 5.725 7.60833C5.46389 7.34722 5.33333 7.03333 5.33333 6.66667C5.33333 6.61111 5.33611 6.55278 5.34167 6.49167C5.34722 6.43056 5.36111 6.37222 5.38333 6.31667L4 4.93333L4.93333 4L6.31667 5.38333C6.36111 5.37222 6.47778 5.35556 6.66667 5.33333C7.03333 5.33333 7.34722 5.46389 7.60833 5.725C7.86944 5.98611 8 6.3 8 6.66667C8 7.03333 7.86944 7.34722 7.60833 7.60833C7.34722 7.86944 7.03333 8 6.66667 8Z" fill="#282527"/>
                </svg>
                {{formatDuration(challenge.timeDuration)}}
              </div>
              <div class="meta-label">Duration</div>
            </div>
          </div>
          <div class="col-6">
            <div class="meta">
              <div class="meta-value">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="10" height="14" viewBox="0 0 10 14" fill="none">
                  <path d="M5 13.3333C4.63333 13.3333 4.31944 13.2028 4.05833 12.9417C3.79722 12.6806 3.66667 12.3667 3.66667 12H6.33333C6.33333 12.3667 6.20278 12.6806 5.94167 12.9417C5.68056 13.2028 5.36667 13.3333 5 13.3333ZM2.33333 11.3333V10H7.66667V11.3333H2.33333ZM2.5 9.33333C1.73333 8.87778 1.125 8.26667 0.675 7.5C0.225 6.73333 0 5.9 0 5C0 3.61111 0.486111 2.43056 1.45833 1.45833C2.43056 0.486111 3.61111 0 5 0C6.38889 0 7.56944 0.486111 8.54167 1.45833C9.51389 2.43056 10 3.61111 10 5C10 5.9 9.775 6.73333 9.325 7.5C8.875 8.26667 8.26667 8.87778 7.5 9.33333H2.5ZM2.9 8H7.1C7.6 7.64444 7.98611 7.20556 8.25833 6.68333C8.53056 6.16111 8.66667 5.6 8.66667 5C8.66667 3.97778 8.31111 3.11111 7.6 2.4C6.88889 1.68889 6.02222 1.33333 5 1.33333C3.97778 1.33333 3.11111 1.68889 2.4 2.4C1.68889 3.11111 1.33333 3.97778 1.33333 5C1.33333 5.6 1.46944 6.16111 1.74167 6.68333C2.01389 7.20556 2.4 7.64444 2.9 8Z" fill="#282527"/>
                </svg>
                {{challenge.totalQuestions || 5}}
              </div>
              <div class="meta-label">Questions</div>
            </div>
          </div>
          <div class="col-6">
            <div class="meta">
              <div class="meta-value">
                <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12" fill="none">
                  <path d="M1.33333 10.6667H4V5.33333H1.33333V10.6667ZM5.33333 10.6667H8V1.33333H5.33333V10.6667ZM9.33333 10.6667H12V6.66667H9.33333V10.6667ZM0 12V4H4V0H9.33333V5.33333H13.3333V12H0Z" fill="#282527"/>
                </svg>
                {{challenge.difficultyDisplay || challenge.difficulty}}
              </div>
              <div class="meta-label">Difficulty</div>
            </div>
          </div>
          <div class="col-6">
            <div class="meta">
              <div class="meta-value">
                <img src="assets/figma/parent-child-learning/coin.webp" alt="" class="meta-icon" />
                {{challenge.coinsForCorrectAnswer || challenge.coins || 5}} coins
              </div>
              <div class="meta-label">For Correct Answer</div>
            </div>
          </div>
        </div>
      </div>

      <div class="description">
        <p>{{challenge.descriptionExpanded || challenge.description}}</p>
      </div>

      <button class="start-journey w-100" (click)="isParentAssignment ? assignToChild() : startJourney()"
        [disabled]="isAssigningToChild || assignmentComplete">
        <span *ngIf="!isAssigningToChild">{{ assignmentComplete ? 'Assigned' : (isParentAssignment ? 'Assign' : 'Start your journey') }}</span>
        <span *ngIf="isParentAssignment && !isAssigningToChild" class="assignment-coin-reward">
          <img src="assets/figma/parent-child-learning/coin.webp" alt="" aria-hidden="true"> 20
        </span>
        <span *ngIf="isAssigningToChild">Assigning...</span>
      </button>
      <p *ngIf="assignmentError" class="assignment-error" role="alert">{{ assignmentError }}</p>
    </div>

    <div class="content-description-screen" *ngIf="isLoading" style="text-align: center; padding: 48px 16px;">
      <p>Loading challenge details...</p>
    </div>

    <div class="content-description-screen" *ngIf="!isLoading && !challenge" style="text-align: center; padding: 48px 16px;">
      <p>Challenge not found</p>
      <button class="start-journey" style="margin-top: 16px;" (click)="router.navigate(['/authed/content'])">Back to Learning</button>
    </div>
  `,
  styles: [
    `
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
    }
    /* This routed screen does not use ion-content, so it must provide its
       own single safe-area inset for the navigator on notched devices. */
    .content-description-screen { width: min(100%, 960px); margin: 0 auto; padding: calc(var(--sat, 0px) + 12px) 20px 32px; box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; gap: 20px; }
    .content-description-screen .back-title { display: flex; align-items: center; min-width: 0; }
    .content-description-screen .desc-image { width: 100%; height: clamp(200px, 27vw, 320px); display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 16px; background: #f6f4f4; }
    .content-description-screen .desc-image .hero-image { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }
    .content-description-screen .meta-cards { width: 100%; }
    .content-description-screen .meta-cards .row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; width: 100%; margin: 0; }
    .content-description-screen .meta-cards .col-6 { width: auto; max-width: none; min-width: 0; padding: 0; }
    .content-description-screen .meta-cards .meta { display: flex; height: 100%; box-sizing: border-box; padding: 14px; flex-direction: column; align-items: flex-start; gap: 4px; border-radius: 12px; border-bottom: 3px solid #E1527C; background: #FFF; box-shadow: 0 0 2px 2px rgba(107, 101, 106, 0.10); }
    .content-description-screen .meta-cards .meta-value { display: flex; align-items: center; gap: 8px; font-family: Nunito; font-weight: 700; font-size: 18px; color: #282527; }
    .content-description-screen .meta-cards .meta-icon { width: 18px; height: 18px; object-fit: contain; display: inline-block; }
    .content-description-screen .meta-cards .meta-label { color: #282527; font-family: Nunito; font-size: 13px; font-weight: 600; line-height: 140%; opacity: 0.7; }
    .content-description-screen .description { color: #282527; font-family: Nunito; font-size: 16px; font-style: normal; font-weight: 600; line-height: 140%; opacity: 0.7; overflow-wrap: anywhere; }
    .content-description-screen .description p { margin: 0; }
    .content-description-screen .start-journey { display: flex; height: 56px; color: #FFF; padding: 10px; justify-content: center; align-items: center; gap: 8px; flex-shrink: 0; border-radius: 8px; border: 1px solid #CF3359; background: linear-gradient(99deg, #E1527C 0.65%, #AC2456 99.35%); box-shadow: 0 -2px 2px 0 #F4ADC6 inset, 0 0 1px 0.5px rgba(225, 82, 124, 0.20); font-family: Nunito; font-size: 16px; font-style: normal; font-weight: 700; line-height: 140%; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; cursor: pointer; }
    .w-100 { width: 100%; }
    .assignment-error { width: 100%; margin: -8px 0 0; color: #b42318; font-size: 13px; text-align: center; }
    .assignment-coin-reward { display: inline-flex; align-items: center; gap: 4px; }
    .assignment-coin-reward img { width: 20px; height: 20px; object-fit: contain; vertical-align: middle; }
    @media (max-width: 700px) {
      .content-description-screen { padding-inline: 16px; gap: 16px; }
      .content-description-screen .desc-image { height: clamp(190px, 54vw, 260px); }
      .content-description-screen .meta-cards .row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .content-description-screen .meta-cards .meta { padding: 12px; }
      .content-description-screen .meta-cards .meta-value { font-size: 16px; }
    }
    `
  ]
})
export class LearningDescriptionComponent implements OnInit {
  heading: string = 'Apple Orchard Math Challenge';
  challenge: Challenge | null = null;
  isLoading = true;
  private isNavigating = false;
  private returnUrl = '/authed/content';
  private profileUserId: string | number | null = null;
  isParentAssignment = false;
  isAssigningToChild = false;
  assignmentComplete = false;
  assignmentError = '';
  private parentAssignmentChildId: number | null = null;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private learningService: LearningService
  ) { }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    const navigationState = navigation?.extras?.state || (history as any)?.state || {};
    const source = navigationState?.['source'];
    this.profileUserId = navigationState?.['ownProfile'] === true
      ? navigationState?.['forUserId'] ?? null
      : null;
    const selectedChildId = Number(navigationState?.['selectedChildId']);
    this.parentAssignmentChildId = Number.isFinite(selectedChildId) && selectedChildId > 0 ? selectedChildId : null;
    this.isParentAssignment = typeof source === 'string'
      && (source.includes('view=parent') || source.includes('/parent-learning'))
      && this.parentAssignmentChildId !== null;
    if (typeof source === 'string' && source.startsWith('/')) {
      this.returnUrl = source;
    }

    // Get challenge ID from route parameters
    const challengeId = this.route.snapshot.paramMap.get('id');
    console.log('Challenge ID from route:', challengeId);

    if (challengeId) {
      this.learningService.fetchChallengeById(Number(challengeId)).subscribe({
        next: (challenge) => {
          console.log('Challenge loaded:', challenge);
          this.challenge = challenge;
          if (challenge) {
            this.heading = challenge.name;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading challenge:', error);
          this.isLoading = false;
        }
      });
    } else {
      console.error('No challenge ID provided in route');
      this.isLoading = false;
    }
  }

  startJourney() {
    if (this.isNavigating) return;
    this.isNavigating = true;
    if (this.challenge) {
      this.router.navigate(['/authed/content/questions', this.challenge.challengeId], {
        state: {
          challenge: this.challenge,
          source: this.returnUrl,
          ...(this.profileUserId != null
            ? { forUserId: this.profileUserId, ownProfile: true }
            : {})
        }
      });
    } else {
      this.router.navigate(['/authed/content/questions']);
    }
  }

  assignToChild(): void {
    if (!this.challenge || !this.parentAssignmentChildId || this.isAssigningToChild || this.assignmentComplete) return;
    this.isAssigningToChild = true;
    this.assignmentError = '';
    this.learningService.assignChallenge(this.challenge.challengeId, [this.parentAssignmentChildId], 20).subscribe({
      next: () => { this.isAssigningToChild = false; this.assignmentComplete = true; },
      error: (error) => {
        this.isAssigningToChild = false;
        this.assignmentError = String(error?.error?.message || error?.message || 'Unable to assign this quiz. Please try again.');
      }
    });
  }

  onBack() {
    void this.router.navigateByUrl(this.returnUrl);
  }

  formatDuration(value: any): string {
    if (!value && value !== 0) return '5 minutes';
    const str = String(value).trim();
    if (/min/i.test(str)) return str;
    const num = parseFloat(str);
    if (isNaN(num)) return str;
    return `${num} min`;
  }
}
