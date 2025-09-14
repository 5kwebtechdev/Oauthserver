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

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TestButtonsComponent, TestBadgesComponent, TestInputsComponent, TestDropdownsComponent, TestSelectorsComponent, TestTimelineComponent, AddCalendarComponent, MindfulSelectorsComponent],
  template: `
    <ion-content>
      <div style="padding:1rem;">
        <h1>Test Page</h1>
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
    </ion-content>
  `
})
// add runtime demo data for selectors
export class TestComponent {
  fg: FormGroup;
  demoTags = Array.from({length: 10}).map((_, i) => ({ key: i + 1, value: 'Tag ' + (i + 1), type: 'habit' }));
  selected: any[] = [];

  constructor(private fb: FormBuilder) {
    this.fg = this.fb.group({ tags: [[]] });
    this.fg.get('tags')!.valueChanges.subscribe(v => this.selected = v || []);
  }

  onAdd(){
    // naive add: push a new tag and update form control
    const nextKey = this.demoTags.length + 1;
    this.demoTags.push({ key: nextKey, value: `Tag ${nextKey}`, type: 'habit' });
  }

  onEdit(key: any){
    // simple edit: append ' (edited)'
    const idx = this.demoTags.findIndex(t => t.key === key);
    if(idx > -1) this.demoTags[idx].value += ' (edited)';
  }

  onDelete(key: any){
    this.demoTags = this.demoTags.filter(t => t.key !== key);
    // also remove from selected if present
    const ctrl = this.fg.get('tags');
    if(ctrl){
      const newVal = (ctrl.value || []).filter((k: any) => k !== key);
      ctrl.setValue(newVal);
    }
  }
}
/* Deprecated placeholder file. The TestComponent was renamed to UserDashboardComponent and moved to
  src/app/authenticated/user-dashboard/user-dashboard.component.ts
  This file intentionally exports a harmless token to avoid accidental imports.
*/
export const __TEST_COMPONENT_DEPRECATED = true;
