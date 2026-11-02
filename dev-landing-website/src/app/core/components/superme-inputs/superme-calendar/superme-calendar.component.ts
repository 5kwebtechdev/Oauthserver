import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

interface DayMood {
  date: string;     // yyyy-mm-dd
  moodName: string; // Happy, Sad, etc.
}

interface DayActivities {
  habit?: boolean;
  task?: boolean;
  timetable?: boolean;
}

@Component({
  selector: 'superme-calendar',
  templateUrl: './superme-calendar.component.html',
  styleUrls: ['./superme-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe]
})
export class SupermeCalendarComponent implements OnInit {

  /* ---------------- INPUTS ---------------- */
  @Input() showMoodToggle = true;
  @Input() useArrowNavigation = true;
  @Input() useCalendarMainStyle = true;
  @Input() allowDateSelection = true;
  @Input() dateActivities: { [key: string]: { timetable?: boolean; task?: boolean; habit?: boolean } } = {};
  @Input() startDate: Date | null = null;

  @Output() dateSelected = new EventEmitter<Date>();
  @Output() moodToggled = new EventEmitter<boolean>();
  @Output() monthChanged = new EventEmitter<Date>();
  @Input() statusData: any = null;
  @Input() currentMonth = new Date();
  @Input() moodTransitions: any[] = [];

  /* ---------------- STATE ---------------- */
  moodOn = false;

  ngOnInit() {
    if (this.startDate) {
      this.startDate = this.startDate;
    }
  }

  /* ---------------- CALENDAR ---------------- */

  getVisibleMonthDays(): Date[] {
    const start = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const end = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    const days: Date[] = [];

    for (let i = start.getDay(); i > 0; i--) {
      days.push(new Date(start.getFullYear(), start.getMonth(), 1 - i));
    }

    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(start.getFullYear(), start.getMonth(), i));
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    return days;
  }

  previousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.monthChanged.emit(this.currentMonth);
  }

  nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.monthChanged.emit(this.currentMonth);
  }

  handleDateClick(date: Date) {
    if (!this.allowDateSelection || !this.isDateinCurrentMonth(date)) return;
    this.startDate = date;
    this.dateSelected.emit(date);
  }

  isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.toDateString() === b.toDateString();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  isDateinCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth();
  }

  /* ---------------- MOOD ---------------- */

  hasMoodData(date: Date): boolean {
    const key = this.formatDateKey(date);
    return this.moodTransitions.some(m => m.date === key);
  }

  getMoodEmoji(date: Date): string {
    const key = this.formatDateKey(date);
    const transition = this.moodTransitions.find(m => m.date === key);
    const moodName = transition?.toMood || transition?.fromMood || transition?.moodName || 'Happy';
    return this.getMoodEmojiPath(moodName);
  }

  /**
   * Get mood emoji path based on mood name — normalizes case/spacing/underscores like the app
   */
  private getMoodEmojiPath(moodName: string): string {
    const moodMap: { [key: string]: string } = {
      'Happy': 'assets/Images-Transparent/Image-Mood-Happy.png',
      'Very Happy': 'assets/Images-Transparent/Image-Mood-Very happy.png',
      'Excited': 'assets/Images-Transparent/Image-Mood-Excited.png',
      'Sad': 'assets/Images-Transparent/Image-Mood-Sad.png',
      'Upset': 'assets/Images-Transparent/Image-Mood-Upset.png',
      'Nervous': 'assets/Images-Transparent/Image-Mood-Nervous.png',
    };

    const DEFAULT = moodMap['Happy'];
    if (!moodName) return DEFAULT;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/[_\-\s]+/g, ' ').replace(/\s+/g, ' ');
    const canonicalByNormalized: { [key: string]: string } = {
      'happy': 'Happy',
      'very happy': 'Very Happy',
      'excited': 'Excited',
      'sad': 'Sad',
      'upset': 'Upset',
      'nervous': 'Nervous',
    };

    const norm = normalize(String(moodName));
    const canonical = canonicalByNormalized[norm];
    return (canonical && moodMap[canonical]) ? moodMap[canonical] : DEFAULT;
  }

  onMoodChange(val: boolean) {
    this.moodOn = val;
    this.moodToggled.emit(val);
  }

  /* ---------------- ACTIVITIES ---------------- */

  hasActivities(date: Date): boolean {
    return !!this.dateActivities[this.formatDateKey(date)];
  }

  getActivitiesForDate(date: Date): DayActivities {
    return this.dateActivities[this.formatDateKey(date)] || {};
  }

  /* ---------------- UTILS ---------------- */

  trackByDate = (index: number, date: Date): string => date.toISOString();

  private formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
