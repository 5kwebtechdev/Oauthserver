import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import { TimelineEvent } from '../../models/calendar.model';

interface EventPosition extends TimelineEvent {
  _top?: number;
  _height?: number;
  _column?: number;
  _columnCount?: number;
}

interface CompressedBlock {
  startHour: number;
  endHour: number;
  count: number;
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
  selectedEventId: number | null = null;

  timeSlots: string[] = [];
  compressedSlots: CompressedBlock[] = [];
  hourHeight = 90; // increased hour visual height so 1-hour slots are larger
  compressedVisualHeight = 60; // Height of compressed gap indicator
  minCardHeight = 64; // Minimum card height to ensure title and time are always visible
  cardGap = 6; // Gap between overlapping cards
  totalGridHeight = 0;

  ngOnInit(): void {
    this.initializeTimeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['events']) {
      this.initializeTimeline();
    }
  }

  initializeTimeline(): void {
    this.generateTimeSlots();
    this.compressEmptyBlocks();
    this.calculateTotalGridHeight();
    this.assignEventPositions();
  }

  generateTimeSlots(): string[] {
    this.timeSlots = Array.from({ length: 24 }, (_, i) =>
      `${i.toString().padStart(2, '0')}:00`
    );
    return this.timeSlots;
  }

  formatTimeLabel(time: string): string {
    // Format as "10.00" instead of "10:00" per Figma
    return time.replace(':', '.');
  }

  parseTime(time: string): number {
    const [h, m] = time.split(/[:.]/g).map(Number);
    return h * 60 + (m || 0);
  }

  /**
   * Compress empty hour blocks - skip gaps of 3+ hours with no events
   */
  compressEmptyBlocks(): void {
    if (!this.events || this.events.length === 0) {
      this.compressedSlots = [];
      return;
    }

    // Find which hours have events (with 1 hour buffer before/after)
    const occupied = new Set<number>();
    this.events.forEach(e => {
      const startHour = Math.floor(this.parseTime(e.startTime) / 60);
      const endHour = Math.ceil(this.parseTime(e.endTime) / 60);

      // Add buffer hours before and after
      for (let h = Math.max(0, startHour - 1); h <= Math.min(23, endHour + 1); h++) {
        occupied.add(h);
      }
    });

    this.compressedSlots = [];
    let i = 0;

    while (i < 24) {
      if (!occupied.has(i)) {
        const start = i;
        while (i < 24 && !occupied.has(i)) i++;
        const count = i - start;
        // Compress gaps of 3+ hours
        if (count >= 3) {
          this.compressedSlots.push({
            startHour: start,
            endHour: i - 1,
            count: count
          });
        }
      } else {
        i++;
      }
    }
  }

  calculateTotalGridHeight(): void {
    let height = 0;
    for (let h = 0; h < 24; h++) {
      if (this.isCompressedSlot(h)) {
        if (this.isCompressedStart(h)) {
          height += this.compressedVisualHeight;
        }
        // Skip other hours in compressed block
      } else {
        height += this.hourHeight;
      }
    }
    this.totalGridHeight = height;
  }

  /**
   * Check if an hour is part of a compressed block
   */
  isCompressedSlot(hour: number): boolean {
    return this.compressedSlots.some(
      block => hour >= block.startHour && hour <= block.endHour
    );
  }

  /**
   * Returns true if the compressed block starting at `hour` should render
   * a visible dotted indicator. We hide indicators for blocks that touch
   * the day's start or end (so no dotted line appears at the very top/bottom).
   */
  isCompressedVisibleStart(hour: number): boolean {
    const block = this.compressedSlots.find(b => b.startHour === hour);
    if (!block) return false;
    // Hide indicator if block reaches top or bottom of day
    if (block.startHour === 0 || block.endHour === 23) return false;
    return true;
  }

  /**
   * Check if this hour is the START of a compressed block
   */
  isCompressedStart(hour: number): boolean {
    return this.compressedSlots.some(block => block.startHour === hour);
  }

  /**
   * Get the visual Y position accounting for compressed blocks
   */
  getCompressedTop(minutes: number): number {
    const targetHour = Math.floor(minutes / 60);
    const minuteOffset = minutes % 60;

    let top = 0;
    for (let h = 0; h < targetHour; h++) {
      const block = this.compressedSlots.find(b => h >= b.startHour && h <= b.endHour);
      if (block) {
        // If we're at the start of the block, add the full compressedVisualHeight once
        if (h === block.startHour) {
          top += this.compressedVisualHeight;
        }
        // skip the rest of the block
        h = block.endHour;
      } else {
        top += this.hourHeight;
      }
    }

    // Now add minute offset for the target hour
    const targetBlock = this.compressedSlots.find(b => targetHour >= b.startHour && targetHour <= b.endHour);
    if (targetBlock) {
      const perHour = this.compressedVisualHeight / targetBlock.count;
      const hourIndex = targetHour - targetBlock.startHour; // 0-based index inside compressed block
      // Add offset for whole hours within the compressed block before the target hour
      top += hourIndex * perHour;
      // Add minute offset within the target hour
      top += (minuteOffset / 60) * perHour;
    } else {
      top += (minuteOffset / 60) * this.hourHeight;
    }

    return top;
  }

  /**
   * Assign column positions for overlapping events and calculate top/height
   */
  assignEventPositions(): void {
    if (!this.events || this.events.length === 0) return;

    // Sort events by start time, then by duration (longer first)
    const sortedEvents = [...this.events].sort((a, b) => {
      const startDiff = this.parseTime(a.startTime) - this.parseTime(b.startTime);
      if (startDiff !== 0) return startDiff;
      // If same start, longer duration first
      const durationA = this.parseTime(a.endTime) - this.parseTime(a.startTime);
      const durationB = this.parseTime(b.endTime) - this.parseTime(b.startTime);
      return durationB - durationA;
    });

    // Group overlapping events
    const groups: EventPosition[][] = [];
    let currentGroup: EventPosition[] = [];
    let groupEnd = 0;

    for (const event of sortedEvents) {
      const eventStart = this.parseTime(event.startTime);
      const eventEnd = this.parseTime(event.endTime);

      if (currentGroup.length === 0 || eventStart < groupEnd) {
        // Overlaps with current group
        currentGroup.push(event);
        groupEnd = Math.max(groupEnd, eventEnd);
      } else {
        // Start new group
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [event];
        groupEnd = eventEnd;
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    // Assign columns within each group
    for (const group of groups) {
      this.assignColumnsToGroup(group);
    }

    // Calculate top and height for each event
    for (const event of this.events) {
      event._top = this.getCompressedTop(this.parseTime(event.startTime));
      const duration = this.parseTime(event.endTime) - this.parseTime(event.startTime);
      const calculatedHeight = (duration / 60) * this.hourHeight;
      // Ensure minimum height for visibility
      event._height = Math.max(calculatedHeight, this.minCardHeight);
    }
  }

  /**
   * Assign column indices to a group of overlapping events
   */
  assignColumnsToGroup(events: EventPosition[]): void {
    const columns: EventPosition[][] = [];

    for (const event of events) {
      let placed = false;

      for (let col = 0; col < columns.length; col++) {
        const lastInColumn = columns[col][columns[col].length - 1];
        const lastEnd = this.parseTime(lastInColumn.endTime);
        const eventStart = this.parseTime(event.startTime);

        if (eventStart >= lastEnd) {
          // Can place in this column
          columns[col].push(event);
          event._column = col;
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Need new column
        event._column = columns.length;
        columns.push([event]);
      }
    }

    // Set total column count for all events in group
    const totalColumns = columns.length;
    for (const col of columns) {
      for (const evt of col) {
        evt._columnCount = totalColumns;
      }
    }
  }

  /**
   * Calculate left position for event card
   */
  getEventLeft(event: EventPosition): string {
    const column = event._column || 0;
    const totalColumns = event._columnCount || 1;
    const columnWidth = 100 / totalColumns;
    const leftPercent = column * columnWidth;
    return `calc(${leftPercent}% + ${this.cardGap}px)`;
  }

  /**
   * Calculate width for event card
   */
  getEventWidth(event: EventPosition): string {
    const totalColumns = event._columnCount || 1;
    const columnWidth = 100 / totalColumns;
    // Subtract gap on both sides
    return `calc(${columnWidth}% - ${this.cardGap * 2}px)`;
  }

  /**
   * Handle long-press on an event
   */
  onEventLongPress(event: TimelineEvent): void {
    this.eventLongPressed.emit(event);
  }

  /** Mark event as selected (bring to front) */
  onEventClick(event: TimelineEvent): void {
    this.selectedEventId = event?.id ?? null;
  }

  /**
   * Compute per-hour visual heights taking compressed blocks into account,
   * and expand any hour that needs more vertical space to display all cards
   * starting within that hour.
   */
  applyHourStretchingAndPositioning(): void {
    // Build initial per-hour visual heights array
    const hourVisualHeights: number[] = new Array(24).fill(this.hourHeight);

    // For compressed blocks, distribute compressedVisualHeight across their hours
    for (const block of this.compressedSlots) {
      const per = this.compressedVisualHeight / block.count;
      for (let h = block.startHour; h <= block.endHour; h++) {
        hourVisualHeights[h] = per;
      }
    }

    // Iteratively adjust: compute event tops with current hour heights, then stretch hours as needed
    for (let iter = 0; iter < 2; iter++) {
      // compute hourTop cumulative
      const hourTop: number[] = new Array(24).fill(0);
      let acc = 0;
      for (let h = 0; h < 24; h++) {
        hourTop[h] = acc;
        acc += hourVisualHeights[h];
      }

      // compute required heights per hour
      const required: number[] = new Array(24).fill(0);
      for (const event of this.events) {
        const startMinutes = this.parseTime(event.startTime);
        const startHour = Math.floor(startMinutes / 60);
        const minuteOffset = startMinutes % 60;

        // offset within the hour based on that hour's visual height
        const offsetWithinHour = (minuteOffset / 60) * hourVisualHeights[startHour];
        const evtHeight = event._height ?? this.minCardHeight;
        const bottomWithinHour = offsetWithinHour + evtHeight;
        required[startHour] = Math.max(required[startHour], bottomWithinHour + 6); // add small padding
      }

      // Apply any stretching needed
      let changed = false;
      for (let h = 0; h < 24; h++) {
        if (!this.isCompressedSlot(h) && required[h] > hourVisualHeights[h]) {
          hourVisualHeights[h] = required[h];
          changed = true;
        }
      }

      if (!changed) break; // converged
    }

    // Final hourTop and assign event._top
    let acc2 = 0;
    const finalHourTop: number[] = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      finalHourTop[h] = acc2;
      acc2 += hourVisualHeights[h];
    }

    for (const event of this.events) {
      const startMinutes = this.parseTime(event.startTime);
      const startHour = Math.floor(startMinutes / 60);
      const minuteOffset = startMinutes % 60;
      const hourHeightForStart = hourVisualHeights[startHour];
      const offsetWithinHour = (minuteOffset / 60) * hourHeightForStart;
      event._top = finalHourTop[startHour] + offsetWithinHour;
    }

    // update totalGridHeight to reflect stretched hours
    this.totalGridHeight = hourVisualHeights.reduce((s, v) => s + v, 0);
  }
}
