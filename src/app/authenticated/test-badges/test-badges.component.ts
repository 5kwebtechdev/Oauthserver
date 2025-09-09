import { Component } from '@angular/core';
import { MindfulBadgeComponent } from '../../core/components/mindful-badge/mindful-badge.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'test-badges',
  standalone: true,
  imports: [CommonModule, MindfulBadgeComponent],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Badges — types & sizes</h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin:12px 0">
        <mindful-badge text="Lavendar" type="lavendar"></mindful-badge>
        <mindful-badge text="Violet" type="violet"></mindful-badge>
        <mindful-badge text="Magenta" type="magenta" large></mindful-badge>
        <mindful-badge text="Circle" type="magenta" circle></mindful-badge>
        <mindful-badge text="Inactive" type="lavendar" inactive></mindful-badge>
      </div>
    </section>
  `
})
export class TestBadgesComponent {}
