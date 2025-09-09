import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../../core/components/mindful-button/mindful-button.component';
import { MindfulBadgeComponent } from '../../core/components/mindful-badge/mindful-badge.component';
import { MindfulSelectorsComponent } from '../../core/components/mindful-selectors/mindful-selectors.component';

@Component({
  selector: 'test-buttons',
  standalone: true,
  imports: [CommonModule, MindfulButtonComponent, MindfulBadgeComponent, MindfulSelectorsComponent],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Buttons — sizes & types</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:12px 0">
        <mindful-button type="lavendar" text="Lavendar" (click)="null"></mindful-button>
        <mindful-button type="lavendar-transparent" text="Lavendar t" (click)="null"></mindful-button>
        <mindful-button type="violet" text="Violet" (click)="null"></mindful-button>
        <mindful-button type="orange" text="Orange" (click)="null"></mindful-button>
        <mindful-button type="green" text="Green" (click)="null"></mindful-button>
        <mindful-button type="magenta" text="Magenta" (click)="null"></mindful-button>
        <mindful-button type="magenta" text="Magenta large" large (click)="null"></mindful-button>
        <mindful-button type="magenta" text="Full width" large style="display:block; width:100%" (click)="null"></mindful-button>
      </div>

      <h3>Badges (circle/size)</h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin:12px 0">
        <mindful-badge text="Habit" type="lavendar"></mindful-badge>
        <mindful-badge text="Task" type="violet"></mindful-badge>
        <mindful-badge text="Goal" type="magenta" [large]="true"></mindful-badge>
      </div>

      <h3>Selectors (singleSelection)</h3>
      <mindful-selectors [options]="[{key:'happy', value:'Happy', type:'lavendar'},{key:'sad', value:'Sad', type:'violet'},{key:'neutral', value:'Okay', type:'magenta'}]" [singleSelection]="true" componentType="button"></mindful-selectors>
    </section>
  `
})
export class TestButtonsComponent {}
