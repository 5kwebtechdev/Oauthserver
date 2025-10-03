import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticatedModule } from '../authenticated.module';
import { TimelineEvent } from '../../core/models/calendar.model';

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
  events: TimelineEvent[] = [
    { id: 1, startTime: '08:00', endTime: '09:00', title: 'Morning Routine', type: 'habit' },
    { id: 2, startTime: '09:30', endTime: '10:15', title: 'Standup', type: 'event' },
    { id: 3, startTime: '11:00', endTime: '12:30', title: 'Deep Work', type: 'task' },
    { id: 4, startTime: '14:00', endTime: '15:00', title: 'Meeting', type: 'event' }
  ];
}
