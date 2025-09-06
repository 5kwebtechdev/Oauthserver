import { Component, Input } from '@angular/core';
import { NgStyle } from "@angular/common";
import { IonicModule } from "@ionic/angular";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: Date;
  mood: string;
  tags: string[];
  isPrivate: boolean;
}

@Component({
  selector: 'journals',
  templateUrl: './journals.component.html',
  styleUrls: ['./journals.component.scss'],
  imports: [NgStyle, IonicModule],
  standalone: true
})
export class JournalsComponent {
  @Input() entries: JournalEntry[] = [];
  @Input() showCreateButton: boolean = true;
  @Input() maxDisplayEntries: number = 3;

  // Sample data for demonstration
  sampleEntries: JournalEntry[] = [
    {
      id: '1',
      title: 'Morning Reflection',
      content: 'Today I feel grateful for the small moments of peace and clarity...',
      date: new Date('2024-01-15'),
      mood: 'grateful',
      tags: ['morning', 'gratitude', 'mindfulness'],
      isPrivate: false
    },
    {
      id: '2',
      title: 'Evening Thoughts',
      content: 'Reflecting on today\'s challenges and how I overcame them...',
      date: new Date('2024-01-14'),
      mood: 'reflective',
      tags: ['evening', 'reflection', 'growth'],
      isPrivate: true
    },
    {
      id: '3',
      title: 'Weekend Adventures',
      content: 'Spent time in nature today, feeling refreshed and energized...',
      date: new Date('2024-01-13'),
      mood: 'energetic',
      tags: ['weekend', 'nature', 'adventure'],
      isPrivate: false
    }
  ];

  constructor() {
    // Use sample data if no entries provided
    if (this.entries.length === 0) {
      this.entries = this.sampleEntries;
    }
  }

  getDisplayEntries(): JournalEntry[] {
    return this.entries.slice(0, this.maxDisplayEntries);
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

  onCreateNewEntry(): void {
    // Handle create new journal entry
    console.log('Create new journal entry');
  }

  onViewAllEntries(): void {
    // Handle view all entries
    console.log('View all journal entries');
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