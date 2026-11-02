import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-academy-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Online Master Classes"
    description="Beyond School. Beyond Textbooks. Explore online master classes on real-life skills that help you grow. Learn at your own pace and earn rewards as you go."
    visualSrc="assets/Landing/f2c42fa2ffa0cdb459e09758a4cfcf794a507565.png"
    accentColor="#e1527c"
    visualAspectRatio="752 / 343"
    badge=""
    preCTAText=""
    preCTAMobileText=""
  ></app-feature-wrapper>`,
})
export class AcademyPageComponent {}
