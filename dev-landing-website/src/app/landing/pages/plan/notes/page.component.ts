import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FeatureWrapperComponent } from '../../feature-wrapper/feature-wrapper.component';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [FeatureWrapperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-feature-wrapper
    title="Note Taking App"
    description="Capture it before it disappears. Jot down ideas, class notes, random thoughts, or anything worth remembering quick and clutter-free."
    visualSrc="assets/Landing/9c363752290bede9b288fbb2c1622d116614a690.png"
    accentColor="#89b3b6"
    visualAspectRatio="752 / 372"
    badge=""
    preCTAText=""
    preCTAMobileText=""
  ></app-feature-wrapper>`,
})
export class NotesPageComponent {}
