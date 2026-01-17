import { Component, Input, OnInit } from '@angular/core';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../mindful-navigator/view-all/view-all.component';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: Date;
  // optional time portion (e.g. '14:30' or ISO time)
  time?: string;
  mood: string;
  tags: string[];
  // optional image attachments (urls)
  images?: string[];
  isPrivate: boolean;
}

@Component({
  selector: 'journals',
  templateUrl: './journals.component.html',
  styleUrls: ['./journals.component.scss'],
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, ViewAllComponent, MindfulButtonComponent],
  standalone: true
})
export class JournalsComponent {
  @Input() entries: JournalEntry[] = [];
  @Input() showCreateButton: boolean = true;
  @Input() maxDisplayEntries: number = 3;

  // show a loading flag while fetching
  public loading: boolean = false;

  constructor(private router: Router, private http: HttpClient, private authApi: AuthApi) {
  }

  ngOnInit(): void {
    // If entries were not passed in, fetch from backend
    if (!this.entries || this.entries.length === 0) {
      this.loadEntriesFromApi();
    } else {
      // normalize any date strings into Date objects
      this.entries = (this.entries || []).map(e => ({ ...e, date: e.date ? new Date(e.date as any) : e.date }));
    }
  }

  getDisplayEntries(): JournalEntry[] {
    return this.entries.slice(0, this.maxDisplayEntries);
  }

  get latestEntry(): JournalEntry | null {
    if (!this.entries || this.entries.length === 0) return null;
    // Compare by date value (support Date or string)
    return this.entries.reduce((latest, current) => {
      const latestTime = new Date(latest.date).getTime();
      const currentTime = new Date(current.date).getTime();
      return currentTime > latestTime ? current : latest;
    });
  }

  private loadEntriesFromApi(): void {
    const url = `${environment.apiUrl}/journal/entries`;
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    this.loading = true;
    this.http.get<any[]>(url, { headers }).subscribe({
      next: (res) => {
        this.loading = false;
        if (!Array.isArray(res)) {
          console.warn('Unexpected journal entries response, expected array', res);
          return;
        }

        this.entries = res.map(item => {
          let dateVal: Date = new Date();
          try {
            if (item.creationDate && item.creationTime) {
              dateVal = new Date(`${item.creationDate}T${item.creationTime}`);
            } else if (item.creationDate) {
              dateVal = new Date(item.creationDate);
            } else if (item.date) {
              dateVal = new Date(item.date);
            }
          } catch (e) {
            dateVal = new Date();
          }

          const tags: string[] = [];
          if (item.hobbies && typeof item.hobbies === 'string') {
            item.hobbies.split(',').forEach((t: string) => { const s = t.trim(); if (s) tags.push(s); });
          }
          ['sleep', 'health', 'food', 'social', 'school', 'emotions'].forEach((k: string) => {
            if (item[k]) {
              const val = String(item[k]).trim(); if (val && tags.indexOf(val) === -1) tags.push(val);
            }
          });

          const images: string[] = [];
          if (item.attachmentUrl) images.push(item.attachmentUrl);

          return {
            id: item.id?.toString?.() ?? '',
            title: item.notes ? (String(item.notes).split('\n')[0].slice(0, 80)) : (item.title || 'Journal entry'),
            content: item.notes || '',
            date: dateVal,
            time: item.creationTime || undefined,
            mood: item.emotions || item.mood || '',
            tags,
            images,
            isPrivate: !!item.isPrivate
          } as JournalEntry;
        });
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load journal entries', err);
        // fallback to sample entries so UI still shows something
        // this.entries = this.sampleEntries;
      }
    });
  }

  getMoodEmoji(mood: string): string {
    const moodEmojis: { [key: string]: string } = {
      grateful: '🙏',
      reflective: '🤔',
      energetic: '⚡',
      calm: '😌',
      happy: '😊',
      sad: '😔',
      excited: '🎉',
      peaceful: '☮️'
    };
    return moodEmojis[mood] || '📝';
  }

  /** Return emotion image mapping (if available) for a mood label */
  getEmotion(entry: JournalEntry): { label: string; image: string } | null {
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

  getMoodLabel(mood: string): string {
    if (!mood) return '';
    // If mood already looks like an emoji, return empty — prefer text labels.
    return this.capitalize(String(mood));
  }

  formatTime(time?: string | Date): string {
    if (!time) return '';
    // If it's a Date object, format using locale options
    if (time instanceof Date) {
      try {
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
      } catch {
        return '';
      }
    }

    // If it's a string, try to parse possible formats like ISO time with fractional seconds
    if (typeof time === 'string') {
      const t = time.trim();
      if (!t) return '';
      // If it's like '22:40:14.714' or '22:40:14', extract hours and minutes
      const hhmmMatch = t.match(/(\d{1,2}):(\d{2})/);
      if (hhmmMatch) {
        const hh = parseInt(hhmmMatch[1], 10);
        const mm = parseInt(hhmmMatch[2], 10);
        const date = new Date();
        date.setHours(hh, mm, 0, 0);
        try {
          // toLocaleTimeString will produce e.g. '9:00 PM' — replace ':' with '.' for minute separator
          return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(':', '.');
        } catch {
          // fallback: format manually
          const period = hh >= 12 ? 'PM' : 'AM';
          const hour12 = ((hh + 11) % 12) + 1;
          return `${hour12}.${mm.toString().padStart(2, '0')} ${period}`;
        }
      }

      // As a last resort, return the raw string
      return t;
    }

    return '';
  }

  private capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  getEmoji(entry: JournalEntry): string {
    // Use mood emoji as the entry emoji for now
    return this.getMoodEmoji(entry.mood);
  }

  joinTags(tags: string[] | string | undefined): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    // if it's a comma-separated string, split and trim
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  onCreateNewEntry(): void {
    this.router.navigate(['/authed/journal-input']).catch(() => { });
  }

  onViewAllEntries(): void {
    // Intentionally left empty; template handles navigation via routerLink.
  }

  onEntryClick(entry: JournalEntry): void {
    // Handle entry click
    console.log('Clicked on entry:', entry.title);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}