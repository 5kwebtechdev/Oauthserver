import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface JournalEntry {
  id?: string | number;
  date?: string | Date;
  text?: string;
  mood?: string;
  emoji?: string;
  tags?: string[];
  images?: string[];
}

@Component({
  selector: 'journal-post-card',
  templateUrl: './journal-post-card.component.html',
  styleUrls: ['./journal-post-card.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class JournalPostCardComponent implements OnInit {
  @Input() entry!: JournalEntry;
  
  viewerOpen: boolean = false;
  viewerSrc: string = '';

  ngOnInit(): void {
    // Initialize if needed
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeImageViewer();
  }

  getFilteredTags(entry: JournalEntry): string[] {
    const tags = Array.isArray(entry?.tags) ? entry.tags.map(t => String(t).trim()).filter(Boolean) : [];
    const mood = (entry?.mood || '').trim().toLowerCase();

    const shouldRemoveForMood = (tag: string): boolean => {
      const lowered = tag.toLowerCase();
      if (mood && lowered === mood) return true;
      if (lowered.startsWith('emotions:') || lowered.startsWith('emotion:')) return true;
      const parts = tag.split(':').map(p => p.trim());
      if (parts.length >= 2 && mood && parts[1].toLowerCase() === mood) return true;
      return false;
    };

    // Keep original response order, only filter out mood/emotion tags
    const filtered = tags.filter(t => !shouldRemoveForMood(t));

    // Helpers to detect key parts like 'hobbies' and 'health check'
    const keyOf = (tag: string) => tag.split(':')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const isHobbiesKey = (tag: string) => {
      const k = keyOf(tag);
      return k === 'hobbies' || k === 'hobby' || k === 'hobbieslist';
    };
    const isHealthKey = (tag: string) => {
      const k = keyOf(tag);
      return k === 'healthcheck' || k === 'health' || k === 'healthchecklist';
    };

    // Ensure that any 'hobbies' tag appears after 'health check' tag(s)
    const hobbyIndex = filtered.findIndex((t) => isHobbiesKey(t) || t.toLowerCase().includes('hobbies'));
    const healthIndex = filtered.findIndex((t) => isHealthKey(t) || t.toLowerCase().includes('health'));

    if (hobbyIndex > -1 && healthIndex > -1 && hobbyIndex < healthIndex) {
      const [hobbyTag] = filtered.splice(hobbyIndex, 1);
      // find last health-like index (there might be multiple health-related tags)
      let lastHealth = -1;
      for (let i = 0; i < filtered.length; i++) {
        if (isHealthKey(filtered[i]) || filtered[i].toLowerCase().includes('health')) lastHealth = i;
      }
      filtered.splice(lastHealth + 1, 0, hobbyTag);
    }

    return filtered;
  }

  hasDetails(entry: JournalEntry): boolean {
    const hasTags = this.getFilteredTags(entry).length > 0;
    const hasText = !!(entry && entry.text && entry.text.toString().trim().length > 0);
    const hasImages = Array.isArray(entry?.images) && entry.images.length > 0;
    return hasTags || hasText || hasImages;
  }

  getEmotion(entry: JournalEntry): { label: string; image: string } | null {
    const mood = (entry.mood || '').toLowerCase();
    if (!mood) return null;

    const emotionMap: { [k: string]: { label: string; image: string } } = {
      happy: { label: 'Happy', image: 'assets/Images-Thumbnails/Image-Journal-Emotions1.jpg' },
      excited: { label: 'Excited', image: 'assets/Images-Thumbnails/Image-Journal-Emotions2.jpg' },
      angry: { label: 'Angry', image: 'assets/Images-Thumbnails/Image-Journal-Emotions3.jpg' },
      sad: { label: 'Sad', image: 'assets/Images-Thumbnails/Image-Journal-Emotions4.jpg' }
    };

    return emotionMap[mood] || null;
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

  openImageViewer(img: string): void {
    this.viewerSrc = img;
    this.viewerOpen = true;
  }

  closeImageViewer(): void {
    this.viewerOpen = false;
    this.viewerSrc = '';
  }
}
