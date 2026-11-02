import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-reels-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Reels"
    description="Scroll time into Skill time. Short reels that turn downtime into growth time. Learn valuable skills while scrolling."
    visualSrc="assets/Landing/Reels2.png"
    accentColor="#e1527c"
    visualAspectRatio="752 / 458"
    badge="Launching Soon"
    preCTAText="Use other features while you wait"
    preCTAMobileText="Use other features while you wait"
  ></app-feature-wrapper>`,
})
export class ReelsPageComponent {}
