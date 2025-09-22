import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NotesService, NoteModel } from './notes.service';
import { MindfulBadgeComponent } from '../mindful-badge/mindful-badge.component';

@Component({
  selector: 'notes-home',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulBadgeComponent, RouterModule],
  templateUrl: './notes-home.component.html',
  styleUrls: ['./notes-home.component.scss']
})
export class NotesHomeComponent {
  public notes: NoteModel[] = [];
  public sortOptions = [
    { key: 'created', value: 'Date Created' },
    { key: 'modified', value: 'Modified date' },
    { key: 'az', value: 'A-Z' },
    { key: 'za', value: 'Z-A' }
  ];

  public selectedSort: any = null;

  constructor(private notesService: NotesService, private location: Location) {
    this.notes = this.notesService.getAll();

    // If there are no persisted notes yet, provide friendly sample notes for UI/demo
    if (!this.notes || this.notes.length === 0) {
      this.notes = [
        {
          title: 'Ideas for Rainy Days',
          text: 'Build a pillow fort, indoor treasure hunt, or story time marathon. Try reading a new book together.',
          tags: ['brainstorm'],
          createdAt: new Date('2025-03-15').toISOString()
        },
        {
          title: 'My Mood Tracker Thoughts',
          text: 'Noticed I feel calmer after journaling at night. Should try making it a habit.',
          tags: ['mood'],
          createdAt: new Date('2025-03-05').toISOString()
        },
        {
          title: 'Sunday Reset Routine',
          text: ['Organize Desk', 'Laundry', 'Pack Lunch'],
          tags: ['routine'],
          createdAt: new Date('2025-02-24').toISOString()
        }
      ];
    }
  }

  close() {
    // navigate back to previous view (mirrors modal close/back behavior)
    this.location.back();
  }

  onSortSelect(option: any) {
    this.selectedSort = option;
    if (!option) return;
    switch (option.key) {
      case 'created':
        this.notes.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case 'modified':
        // not implemented yet (no modifiedAt on notes)
        break;
      case 'az':
        this.notes.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'za':
        this.notes.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
  }

  // Template helpers
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr as string;
    }
  }

  isList(value: any): boolean {
    return Array.isArray(value);
  }

  /** Ensure template *ngFor receives an array when note.text can be string|string[] */
  getList(note: NoteModel): string[] {
    if (!note || note.text == null) return [];
    return Array.isArray(note.text) ? note.text : String(note.text).split('\n').filter(Boolean);
  }

  primaryTag(note: NoteModel): string {
    return (note.tags && note.tags.length) ? note.tags[0] : '';
  }

  primaryTagClass(note: NoteModel): string {
    const tag = this.primaryTag(note).toLowerCase();
    switch (tag) {
      case 'mood': return 'mood';
      case 'routine': return 'routine';
      case 'brainstorm': return 'brainstorm';
      default: return '';
    }
  }

  trackByIndex(index: number) {
    return index;
  }
}
