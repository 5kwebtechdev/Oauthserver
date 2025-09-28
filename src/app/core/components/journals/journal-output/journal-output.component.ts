import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
export interface JournalOutputEntry {
  id?: string | number;
  date?: string | Date;
  text?: string;
  mood?: string;
  emoji?: string; // optional emoji string
  tags?: string[];
  images?: string[]; // optional image URLs
}

@Component({
  selector: 'app-journal-output',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './journal-output.component.html',
  styleUrls: ['./journal-output.component.scss']
})
export class JournalOutputComponent implements OnInit {
  /**
   * Accept an array of journal entries to display.
   */
  @Input() entries: JournalOutputEntry[] = [];

  constructor(private router: Router) { }

  ngOnInit(): void {
    // If no entries were provided as an @Input(), try to read from navigation state
    const navState = (history && (history as any).state) ? (history as any).state : null;
    if ((!this.entries || this.entries.length === 0) && navState && navState.entries) {
      this.entries = navState.entries as JournalOutputEntry[];
    }

    // Normalize dates to Date objects for easier formatting
    this.entries = (this.entries || []).map(e => ({ ...e, date: e.date ? new Date(e.date) : undefined }));

    // If still empty, populate with friendly sample entries so the page renders nicely
    if (!this.entries || this.entries.length === 0) {
      this.entries = [
        {
          id: 's1',
          date: new Date(),
          text: 'Today was a rollercoaster... but I smiled through it!',
          mood: 'Happy',
          emoji: '😊',
          tags: ['Excited', 'Good', 'Party', 'Study'],
          images: ['/assets/images/A image of a child enjoying with friends at the amusement park.png']
        },
        {
          id: 's2',
          date: new Date(new Date().setDate(new Date().getDate() - 1)),
          text: 'Had a calm evening with some reflection and journaling.',
          mood: 'Calm',
          emoji: '😌',
          tags: ['Peaceful', 'Reading'],
          images: ['/assets/images/A image of a child enjoying with friends at the amusement park.png']
        }
      ];
    }
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

}

