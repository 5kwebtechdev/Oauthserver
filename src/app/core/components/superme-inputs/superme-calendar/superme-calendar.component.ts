import { MOOD_ASSETS, moodAsset } from '../../../models/mood-assets';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeToggleComponent } from '../../superme-selectors/superme-toggle/superme-toggle.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-calendar',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeToggleComponent],
  templateUrl: './superme-calendar.component.html',
  styleUrls: ['./superme-calendar.component.scss']
})
export class SupermeCalendarComponent implements OnChanges {
  @Input() type: 'date' | 'range' = 'date';
  @Input() currentMonth: Date = new Date();
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  @Input() showMoodToggle: boolean = true;
  @Input() useArrowNavigation: boolean = false; // New input to control navigation style
  @Input() dateActivities: { [key: string]: { timetable?: boolean, task?: boolean, habit?: boolean } } = {}; // Activity data for each date
  @Input() useCalendarMainStyle: boolean = false; // New input for activity-calendar specific styling
  @Input() useActivityDetailStyle: boolean = false;
  @Input() activityDetailTheme: 'habit' | 'task' = 'habit';
  @Input() moodData: { [key: string]: any } = {}; // Mood data keyed by date (YYYY-MM-DD)
  @Input() statusData: { [key: string]: 'COMPLETED' | 'SKIPPED' | 'PENDING' } = {}; // Status data for habit detail calendar
  @Input() allowDateSelection: boolean = true; // When false, clicking dates won't select them (read-only view)

  @Output() dateSelected = new EventEmitter<Date | { start: Date | null, end: Date | null }>();
  @Output() moodToggled = new EventEmitter<boolean>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() monthChanged = new EventEmitter<Date>(); // Emit when month navigation occurs

  selectingStart = true;
  showMonthPicker = false;
  moodOn = false; // Mood toggle OFF by default so activity dots show
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  years: number[] = [];

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) this.years.push(y);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dateActivities']) {
      console.log('dateActivities changed:', this.dateActivities);
      console.log('Number of dates with activities:', Object.keys(this.dateActivities).length);
    }
  }

  toggleMonthPicker() {
    this.showMonthPicker = !this.showMonthPicker;
  }

  pickMonth(monthIndex: number) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), monthIndex, 1);
    this.showMonthPicker = false;
  }

  pickYear(year: number) {
    this.currentMonth = new Date(year, this.currentMonth.getMonth(), 1);
    this.showMonthPicker = false;
  }

  toggleMood() {
    this.moodOn = !this.moodOn;
    this.moodToggled.emit(this.moodOn);
  }

  onMoodChange(checked: boolean) {
    this.moodOn = checked;
    this.moodToggled.emit(this.moodOn);
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.monthChanged.emit(this.currentMonth);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.monthChanged.emit(this.currentMonth);
  }

  selectDate(date: Date) {
    // legacy direct selection method remains, but callers should prefer handleDateClick
    this.handleDateClick(date);
  }

  /**
   * Centralized click handler for dates. Respects `allowDateSelection`.
   */
  handleDateClick(date: Date) {
    if (!this.allowDateSelection) return;

    date = new Date(date);
    if (this.type === 'date') {
      this.startDate = date;
      this.endDate = null;
      this.dateSelected.emit(this.startDate);
    } else {
      if (this.selectingStart) {
        this.startDate = date;
        if (this.endDate && this.endDate < date) this.endDate = null;
        this.selectingStart = false;
      } else {
        if (!this.startDate || date < this.startDate) {
          this.startDate = date;
          this.endDate = null;
        } else {
          this.endDate = date;
        }
        this.dateSelected.emit({ start: this.startDate, end: this.endDate });
      }
    }
  }

  confirmSelection() {
    this.confirmed.emit();
  }

  cancelSelection() {
    this.cancelled.emit();
  }

  getMonthDays(): Date[] {
    const days: Date[] = [];
    const firstDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const firstDayIndex = firstDayOfMonth.getDay();
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - firstDayIndex);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }

    return days;
  }

  /**
   * Return the month days but omit the final week if it contains NO dates
   * from the current month (prevents showing an unnecessary faded week).
   */
  getVisibleMonthDays(): Date[] {
    const days = this.getMonthDays();
    // Split into weeks of 7 days
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Remove trailing weeks that contain NO dates from the current month.
    while (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1];
      const anyInCurrent = lastWeek.some(d => this.isDateinCurrentMonth(d));
      if (anyInCurrent) break;
      weeks.pop();
    }

    // Flatten back to a single array without using `flat()` to keep TS target compatibility
    return weeks.reduce((acc: Date[], wk: Date[]) => acc.concat(wk), [] as Date[]);
  }

  isInRange(date: Date): boolean {
    if (this.startDate && this.endDate) {
      return date >= this.startDate && date <= this.endDate;
    }
    return false;
  }

  isSameDay(date1: Date, date2: any): boolean {
    return date1 && date2 && date1.toDateString() === date2.toDateString();
  }

  isDateinCurrentMonth(date: Date) {
    return date.getFullYear() === this.currentMonth.getFullYear() &&
      date.getMonth() === this.currentMonth.getMonth();
  }

  isStartOfRange(date: Date) {
    return this.startDate && this.isSameDay(date, this.startDate);
  }

  isEndOfRange(date: Date) {
    return this.endDate && this.isSameDay(date, this.endDate);
  }

  getDateKey(date: Date): string {
    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if the provided date is today
   */
  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  getActivitiesForDate(date: Date) {
    const key = this.getDateKey(date);
    const activities = this.dateActivities[key] || {};
    // Avoid logging here — this method is called many times by the template
    // and causes repeated console output during change detection.
    return activities;
  }

  hasActivities(date: Date): boolean {
    const activities = this.getActivitiesForDate(date);
    const has = !!(activities.timetable || activities.task || activities.habit);
    return has;
  }

  /**
   * Check if a date has mood data
   */
  hasMoodData(date: Date): boolean {
    const key = this.getDateKey(date);
    return !!this.moodData[key];
  }

  /**
   * Get mood emoji for a specific date
   */
  getMoodEmoji(date: Date): string {
    const key = this.getDateKey(date);
    const mood = this.moodData[key];
    if (!mood) return '';

    // Use toMood as the displayed mood (the final mood state)
    const moodName = mood.toMood || mood.fromMood || 'Neutral';
    return this.getMoodEmojiPath(moodName);
  }

  /**
   * Get mood emoji path based on mood name
   */
  private getMoodEmojiPath(moodName: string): string {
    return moodAsset(moodName) || MOOD_ASSETS.happy;
  }

  /**
   * Check if a date has status data (for habit detail calendar)
   */
  hasStatusData(date: Date): boolean {
    const key = this.getDateKey(date);
    return !!this.statusData[key];
  }

  /**
   * Get status for a specific date
   */
  getStatusForDate(date: Date): 'COMPLETED' | 'SKIPPED' | 'PENDING' | null {
    const key = this.getDateKey(date);
    return this.statusData[key] || null;
  }

  isFutureScheduledStatus(date: Date): boolean {
    if (this.getStatusForDate(date) !== 'PENDING') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() > today.getTime();
  }
}
