import { Component } from '@angular/core';
import { TestButtonsComponent } from '../test-buttons/test-buttons.component';
import { TestBadgesComponent } from '../test-badges/test-badges.component';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [TestButtonsComponent, TestBadgesComponent],
  template: `<div style="padding:1rem"><h1>Test Page</h1><test-buttons></test-buttons><test-badges></test-badges></div>`
})
export class TestComponent {}
/* Deprecated placeholder file. The TestComponent was renamed to UserDashboardComponent and moved to
  src/app/authenticated/user-dashboard/user-dashboard.component.ts
  This file intentionally exports a harmless token to avoid accidental imports.
*/
export const __TEST_COMPONENT_DEPRECATED = true;
