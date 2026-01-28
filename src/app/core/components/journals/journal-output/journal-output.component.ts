import { Component, Input, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { JournalPostCardComponent } from '../journal-post-card/journal-post-card.component';
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
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, MindfulButtonComponent, JournalPostCardComponent],
  templateUrl: './journal-output.component.html',
  styleUrls: ['./journal-output.component.scss']
})
export class JournalOutputComponent implements OnInit {
  // Image viewer state
  public viewerOpen: boolean = false;
  public viewerSrc: string | null = null;
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

    // Normalize dates to Date objects for easier formatting and ensure `images` exists
    this.entries = (this.entries || []).map(e => {
      const normalizedDate = e.date ? new Date(e.date) : undefined;
      let images: string[] = [];
      const src = (e as any).attachmentUrls ?? (e as any).attachmentUrl ?? (e as any).images;
      if (Array.isArray(src)) images = (src as any[]).filter(Boolean);
      else if (typeof src === 'string' && src) images = [src];
      return { ...e, date: normalizedDate, images } as JournalOutputEntry;
    });

    // If entries still empty, fetch from backend API
    if (!this.entries || this.entries.length === 0) {
      this.loadEntriesFromApi();
    }

    // initialize month label (will show current month/year)
    this.updateMonthLabel();
  }

  /** Open the image viewer overlay for the selected image */
  openImageViewer(src: string): void {
    if (!src) return;
    this.viewerSrc = src;
    this.viewerOpen = true;
  }

  /** Close the image viewer overlay */
  closeImageViewer(): void {
    this.viewerOpen = false;
    this.viewerSrc = null;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.viewerOpen) this.closeImageViewer();
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

  /** Return true when the currently selected month is the same as the real current month/year */
  get isAtLatestMonth(): boolean {
    try {
      const now = new Date();
      const sel = this.currentMonthDate || new Date();
      return sel.getMonth() === now.getMonth() && sel.getFullYear() === now.getFullYear();
    } catch (e) {
      return false;
    }
  }

  /** Return entries that fall within the currently selected month/year */
  get filteredEntries(): JournalOutputEntry[] {
    if (!this.entries || !this.entries.length) return [];
    const month = (this.currentMonthDate || new Date()).getMonth();
    const year = (this.currentMonthDate || new Date()).getFullYear();
    const list = this.entries.filter(e => {
      if (!e || !e.date) return false;
      const d = e.date instanceof Date ? e.date : new Date(e.date as any);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    // Sort by date descending so most recent entries appear first
    return list.sort((a, b) => {
      const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date as any).getTime();
      const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date as any).getTime();
      return db - da;
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
            item.hobbies.split(',').forEach((t: string) => {
              const s = t.trim();
              if (s) {
                const titled = `Hobbies: ${s}`;
                if (tags.indexOf(titled) === -1) tags.push(titled);
              }
            });
          }
          // also include other short fields as tags if present
          ['sleep', 'health', 'food', 'social', 'school', 'emotions'].forEach((k: string) => {
            if (item[k]) {
              const val = String(item[k]).trim();
              const titled = `${k.charAt(0).toUpperCase() + k.slice(1)}: ${val}`;
              if (val && tags.indexOf(titled) === -1) tags.push(titled);
            }
          });

          const images: string[] = [];
          if (Array.isArray(item.attachmentUrls)) {
            item.attachmentUrls.forEach((u: string) => { if (u) images.push(u); });
          } else if (item.attachmentUrl) {
            images.push(item.attachmentUrl);
          }

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

  /** Return tags for display excluding the entry's mood/emotion (to avoid duplication) */
  getFilteredTags(entry: JournalOutputEntry): string[] {
    const tags = Array.isArray(entry?.tags) ? entry.tags.map(t => String(t).trim()).filter(Boolean) : [];
    const mood = (entry?.mood || '').trim().toLowerCase();
    if (!mood) return tags;
    return tags.filter(t => String(t).toLowerCase() !== mood);
  }


  getEmotion(entry: JournalOutputEntry): { label: string; image: string } | null {
    const mood = (entry.mood || '').toLowerCase();
    if (!mood) return null;

    const emotionMap: { [k: string]: { label: string; image: string } } = {
      happy: { label: 'Happy', image: '/assets/Images-Thumbnails/Image-Journal-Emotions1.jpg' },
      excited: { label: 'Excited', image: '/assets/Images-Thumbnails/Image-Journal-Emotions2.jpg' },
      angry: { label: 'Angry', image: '/assets/Images-Thumbnails/Image-Journal-Emotions3.jpg' },
      sad: { label: 'Sad', image: '/assets/Images-Thumbnails/Image-Journal-Emotions4.jpg' }
    };

    return emotionMap[mood] || null;
  }

  /**
   * Navigate to the journal input page when the floating + button is clicked.
   */
  openJournalInput(): void {
    // Prevent opening input if there's already a journal for today
    if (this.hasEntryForToday) return;
    this.router.navigate(['/authed/journal-input']).catch(() => { /* ignore navigation errors */ });
  }

  /**
   * Handler used by the fixed add button in the template.
   */
  onAddClick(): void {
    if (this.hasEntryForToday) return;
    this.openJournalInput();
  }

  /** Return true when there is already a journal entry for today's date */
  get hasEntryForToday(): boolean {
    try {
      if (!this.entries || !this.entries.length) return false;
      const todayStr = new Date().toDateString();
      return this.entries.some(e => {
        if (!e || !e.date) return false;
        const d = e.date instanceof Date ? e.date : new Date(e.date as any);
        return d.toDateString() === todayStr;
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Navigate back when the back arrow is clicked
   */
  goBack(): void {
    this.router.navigate(['/authed/user-dashboard']).catch(() => { /* ignore navigation errors */ });
  }

}

