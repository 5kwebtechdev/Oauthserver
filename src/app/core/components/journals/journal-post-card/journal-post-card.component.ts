import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface JournalEntry {
  id?: string | number;
  date?: string | Date;
  text?: string;
  mood?: string;
  emoji?: string;
  tags?: string[];
  images?: string[];
  habitCountTotal?: number;
  habitCountCompleted?: number;
  taskCountTotal?: number;
  taskCountCompleted?: number;
}

@Component({
  selector: 'journal-post-card',
  templateUrl: './journal-post-card.component.html',
  styleUrls: ['./journal-post-card.component.scss'],
  imports: [CommonModule, IonicModule],
  standalone: true
})
export class JournalPostCardComponent implements OnInit {
  @Input() entry!: JournalEntry;
  @Output() edit = new EventEmitter<JournalEntry>();
  @Output() remove = new EventEmitter<JournalEntry>();
  
  viewerOpen: boolean = false;
  viewerSrc: string = '';
  actionsOpen = false;

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
      happy: { label: 'Happy', image: 'assets/figma/journal/mood-happy.webp' },
      excited: { label: 'Excited', image: 'assets/figma/journal/mood-excited.webp' },
      calm: { label: 'Calm', image: 'assets/figma/journal/mood-calm.webp' },
      sad: { label: 'Sad', image: 'assets/figma/journal/mood-sad.webp' },
      anxious: { label: 'Anxious', image: 'assets/figma/journal/mood-anxious.webp' },
      frustrated: { label: 'Frustrated', image: 'assets/figma/journal/mood-frustrated.webp' },
      frustated: { label: 'Frustated', image: 'assets/figma/journal/mood-frustrated.webp' },
      angry: { label: 'Angry', image: 'assets/figma/journal/mood-frustrated.webp' }
    };

    return emotionMap[mood] || null;
  }

  getMoodTone(mood?: string): 'great' | 'okay' | 'low' {
    const value = (mood || '').trim().toLowerCase();
    if (['happy', 'excited', 'calm', 'great', 'good', 'joyful'].includes(value)) return 'great';
    if (['sad', 'low', 'unwell', 'bad', 'upset'].includes(value)) return 'low';
    return 'okay';
  }

  getTagIcon(tag: string): string {
    const key = tag.split(':')[0].trim().toLowerCase().replace(/[^a-z]/g, '');
    const icons: Record<string, string> = {
      sleep: 'assets/figma/journal/bedtime.svg',
      health: 'assets/figma/journal/health.svg',
      healthcheck: 'assets/figma/journal/health.svg',
      hobbies: 'assets/figma/journal/interests.svg',
      hobby: 'assets/figma/journal/interests.svg',
      food: 'assets/figma/journal/note.svg',
      social: 'assets/figma/journal/group.svg',
      school: 'assets/figma/journal/school.svg',
      carrying: 'assets/figma/journal/note.svg',
      growth: 'assets/figma/journal/growth.svg',
      productivity: 'assets/figma/journal/note.svg',
      day: 'assets/figma/journal/note.svg',
    };
    return icons[key] || 'assets/figma/journal/note.svg';
  }

  getTagValue(tag: string): string {
    return tag.split(':').slice(1).join(':').trim() || tag;
  }

  isPastEntry(entry: JournalEntry): boolean {
    const date = entry?.date instanceof Date ? entry.date : new Date(entry?.date || '');
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }

  hasActivityCounts(entry: JournalEntry): boolean {
    return [entry.habitCountTotal, entry.taskCountTotal].some(value => Number(value) > 0);
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

  toggleActions(event: Event): void {
    event.stopPropagation();
    this.actionsOpen = !this.actionsOpen;
  }

  editEntry(event: Event): void {
    event.stopPropagation();
    this.actionsOpen = false;
    this.edit.emit(this.entry);
  }

  deleteEntry(event: Event): void {
    event.stopPropagation();
    this.actionsOpen = false;
    this.remove.emit(this.entry);
  }
}
