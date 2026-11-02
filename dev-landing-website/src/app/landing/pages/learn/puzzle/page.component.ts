import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-puzzle-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Puzzle"
    description="Your brain is stronger than you think. Crack brain-boosting puzzles that challenge your logic, pattern-thinking, and problem-solving at your own pace."
    visualSrc="assets/Landing/6f04bc2865095f931f954b91982bbcbae8c24717.png"
    accentColor="#e1527c"
    visualAspectRatio="752 / 458"
    badge=""
    preCTAText=""
    preCTAMobileText=""
  ></app-feature-wrapper>`,
})
export class PuzzlePageComponent {}
