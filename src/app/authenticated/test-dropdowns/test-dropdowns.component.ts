import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulDropdownComponent } from '../../core/components/mindful-dropdown/mindful-dropdown.component';

@Component({
  selector: 'test-dropdowns',
  standalone: true,
  imports: [CommonModule, MindfulDropdownComponent],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Dropdowns — Preview</h2>

      <div style="margin:12px 0">
        <h3>Default dropdown</h3>
        <mindful-dropdown></mindful-dropdown>
      </div>

      <div style="margin:12px 0">
        <h3>Demo options</h3>
        <mindful-dropdown [options]="demoOptions" (selectionChange)="onSelect($event)"></mindful-dropdown>
        <div *ngIf="selected" style="margin-top:8px"><strong>Selected:</strong> {{selected | json}}</div>
      </div>
    </section>
  `
})
export class TestDropdownsComponent {
  demoOptions = [
    { key: 'one', value: 'One' },
    { key: 'two', value: 'Two' },
    { key: 'three', value: 'Three' }
  ];

  selected: any = null;
  onSelect(e: any){ this.selected = e }
}
