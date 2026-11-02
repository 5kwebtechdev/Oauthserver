import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'journal-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-card.component.html',
  styleUrls: ['./journal-card.component.scss']
})
export class JournalCardComponent {
  @Input() journal: any;
  /**
   * Return an emotion image path for the journal mood.
   * Falls back to a default emotion thumbnail if mood is not recognized.
   */
  getEmoji(): string {
    const mood = (this.journal?.mood || '').toString().toLowerCase();

    const images: { [key: string]: string } = {
      happy:   'assets/Images-Thumbnails/Journal-emotions-happy-icon.jpg',
      excited: 'assets/Images-Thumbnails/Journal-emotions-excited-icon.jpg',
      angry:   'assets/Images-Thumbnails/Journal-emotions-angry-icon.jpg',
      sad:     'assets/Images-Thumbnails/Journal-emotions-sad-icon.jpg'
    };

    const aliasMap: { [key: string]: string } = {
      joy: 'happy', joy2: 'happy', '😊': 'happy', calm: 'happy', content: 'happy',
      amazed: 'excited', '🤩': 'excited', energetic: 'excited',
      anger: 'angry', '😠': 'angry', frustrated: 'angry', anxious: 'angry',
      unhappy: 'sad', '😢': 'sad', upset: 'sad', depressed: 'sad', lonely: 'sad'
    };

    if (!mood) return images['happy'];
    if (images[mood]) return images[mood];
    if (aliasMap[mood] && images[aliasMap[mood]]) return images[aliasMap[mood]];
    for (const k of Object.keys(images)) {
      if (mood.includes(k)) return images[k];
    }
    for (const a of Object.keys(aliasMap)) {
      if (mood.includes(a) && images[aliasMap[a]]) return images[aliasMap[a]];
    }
    return images['happy'];
  }

  /** Return filtered tags for display, excluding mood/emotion tags */
  getFilteredTags(): string[] {
    const tags = Array.isArray(this.journal?.tags) ? this.journal.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];
    const mood = (this.journal?.mood || '').trim().toLowerCase();
    if (!mood) return tags;
    return tags.filter((t: string) => String(t).toLowerCase() !== mood);
  }

  /** Check if the journal entry has details (tags, text, images) */
  hasDetails(): boolean {
    const hasTags = this.getFilteredTags().length > 0;
    const hasText = !!(this.journal && this.journal.note && this.journal.note.toString().trim().length > 0);
    const hasImages = Array.isArray(this.journal?.images) && this.journal.images.length > 0;
    return hasTags || hasText || hasImages;
  }

  /** Get emotion object with label and image */
  getEmotion(): { label: string; image: string } | null {
    const mood = (this.journal?.mood || '').toLowerCase();
    if (!mood) return null;

    const emotionMap: { [k: string]: { label: string; image: string } } = {
      happy: { label: 'Happy', image: 'assets/Images-Thumbnails/Image-Journal-Emotions1.jpg' },
      excited: { label: 'Excited', image: 'assets/Images-Thumbnails/Image-Journal-Emotions2.jpg' },
      angry: { label: 'Angry', image: 'assets/Images-Thumbnails/Image-Journal-Emotions3.jpg' },
      sad: { label: 'Sad', image: 'assets/Images-Thumbnails/Image-Journal-Emotions4.jpg' }
    };

    return emotionMap[mood] || null;
  }

  /** Format header date for display */
  formatHeaderDate(): string {
    if (!this.journal?.date) return '';
    const d = this.journal.date instanceof Date ? this.journal.date : new Date(this.journal.date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today, ${d.toLocaleString('en-US', { month: 'long', day: 'numeric' })}`;
    return d.toLocaleString('en-US', { weekday: undefined, month: 'long', day: 'numeric' });
  }

  /** Format time for display */
  formatTime(): string {
    if (!this.journal?.time && !this.journal?.date) return '';
    const time = this.journal.time || this.journal.date;
    if (!time) return '';
    const d = time instanceof Date ? time : new Date(`1970-01-01T${time}`);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  imageUrls: string[] = [];
  private _objectUrls: string[] = [];

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['journal']) {
      this.loadImages();
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrls();
  }

  private revokeObjectUrls() {
    this._objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch { } });
    this._objectUrls = [];
  }

  private loadImages() {
    this.revokeObjectUrls();
    this.imageUrls = [];
    const imgs: string[] = this.journal?.images || [];
    if (!imgs.length) return;

    const token = this.auth.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    imgs.forEach(url => {
      if (!url) return;
      // If already a data: or blob: URL, use it directly
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        this.imageUrls.push(url);
        return;
      }

      // If it's an absolute http(s) URL and we have a token, fetch it with auth headers
      const isHttp = /^https?:\/\//i.test(url);
      if (isHttp && token) {
        try {
          this.http.get(url, { headers: headers as any, responseType: 'blob' }).subscribe({
            next: (blob) => {
              const obj = URL.createObjectURL(blob);
              this._objectUrls.push(obj);
              this.imageUrls.push(obj);
            },
            error: () => {
              // fallback: push original url so <img> can try
              this.imageUrls.push(url);
            }
          });
        } catch (e) {
          this.imageUrls.push(url);
        }
        return;
      }

      // For non-http or http without token, try to fetch as blob (relative paths) or use direct URL
      try {
        this.http.get(url, { headers: headers as any, responseType: 'blob' }).subscribe({
          next: (blob) => {
            const obj = URL.createObjectURL(blob);
            this._objectUrls.push(obj);
            this.imageUrls.push(obj);
          },
          error: () => {
            this.imageUrls.push(url);
          }
        });
      } catch (e) {
        this.imageUrls.push(url);
      }
    });
  }

  onImgError(event: any) {
    try {
      event?.target && (event.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==');
    } catch { }
  }
}