import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  standalone: false
})
export class TimelineComponent  implements OnInit {
  // @ts-ignore
  public filteredEvents: any[] = [];
  private events: any = [
    { startTime: '06:00', endTime: '07:00', title: 'Meditation', type: 'habit' },
    { startTime: '06:30', endTime: '07:30', title: 'Yoga', type: 'habit' },
    { startTime: '06:30', endTime: '07:30', title: 'Yoga', type: 'timetable' },
    { startTime: '06:30', endTime: '07:30', title: 'Yoga', type: 'task' },
    { startTime: '13:00', endTime: '14:00', title: 'Reading', type: 'task' },
    { startTime: '20:00', endTime: '22:30', title: 'Reflection', type: 'timetable' }
  ];

  constructor() { }

  ngOnInit() {
    this.filteredEvents = this.events.filter((event: any) => {
      return true
    });
  }

  protected readonly console = console;

  keysUpdated(selection: number[]) {
    this.filteredEvents = this.events.filter((event: any) => {
      // @ts-ignore
      return selection.includes('all') || selection.includes(event.type)});
  }
}
