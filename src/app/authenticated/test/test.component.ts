import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TestButtonsComponent } from '../test-buttons/test-buttons.component';
import { TestBadgesComponent } from '../test-badges/test-badges.component';
import { TestInputsComponent } from '../test-inputs/test-inputs.component';
import { TestDropdownsComponent } from '../test-dropdowns/test-dropdowns.component';
import { TestSelectorsComponent } from '../test-selectors/test-selectors.component';
import { MindfulSelectorsComponent } from 'src/app/core/components/mindful-selectors/mindful-selectors.component';
import { TestTimelineComponent } from '../test-timeline/test-timeline.component';
import { AddCalendarComponent } from '../add-calendar/add-calendar.component';
import { MindfulPopupComponent, MindfulPopupConfig } from 'src/app/core/components/mindful-popup/mindful-popup.component';
import { SupermeTimerComponent } from 'src/app/core/components/superme-timer/superme-timer.component';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TestButtonsComponent, TestBadgesComponent, TestInputsComponent, TestDropdownsComponent, TestSelectorsComponent, TestTimelineComponent, AddCalendarComponent, MindfulSelectorsComponent, MindfulPopupComponent, SupermeTimerComponent],
  template: `
    <ion-content>
      <!-- always-on loader for testing -->
      <div style="padding:1rem;">
        <h1>Test Page</h1>
        
        <!-- Mindful Popup Test Section -->
        <div style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
          <h2>Mindful Popup Test</h2>
          <ion-button expand="block" fill="solid" color="primary" (click)="openMindfulPopup()">
            <ion-icon name="sparkles" slot="start"></ion-icon>
            Test Mindful Popup
          </ion-button>
          <p style="margin-top: 0.5rem; font-size: 0.9em; color: #666;">
            Click to open popup with random content and Academy lesson image
          </p>
        </div>

        <!-- Superme Timer Test Section -->
        <div style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
          <h2>Superme Timer Test (5 min)</h2>
          <app-superme-timer [totalSeconds]="300"></app-superme-timer>
        </div>

        <test-buttons></test-buttons>
        <test-badges></test-badges>
        <test-inputs></test-inputs>
        <test-dropdowns></test-dropdowns>
        <test-selectors></test-selectors>
        <test-timeline></test-timeline>
        <app-add-calendar></app-add-calendar>

        <h2 style="margin-top: 2rem">Tags demo (mindful-selectors)</h2>
        <mindful-selectors
          [options]="demoTags"
          componentType="badge"
          [formGroup]="fg"
          formControlName="tags"
          (add)="onAdd()"
          (edit)="onEdit($event)"
          (delete)="onDelete($event)"
        ></mindful-selectors>

        <div style="margin-top: 1rem">
          Selected: {{selected | json}}
        </div>
      </div>

      <!-- Mindful Popup Component -->
      <app-mindful-popup
        [isVisible]="showPopup"
        [config]="popupConfig"
        (closeAction)="closePopup()"
        (backdropClick)="closePopup()"
        (primaryAction)="onPopupPrimaryAction()"
        (secondaryAction)="onPopupSecondaryAction()">
      </app-mindful-popup>
    </ion-content>
  `
})
// add runtime demo data for selectors
export class TestComponent {
  fg: FormGroup;
  demoTags = Array.from({ length: 10 }).map((_, i) => ({ key: i + 1, value: 'Tag ' + (i + 1), type: 'habit' }));
  selected: any[] = [];

  // Mindful Popup properties
  showPopup = false;
  popupConfig: MindfulPopupConfig = {};

  constructor(private fb: FormBuilder) {
    this.fg = this.fb.group({ tags: [[]] });
    this.fg.get('tags')!.valueChanges.subscribe(v => this.selected = v || []);
  }

  onAdd() {
    // naive add: push a new tag and update form control
    const nextKey = this.demoTags.length + 1;
    this.demoTags.push({ key: nextKey, value: `Tag ${nextKey}`, type: 'habit' });
  }

  onEdit(key: any) {
    // simple edit: append ' (edited)'
    const idx = this.demoTags.findIndex(t => t.key === key);
    if (idx > -1) this.demoTags[idx].value += ' (edited)';
  }

  onDelete(key: any) {
    this.demoTags = this.demoTags.filter(t => t.key !== key);
    // also remove from selected if present
    const ctrl = this.fg.get('tags');
    if (ctrl) {
      const newVal = (ctrl.value || []).filter((k: any) => k !== key);
      ctrl.setValue(newVal);
    }
  }

  // Mindful Popup methods
  openMindfulPopup() {
    const randomHeadings = [
      'Take a Mindful Moment',
      'Breathe and Center Yourself',
      'Academy Lesson Time',
      'Mindful Learning Break',
      'Focus on Growth'
    ];

    const randomSubtitles = [
      'Remember to stay present and focused on your learning journey.',
      'Take a deep breath and embrace this moment of growth.',
      'Your mindful practice is leading you to new insights.',
      'Let this lesson guide you toward inner wisdom.',
      'Every step in learning is a step toward mindfulness.'
    ];

    // Generate random content
    const randomHeading = randomHeadings[Math.floor(Math.random() * randomHeadings.length)];
    const randomSubtitle = randomSubtitles[Math.floor(Math.random() * randomSubtitles.length)];

    this.popupConfig = {
      image: 'assets/app-assets/Academy-course-lesson4.svg',
      imageAlt: 'Academy Course Lesson',
      heading: randomHeading,
      subtitle: randomSubtitle,
      primaryCTA: {
        text: 'Continue Learning',
        type: 'primary'
      },
      secondaryCTA: {
        text: 'Take a Break',
        type: 'secondary'
      },
      showCloseButton: true,
      backdrop: true
    };

    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
  }

  onPopupPrimaryAction() {
    console.log('Primary action clicked: Continue Learning');
    this.closePopup();
  }

  onPopupSecondaryAction() {
    console.log('Secondary action clicked: Take a Break');
    this.closePopup();
  }
}
/* Deprecated placeholder file. The TestComponent was renamed to UserDashboardComponent and moved to
  src/app/authenticated/user-dashboard/user-dashboard.component.ts
  This file intentionally exports a harmless token to avoid accidental imports.
*/
export const __TEST_COMPONENT_DEPRECATED = true;
