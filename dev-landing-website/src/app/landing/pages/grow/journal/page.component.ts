import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-journal-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Daily Journal"
    description="Your thoughts deserve a safe place. Reflect on your day, track how you're feeling, and build a habit of looking inward, one entry at a time."
    visualSrc="assets/Landing/60195546b5e36fdfe684b2754b32a4d51417ab4f.png"
    accentColor="#8b8dcb"
    visualAspectRatio="752 / 446"
    badge=""
    preCTAText=""
    preCTAMobileText=""
    relatedHref="/note-taking-app"
    relatedLabel="Capture quick ideas in the note taking app"
  ></app-feature-wrapper>`,
})
export class JournalPageComponent {}
