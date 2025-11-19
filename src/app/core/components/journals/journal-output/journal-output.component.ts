import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';
export interface JournalOutputEntry {
  id?: string | number;
  date?: string | Date;
  text?: string;
  mood?: string;
  emoji?: string;
  tags?: string[];
  images?: string[];
}

@Component({
  selector: 'app-journal-output',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, MindfulButtonComponent],
  templateUrl: './journal-output.component.html',
  styleUrls: ['./journal-output.component.scss']
})
export class JournalOutputComponent implements OnInit {
  @Input() entries: JournalOutputEntry[] = [];

  constructor(private router: Router, private http: HttpClient, private authApi: AuthApi) { }

  // Month navigator state
  public currentMonthDate: Date = new Date();
  public monthLabel: string = '';

  ngOnInit(): void {
    // If no entries were provided as an @Input(), try to read from navigation state
    const navState = (history && (history as any).state) ? (history as any).state : null;
    if ((!this.entries || this.entries.length === 0) && navState && navState.entries) {
      this.entries = navState.entries as JournalOutputEntry[];
    }

    // Normalize dates to Date objects for easier formatting
    this.entries = (this.entries || []).map(e => ({ ...e, date: e.date ? new Date(e.date) : undefined }));

    // If entries still empty, fetch from backend API
    if (!this.entries || this.entries.length === 0) {
      this.loadEntriesFromApi();
    }

    // initialize month label (will show current month/year)
    this.updateMonthLabel();
  }

  private updateMonthLabel(): void {
    const d = this.currentMonthDate || new Date();
    // Format like: April, 2025
    this.monthLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  public prevMonth(): void {
    const d = new Date(this.currentMonthDate);
    d.setMonth(d.getMonth() - 1);
    this.currentMonthDate = d;
    this.updateMonthLabel();
  }

  public nextMonth(): void {
    const d = new Date(this.currentMonthDate);
    d.setMonth(d.getMonth() + 1);
    this.currentMonthDate = d;
    this.updateMonthLabel();
  }

  /** Return entries that fall within the currently selected month/year */
  get filteredEntries(): JournalOutputEntry[] {
    if (!this.entries || !this.entries.length) return [];
    const month = (this.currentMonthDate || new Date()).getMonth();
    const year = (this.currentMonthDate || new Date()).getFullYear();
    return this.entries.filter(e => {
      if (!e || !e.date) return false;
      const d = e.date instanceof Date ? e.date : new Date(e.date as any);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  private loadEntriesFromApi(): void {
    const url = `${environment.apiUrl}/journal/entries`;
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    this.http.get<any[]>(url, { headers }).subscribe({
      next: (res) => {
        if (!Array.isArray(res)) {
          console.warn('Unexpected journal entries response, expected array', res);
          return;
        }
        // Map backend shape to JournalOutputEntry
        this.entries = res.map(item => {
          // backend returns creationDate and creationTime (e.g. "2025-09-28" and "19:03:45.244")
          let dateVal: Date | undefined = undefined;
          try {
            if (item.creationDate && item.creationTime) {
              dateVal = new Date(`${item.creationDate}T${item.creationTime}`);
            } else if (item.creationDate) {
              dateVal = new Date(item.creationDate);
            } else if (item.date) {
              dateVal = new Date(item.date);
            }
          } catch (e) {
            dateVal = undefined;
          }

          const tags: string[] = [];
          // hobbies may be a comma-separated string in the API
          if (item.hobbies && typeof item.hobbies === 'string') {
            item.hobbies.split(',').forEach((t: string) => { const s = t.trim(); if (s) tags.push(s); });
          }
          // also include other short fields as tags if present
          ['sleep', 'health', 'food', 'social', 'school', 'emotions'].forEach((k: string) => {
            if (item[k]) {
              const val = String(item[k]).trim();
              if (val && tags.indexOf(val) === -1) tags.push(val);
            }
          });

          const images: string[] = [];
          if (item.attachmentUrl) images.push(item.attachmentUrl);

          return {
            id: item.id,
            date: dateVal,
            text: item.notes || item.text || '',
            mood: item.emotions || item.mood || '',
            emoji: undefined,
            tags,
            images
          } as JournalOutputEntry;
        });
      },
      error: (err) => {
        console.error('Failed to load journal entries', err);
      }
    });
  }

  trackById(index: number, item: JournalOutputEntry) {
    return item?.id ?? index;
  }

  formatHeaderDate(date?: string | Date): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today, ${d.toLocaleString('en-US', { month: 'long', day: 'numeric' })}`;
    return d.toLocaleString('en-US', { weekday: undefined, month: 'long', day: 'numeric' });
  }

  formatTime(date?: string | Date): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  joinTags(tags?: string[]): string[] {
    return tags || [];
  }

  getEmoji(entry: JournalOutputEntry): string {
    if (entry.emoji) return entry.emoji;
    // simple mapping fallback for moods
    const map: { [k: string]: string } = {
      happy: '😊',
      excited: '🤩',
      sad: '😔',
      calm: '😌',
      grateful: '🙏'
    };
    return map[(entry.mood || '').toLowerCase()] || '📝';
  }

  /**
   * Navigate to the journal input page when the floating + button is clicked.
   */
  openJournalInput(): void {
    this.router.navigate(['/authed/journal-input']).catch(() => { /* ignore navigation errors */ });
  }

  /**
   * Navigate back when the back arrow is clicked
   */
  goBack(): void {
    this.router.navigate(['/authed/user-dashboard']).catch(() => { /* ignore navigation errors */ });
  }

}

