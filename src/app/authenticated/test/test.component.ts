import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TestButtonsComponent } from '../test-buttons/test-buttons.component';
import { TestBadgesComponent } from '../test-badges/test-badges.component';
import { TestInputsComponent } from '../test-inputs/test-inputs.component';
import { TestDropdownsComponent } from '../test-dropdowns/test-dropdowns.component';
import { TestSelectorsComponent } from '../test-selectors/test-selectors.component';
import { TestTimelineComponent } from '../test-timeline/test-timeline.component';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [IonicModule, TestButtonsComponent, TestBadgesComponent, TestInputsComponent, TestDropdownsComponent, TestSelectorsComponent, TestTimelineComponent],
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
      </div>
    </ion-content>
  `
})
export class TestComponent {}
/* Deprecated placeholder file. The TestComponent was renamed to UserDashboardComponent and moved to
  src/app/authenticated/user-dashboard/user-dashboard.component.ts
  This file intentionally exports a harmless token to avoid accidental imports.
*/
export const __TEST_COMPONENT_DEPRECATED = true;
