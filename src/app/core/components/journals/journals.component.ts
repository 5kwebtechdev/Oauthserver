import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthApi } from '../../api/auth.api';
import { RefreshService } from '../../services/refresh.service';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../mindful-navigator/view-all/view-all.component';

import { JournalPostCardComponent } from './journal-post-card/journal-post-card.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  text?: string;
  date: Date;
  time?: string;
  mood: string;
  tags: string[];
  images?: string[];
  isPrivate: boolean;
}

@Component({
  selector: 'journals',
  template: `
    <section class="journal-empty">
      <mindful-card-header [title]="'Your Journal, Your Journey'" [subtitleLeft]="'Track moods'" [subtitleMiddle]="'Save'"
        [subtitleRight]="'Feel Better'">
        <mindful-view-all mindful-header-actions [routerLink]="['/authed/journal-output']"
          class="journal-empty__view-all">
        </mindful-view-all>
      </mindful-card-header>

      <div *ngIf="latestEntry as entry; else emptyBody" class="entries-container">
        <journal-post-card [entry]="entry"></journal-post-card>
      </div>

      <ng-template #emptyBody>
        <empty-state
          [imageSrc]="'/assets/Images-Transparent/Image-Journal-Blank.png'"
          [imageAlt]="'Panda with kids illustration'"
          [leadText]="'We are waiting to hear about your day!'"
          [subText]="'Post your journal to keep your story alive'"
          [buttonType]="'magenta'"
          [buttonText]="'Post now'"
          [isLargeButton]="true"
          (buttonClicked)="onCreateNewEntry()">
        </empty-state>
      </ng-template>
    </section>
  `,
  styles: [`
    .journal-empty {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 0;
    }

    .entries-container {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
    }

    .entries {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
    }

    .post-card {
      height: auto;
      flex-shrink: 0;
      border-radius: 24px;
      background: #FFF;
      box-shadow: 0 0 2px 2px rgba(107, 101, 106, 0.10);
      padding: 16px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .post-date, .post-time {
      color: #6B656A;
      text-align: center;
      font-family: Nunito;
      font-size: 16px;
      font-weight: 700;
    }

    .post-time {
      font-size: 13px;
    }

    .post-body {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .emoji {
      width: 65.722px;
      height: 52px;
      aspect-ratio: 65.72/52.00;
    }

    .post-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .post-mood {
      color: #282527;
      font-family: Nunito;
      font-size: 20px;
      font-weight: 700;
    }

    .post-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 18px;
      align-items: center;
    }

    .tag {
      color: #282527;
      text-align: center;
      font-family: Nunito;
      font-size: 13px;
      font-weight: 600;
    }

    .tag::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #7fb6b4;
      border-radius: 50%;
      margin-left: 10px;
    }

    .post-tags .tag:last-child::after {
      content: none;
    }

    .post-text {
      color: #282527;
      font-family: Nunito;
      font-size: 16px;
      font-weight: 600;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .post-images img {
      width: 62.986px;
      height: 55.606px;
      object-fit: cover;
    }
  `],
  imports: [CommonModule, IonicModule, MindfulCardHeaderComponent, ViewAllComponent, JournalPostCardComponent, EmptyStateComponent],
  standalone: true
})
export class JournalsComponent implements OnInit, OnDestroy {
  @Input() entries: JournalEntry[] = [];
  @Input() showCreateButton: boolean = true;
  @Input() maxDisplayEntries: number = 3;

  public loading: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private http: HttpClient,
    private authApi: AuthApi,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private refreshService: RefreshService
  ) { }

  ngOnInit(): void {
    if (!this.entries || this.entries.length === 0) {
      this.loadEntriesFromApi();
    } else {
      this.entries = (this.entries || []).map(e => ({ ...e, date: e.date ? new Date(e.date as any) : e.date }));
    }

    this.refreshService.journalAdded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadEntriesFromApi());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  public loadEntriesFromApi(): void {
    const url = `${environment.apiUrl}/journal/entries`;
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }

    this.loading = true;
    this.http.get<any[]>(url, { headers }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
        this.loading = false;
        if (!Array.isArray(res)) {
          console.warn('Unexpected journal entries response, expected array', res);
          return;
        }

        if (res.length > 0) console.log('[Journal] raw API item[0]:', JSON.stringify(res[0]));
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
            item.hobbies.split(',').forEach((t: string) => {
              const s = t.trim();
              if (s) {
                const titled = `Hobbies: ${s}`;
                if (tags.indexOf(titled) === -1) tags.push(titled);
              }
            });
          }
          ['sleep', 'health', 'food', 'social', 'school', 'emotions'].forEach((k: string) => {
            if (item[k]) {
              const val = String(item[k]).trim();
              const titled = `${this.capitalize(k)}: ${val}`;
              if (val && tags.indexOf(titled) === -1) tags.push(titled);
            }
          });

          const images: string[] = [];
          const toAbsUrl = (u: any): string => {
            if (!u) return '';
            const raw = typeof u === 'string' ? u : (u.url || u.uri || u.src || u.fileUrl || '');
            if (!raw) return '';
            if (raw.startsWith('https://')) return raw;
            if (raw.startsWith('http://')) return raw.replace('http://', 'https://');
            return raw.startsWith('/') ? `https://api.supermeapp.com${raw}` : `https://api.supermeapp.com/${raw}`;
          };
          const urlArrayField = item.attachments ?? item.files ?? item.attachmentUrls ?? item.imageUrls ?? item.images ?? item.mediaUrls;
          if (urlArrayField && Array.isArray(urlArrayField)) {
            images.push(...urlArrayField.map(toAbsUrl).filter(Boolean));
          } else {
            const singleUrl = item.attachmentUrl ?? item.fileUrl ?? item.imageUrl ?? item.mediaUrl;
            const abs = toAbsUrl(singleUrl);
            if (abs) images.push(abs);
          }

          return {
            id: item.id?.toString?.() ?? '',
            title: item.notes ? (String(item.notes).split('\n')[0].slice(0, 80)) : (item.title || 'Journal entry'),
            content: item.notes || '',
            text: item.notes || '', // For post-card display
            date: dateVal,
            time: item.creationTime || undefined,
            mood: item.emotions || item.mood || '',
            tags,
            images,
            isPrivate: !!item.isPrivate
          } as JournalEntry;
        });
        this.cdr.detectChanges();
        }); // end ngZone.run
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
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
    // Navigation or analytics hook for entry click
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  trackById(index: number, entry: JournalEntry): string | number {
    return entry.id || index;
  }
}