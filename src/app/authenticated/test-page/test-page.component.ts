import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestInputsComponent } from '../test-inputs/test-inputs.component';
import { TestBadgesComponent } from '../test-badges/test-badges.component';
import { TestButtonsComponent } from '../test-buttons/test-buttons.component';
import { TestDropdownsComponent } from '../test-dropdowns/test-dropdowns.component';
import { TestSelectorsComponent } from '../test-selectors/test-selectors.component';

@Component({
  selector: 'test-page',
  standalone: true,
  imports: [
    CommonModule,
    TestInputsComponent,
    TestBadgesComponent,
    TestButtonsComponent,
    TestDropdownsComponent,
    TestSelectorsComponent
  ],
  template: `
    <main style="padding:1rem; max-width:1100px; margin:0 auto">
      <h1>UI Test Page</h1>
      <p style="color:#666; margin-bottom:1rem">All test components rendered below — every element created by each component will appear here.</p>

      <section style="border-top:1px solid #eee; padding-top:16px; margin-top:8px">
        <test-inputs></test-inputs>
      </section>

      <section style="border-top:1px solid #eee; padding-top:16px; margin-top:8px">
        <test-badges></test-badges>
      </section>

      <section style="border-top:1px solid #eee; padding-top:16px; margin-top:8px">
        <test-buttons></test-buttons>
      </section>

      <section style="border-top:1px solid #eee; padding-top:16px; margin-top:8px">
        <test-dropdowns></test-dropdowns>
      </section>

      <section style="border-top:1px solid #eee; padding-top:16px; margin-top:8px">
        <test-selectors></test-selectors>
      </section>
    </main>
  `
})
export class TestPageComponent {}
