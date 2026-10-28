import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PetAgeService, PetType } from 'src/app/core/services/pet-age.service';

/** Displays the score returned by the challenge submission; it does not recalculate it. */
@Component({
  selector: 'app-score-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="score-status" [attr.aria-label]="statusLabel">
      <img class="score-artwork"
        [src]="artwork((petData$ | async)?.petType)"
        [alt]="statusLabel"
        [width]="artworkSize((petData$ | async)?.petType).width"
        [height]="artworkSize((petData$ | async)?.petType).height" />
      <div class="score-card" [class.score-card--good]="isGood" aria-live="polite">
        <span class="score-label">Your Score</span>
        <p class="score-count"><strong>{{ correctAnswers }}</strong><span> out of </span><strong>{{ totalQuestions }}</strong></p>
        <p class="score-message">{{ isGood ? "Great job! You're on a roll" : 'Keep learning, you’ll get there!' }}</p>
      </div>
    </section>
  `,
  styleUrls: ['./score-status.component.scss']
})
export class ScoreStatusComponent {
  @Input() score = 0;
  @Input() correctAnswers = 0;
  @Input() totalQuestions = 0;

  readonly petData$ = this.petAgeService.petData$;

  constructor(private readonly petAgeService: PetAgeService) {}

  get isGood(): boolean {
    return this.score >= 60;
  }

  get statusLabel(): string {
    return this.isGood ? 'Good' : 'Needs Attention';
  }

  artwork(pet: PetType | null | undefined): string {
    return `assets/figma/quiz-score/${pet || 'panda'}-${this.isGood ? 'good' : 'needs-attention'}.png`;
  }

  artworkSize(pet: PetType | null | undefined): { width: number; height: number } {
    const sizes = {
      panda: [{ width: 224, height: 224 }, { width: 224, height: 224 }],
      owl: [{ width: 181, height: 227 }, { width: 188, height: 224 }],
      dragon: [{ width: 170, height: 224 }, { width: 183, height: 224 }],
      llama: [{ width: 159, height: 224 }, { width: 224, height: 224 }]
    };
    return sizes[pet || 'panda'][this.isGood ? 1 : 0];
  }
}
