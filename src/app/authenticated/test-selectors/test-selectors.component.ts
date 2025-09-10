import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulSelectorsComponent } from '../../core/components/mindful-selectors/mindful-selectors.component';

@Component({
  selector: 'test-selectors',
  standalone: true,
  imports: [CommonModule, MindfulSelectorsComponent],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Selectors — Preview</h2>
      <mindful-selectors [options]="options" componentType="button" [singleSelection]="true"></mindful-selectors>
      <mindful-selectors [options]="options" componentType="badge"></mindful-selectors>
    </section>
  `
})
export class TestSelectorsComponent {
  options = [
    { key: 1, value: 'Happy', type: 'lavendar' },
    { key: 2, value: 'Sad', type: 'violet' },
    { key: 3, value: 'Okay', type: 'magenta' }
  ];
}
