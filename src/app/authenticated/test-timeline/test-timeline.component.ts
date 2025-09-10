import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticatedModule } from '../authenticated.module';

@Component({
  selector: 'test-timeline',
  standalone: true,
  imports: [CommonModule, AuthenticatedModule],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Timeline — Preview</h2>
      <mindful-timeline [events]="events"></mindful-timeline>
    </section>
  `
})
export class TestTimelineComponent {
  events = [
    { startTime: '08:00', endTime: '09:00', title: 'Morning Routine', type: 'lavendar' },
    { startTime: '09:30', endTime: '10:15', title: 'Standup', type: 'violet' },
    { startTime: '11:00', endTime: '12:30', title: 'Deep Work', type: 'magenta' },
    { startTime: '14:00', endTime: '15:00', title: 'Meeting', type: 'orange' }
  ];
}
