import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Quiz"
    description="Test what you know. Discover what you don't. Take on quick-fire quizzes across topics that actually matter, earn coins for every correct answer."
    visualSrc="assets/Landing/6f04bc2865095f931f954b91982bbcbae8c24717.png"
    accentColor="#e1527c"
    visualAspectRatio="752 / 458"
    badge=""
    preCTAText=""
    preCTAMobileText=""
    relatedHref="/puzzle"
    relatedLabel="Explore brain-boosting puzzles"
  ></app-feature-wrapper>`,
})
export class QuizPageComponent {}
