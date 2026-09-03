import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
import { JournalPostCardComponent } from '../journal-post-card/journal-post-card.component';
import { CalendarService } from '../../../services/calendar.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface JournalOutputEntry {
  id?: string | number;
  date?: string | Date;
  text?: string;
  mood?: string;
  emoji?: string;
  tags?: string[];
  images?: string[];
  emotions?: string;
  sleep?: string;
  health?: string;
  hobbies?: string;
  social?: string;
  school?: string;
  growth?: string;
  carrying?: string;
  productivity?: string;
  day?: string;
  habitCountTotal?: number;
  habitCountCompleted?: number;
  taskCountTotal?: number;
  taskCountCompleted?: number;
}

type MoodTone = 'great' | 'okay' | 'low' | 'none';

interface MoodDay {
  key: string;
  tone: MoodTone;
  label: string;
}

@Component({
  selector: 'app-journal-output',
  standalone: true,
  imports: [CommonModule, IonicModule, JournalPostCardComponent],
  templateUrl: './journal-output.component.html',
  styleUrls: ['./journal-output.component.scss'],
})
export class JournalOutputComponent implements OnInit, ViewWillEnter {
  @Input() entries: JournalOutputEntry[] = [];

  currentMonthDate = new Date();
  monthLabel = '';
  loading = false;
  errorMessage = '';
  entryPendingDelete: JournalOutputEntry | null = null;
  deleting = false;

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly authApi: AuthApi,
    private readonly calendarService: CalendarService,
  ) {}

  ngOnInit(): void {
    const navEntries = history?.state?.entries as JournalOutputEntry[] | undefined;
    if ((!this.entries || this.entries.length === 0) && Array.isArray(navEntries)) {
      this.entries = this.normalizeEntries(navEntries);
    }
    this.updateMonthLabel();
  }

  ionViewWillEnter(): void {
    this.loadEntriesFromApi(
      this.currentMonthDate.getMonth() + 1,
      this.currentMonthDate.getFullYear(),
    );
  }

  get filteredEntries(): JournalOutputEntry[] {
    const month = this.currentMonthDate.getMonth();
    const year = this.currentMonthDate.getFullYear();
    return (this.entries || [])
      .filter((entry) => {
        const date = this.entryDate(entry);
        return !!date && date.getMonth() === month && date.getFullYear() === year;
      })
      .slice()
      .sort((a, b) => (this.entryDate(b)?.getTime() || 0) - (this.entryDate(a)?.getTime() || 0));
  }

  get moodDays(): MoodDay[] {
    const byDate = new Map<string, JournalOutputEntry>();
    for (const entry of this.entries || []) {
      const date = this.entryDate(entry);
      if (date) byDate.set(this.dateKey(date), entry);
    }

    const result: MoodDay[] = [];
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - offset);
      const entry = byDate.get(this.dateKey(date));
      result.push({
        key: this.dateKey(date),
        tone: entry ? this.moodTone(entry.mood) : 'none',
        label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${entry?.mood || 'No entry'}`,
      });
    }
    return result;
  }

  get currentStreak(): number {
    const dates = this.entryDateSet;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    if (!dates.has(this.dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    while (dates.has(this.dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  get bestStreak(): number {
    const dates = Array.from(this.entryDateSet).sort();
    let best = 0;
    let current = 0;
    let previous: Date | null = null;

    for (const key of dates) {
      const date = new Date(`${key}T12:00:00`);
      const difference = previous ? Math.round((date.getTime() - previous.getTime()) / 86400000) : 0;
      current = previous && difference === 1 ? current + 1 : 1;
      best = Math.max(best, current);
      previous = date;
    }
    return best;
  }

  get isAtLatestMonth(): boolean {
    const now = new Date();
    return this.currentMonthDate.getMonth() === now.getMonth()
      && this.currentMonthDate.getFullYear() === now.getFullYear();
  }

  get hasEntryForToday(): boolean {
    const today = this.dateKey(new Date());
    return (this.entries || []).some((entry) => {
      const date = this.entryDate(entry);
      return !!date && this.dateKey(date) === today;
    });
  }

  prevMonth(): void {
    const date = new Date(this.currentMonthDate);
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    this.selectMonth(date);
  }

  nextMonth(): void {
    if (this.isAtLatestMonth) return;
    const date = new Date(this.currentMonthDate);
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    this.selectMonth(date);
  }

  retry(): void {
    this.loadEntriesFromApi(
      this.currentMonthDate.getMonth() + 1,
      this.currentMonthDate.getFullYear(),
    );
  }

  trackById(index: number, item: JournalOutputEntry): string | number {
    return item.id ?? index;
  }

  trackMoodDay(_: number, item: MoodDay): string {
    return item.key;
  }

  onAddClick(): void {
    if (!this.hasEntryForToday) void this.router.navigate(['/authed/journal-input']);
  }

  onEditEntry(entry: JournalOutputEntry): void {
    if (entry.id == null) return;
    void this.router.navigate(['/authed/journal-input'], { state: { journalEntry: entry } });
  }

  confirmDelete(entry: JournalOutputEntry): void {
    if (entry.id != null) this.entryPendingDelete = entry;
  }

  cancelDelete(): void {
    if (!this.deleting) this.entryPendingDelete = null;
  }

  deleteEntry(): void {
    const entry = this.entryPendingDelete;
    if (!entry?.id || this.deleting) return;

    this.deleting = true;
    this.http.delete(`${environment.apiUrl}/journal/${encodeURIComponent(String(entry.id))}`, this.authOptions()).subscribe({
      next: () => {
        this.entries = this.entries.filter(item => String(item.id) !== String(entry.id));
        this.entryPendingDelete = null;
        this.deleting = false;
      },
      error: (error) => {
        console.error('Failed to delete journal entry', error);
        this.deleting = false;
        this.errorMessage = 'We could not delete this entry. Please try again.';
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/authed/user-dashboard']);
  }

  private get entryDateSet(): Set<string> {
    const dates = new Set<string>();
    for (const entry of this.entries || []) {
      const date = this.entryDate(entry);
      if (date) dates.add(this.dateKey(date));
    }
    return dates;
  }

  private selectMonth(date: Date): void {
    this.currentMonthDate = date;
    this.updateMonthLabel();
    this.loadEntriesFromApi(date.getMonth() + 1, date.getFullYear());
  }

  private updateMonthLabel(): void {
    const month = this.currentMonthDate.toLocaleString('en-US', { month: 'long' });
    this.monthLabel = `${month},${this.currentMonthDate.getFullYear()}`;
  }

  private loadEntriesFromApi(month: number, year: number): void {
    const url = `${environment.apiUrl}/journal/entries?type=MONTH&month=${month}&year=${year}`;
    const token = this.authApi.getToken();
    const { headers } = this.authOptions();

    this.loading = true;
    this.errorMessage = '';
    this.http.get<unknown>(url, { headers, observe: 'response' }).subscribe({
      next: (response) => {
        this.entries = Array.isArray(response.body) ? this.mapApiEntries(response.body) : [];
        this.loadPreviousDayActivityCounts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load journal entries', error);
        this.entries = [];
        this.errorMessage = 'We could not load your journal. Please try again.';
        this.loading = false;
      },
    });
  }

  private authOptions(): { headers: HttpHeaders } {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    return { headers };
  }

  private mapApiEntries(items: any[]): JournalOutputEntry[] {
    return items.map((item) => {
      const date = item.creationDate && item.creationTime
        ? new Date(`${item.creationDate}T${item.creationTime}`)
        : new Date(item.creationDate || item.date || '');
      const tags: string[] = [];

      ['sleep', 'health', 'hobbies', 'social', 'school', 'growth'].forEach((key) => {
        if (!item[key]) return;
        String(item[key]).split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
          tags.push(`${key.charAt(0).toUpperCase()}${key.slice(1)}: ${part}`);
        });
      });

      const imageSource = item.attachments ?? item.files ?? item.attachmentUrls
        ?? item.imageUrls ?? item.images ?? item.mediaUrls ?? item.attachmentUrl
        ?? item.fileUrl ?? item.imageUrl ?? item.mediaUrl;
      const rawImages = Array.isArray(imageSource) ? imageSource : imageSource ? [imageSource] : [];

      return {
        id: item.id,
        date: Number.isNaN(date.getTime()) ? undefined : date,
        text: item.notes || item.text || '',
        mood: item.emotions || item.mood || '',
        tags,
        images: rawImages.map((image) => this.absoluteImageUrl(image)).filter(Boolean),
        emotions: item.emotions,
        sleep: item.sleep,
        health: item.health,
        hobbies: item.hobbies,
        social: item.social,
        school: item.school,
        growth: item.growth,
        carrying: item.carrying,
        productivity: item.productivity,
        day: item.day,
      };
    });
  }

  private normalizeEntries(entries: JournalOutputEntry[]): JournalOutputEntry[] {
    return entries.map((entry) => ({
      ...entry,
      date: entry.date ? new Date(entry.date) : undefined,
      images: Array.isArray(entry.images) ? entry.images : [],
    }));
  }

  /** Historical cards show the completed/total habits and tasks for that day.
   * Today deliberately has no count because its result is not final yet. */
  private loadPreviousDayActivityCounts(): void {
    const todayKey = this.dateKey(new Date());
    const dates = Array.from(new Set((this.entries || [])
      .map(entry => this.entryDate(entry))
      .filter((date): date is Date => !!date)
      .map(date => this.dateKey(date))
      .filter(date => date < todayKey)));
    if (!dates.length) return;

    forkJoin(dates.map(date => this.calendarService.getUserCalendar(date, 'day').pipe(
      catchError(() => of(null)),
    ))).subscribe(results => {
      const counts = new Map<string, { habitTotal: number; habitCompleted: number; taskTotal: number; taskCompleted: number }>();
      results.forEach((response: any, index) => {
        if (!response) return;
        counts.set(dates[index], {
          habitTotal: Number(response.totalHabits ?? response.habits?.length ?? 0),
          habitCompleted: Number(response.totalHabitsCompleted ?? response.habits?.filter((item: any) => String(item?.status).toUpperCase() === 'COMPLETED').length ?? 0),
          taskTotal: Number(response.totalTasks ?? response.tasks?.length ?? 0),
          taskCompleted: Number(response.totalTasksCompleted ?? response.tasks?.filter((item: any) => String(item?.status).toUpperCase() === 'COMPLETED').length ?? 0),
        });
      });
      this.entries = this.entries.map(entry => {
        const date = this.entryDate(entry);
        const summary = date ? counts.get(this.dateKey(date)) : undefined;
        return summary ? {
          ...entry,
          habitCountTotal: summary.habitTotal,
          habitCountCompleted: summary.habitCompleted,
          taskCountTotal: summary.taskTotal,
          taskCountCompleted: summary.taskCompleted,
        } : entry;
      });
    });
  }

  private entryDate(entry: JournalOutputEntry): Date | null {
    if (!entry?.date) return null;
    const date = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private moodTone(mood?: string): MoodTone {
    const value = (mood || '').trim().toLowerCase();
    if (['happy', 'excited', 'calm', 'great', 'good', 'joyful'].includes(value)) return 'great';
    if (['sad', 'low', 'unwell', 'bad', 'upset'].includes(value)) return 'low';
    return 'okay';
  }

  private absoluteImageUrl(value: any): string {
    const raw = typeof value === 'string' ? value : value?.url || value?.uri || value?.src || value?.fileUrl || '';
    if (!raw) return '';
    if (raw.startsWith('https://')) return raw;
    if (raw.startsWith('http://')) return raw.replace('http://', 'https://');
    return raw.startsWith('/') ? `https://api.supermeapp.com${raw}` : `https://api.supermeapp.com/${raw}`;
  }
}
