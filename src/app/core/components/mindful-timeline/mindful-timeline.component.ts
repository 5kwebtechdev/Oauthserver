import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import { TimelineEvent } from '../../models/calendar.model';

interface EventPosition extends TimelineEvent {
  _top?: number;
  _height?: number;
  _column?: number;
  _columnCount?: number;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-timeline',
  templateUrl: './mindful-timeline.component.html',
  styleUrls: ['./mindful-timeline.component.scss'],
  standalone: false
})
export class MindfulTimelineComponent implements OnInit, OnChanges {
  @Input() events: EventPosition[] = [];
  @Output() eventLongPressed = new EventEmitter<TimelineEvent>();

  timeSlots: string[] = [];
  compressedSlots: { startHour: number, count: number }[] = [];
  hourHeight = 60;

  ngOnInit(): void {
    this.initializeTimeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events'] && !changes['events'].firstChange) {
      this.initializeTimeline();
    }
  }

  initializeTimeline(): void {
    this.generateTimeSlots();
    this.compressEmptyBlocks();
    this.assignEventPositions();
  }

  generateTimeSlots() {
    this.timeSlots = Array.from({ length: 24 }, (_, i) =>
      `${i.toString().padStart(2, '0')}:00`
    );
  }

  parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  assignEventPositions() {
    // Sort events by start time
    this.events.sort((a, b) => this.parseTime(a.startTime) - this.parseTime(b.startTime));

    const groups: EventPosition[][] = [];
    let currentGroup: EventPosition[] = [];

    for (const event of this.events) {
      const eventStart = this.parseTime(event.startTime);
      const eventEnd = this.parseTime(event.endTime);

      // Check for overlap with group
      if (
        currentGroup.length === 0 ||
        this.parseTime(currentGroup[currentGroup.length - 1].endTime) > eventStart
      ) {
        currentGroup.push(event);
      } else {
        this.assignColumns(currentGroup);
        currentGroup = [event];
      }
    }

    if (currentGroup.length > 0) {
      this.assignColumns(currentGroup);
    }

    // Calculate top and height
    this.events.forEach(event => {
      event._top = this.getCompressedTop(this.parseTime(event.startTime));
      const duration = this.parseTime(event.endTime) - this.parseTime(event.startTime);
      event._height = (duration / 60) * this.hourHeight;
    });
  }

  assignColumns(events: EventPosition[]) {
    const slots: EventPosition[][] = [];

    for (const event of events) {
      let placed = false;
      for (const slot of slots) {
        if (this.parseTime(slot[slot.length - 1].endTime) <= this.parseTime(event.startTime)) {
          slot.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        slots.push([event]);
      }
    }

    const total = slots.length;
    slots.forEach((slot, colIndex) => {
      slot.forEach(e => {
        e._column = colIndex;
        e._columnCount = total;
      });
    });
  }

  compressEmptyBlocks() {
    // If no events, don't compress - show full timeline
    if (!this.events || this.events.length === 0) {
      this.compressedSlots = [];
      return;
    }

    const occupied = new Set<number>();
    this.events.forEach(e => {
      const startMinutes = this.parseTime(e.startTime);
      const endMinutes = this.parseTime(e.endTime);

      let startHour = Math.floor(startMinutes / 60);
      let endHour = Math.ceil(endMinutes / 60);

      // Handle case where endTime is before startTime (spans to next day or wrong format)
      // If end is less than start, assume it's meant to be PM (add 12 hours if < 12)
      if (endMinutes < startMinutes && endHour < 12) {
        endHour += 12;
      }

      for (let h = startHour; h <= endHour && h < 24; h++) {
        occupied.add(h);
      }
    });

    this.compressedSlots = [];
    let i = 0;

    while (i < 24) {
      if (!occupied.has(i)) {
        let start = i;
        while (i < 24 && !occupied.has(i)) i++;
        const gap = i - start;
        if (gap >= 5) {
          this.compressedSlots.push({ startHour: start, count: gap });
        }
      } else {
        i++;
      }
    }
  }



  getCompressedTop(minutes: number): number {
    const hour = Math.floor(minutes / 60);
    const skipHeight = 60; // compressed block height
    let top = 0;

    // Calculate top position considering compressed blocks
    for (let h = 0; h < hour; h++) {
      const compressedBlock = this.compressedSlots.find(
        block => h >= block.startHour && h < block.startHour + block.count
      );

      if (compressedBlock && h === compressedBlock.startHour) {
        // Add compressed height for the entire block
        top += skipHeight;
        h += compressedBlock.count - 1; // Skip the rest of compressed hours
      } else if (!compressedBlock) {
        // Add normal hour height
        top += this.hourHeight;
      }
    }

    // Add the minutes offset for the current hour
    const minuteOffset = minutes % 60;
    top += (minuteOffset / 60) * this.hourHeight;

    return top;
  }



  isCompressedSlot(hour: number): boolean {
    return this.compressedSlots.some(
      block => hour >= block.startHour && hour < block.startHour + block.count
    );
  }

  getCompressedHeight(hour: number): number {
    const block = this.compressedSlots.find(s => hour === s.startHour);
    if (!block) return 0;
    return 60; // compressed visual height
  }

  /**
   * Handle long-press on an event
   */
  onEventLongPress(event: TimelineEvent): void {
    this.eventLongPressed.emit(event);
  }
}
