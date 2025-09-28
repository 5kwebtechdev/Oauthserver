import { Component, Input } from '@angular/core';
// NgStyle removed because the template does not use ngStyle
import { IonicModule } from "@ionic/angular";
import { Router } from '@angular/router';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../mindful-navigator/view-all/view-all.component';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';

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
  imports: [IonicModule, MindfulCardHeaderComponent, ViewAllComponent, MindfulButtonComponent],
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

  constructor(private router: Router) {
    // Use sample data if no entries provided
    if (this.entries.length === 0) {
      this.entries = this.sampleEntries;
    }
  }

  // If running in an Ionic environment, ModalController will be available via DI.
  // We'll try to lazily resolve it using optional injection via the constructor signature is not present,
  // so provide a private field and simple runtime guard in the method below.
  // Note: For proper DI, add `private modalCtrl: ModalController` to the constructor if desired.

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
    // Navigate to the journal input route within the authenticated area
    this.router.navigate(['/authed/journal-input']).catch(() => { /* swallow navigation errors */ });
  }

  onViewAllEntries(): void {
    // Navigation to journal-output is now handled declaratively by the template via routerLink.
    // If passing state is needed later, use Router.navigate with state from a dedicated action.
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