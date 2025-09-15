import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NotesService, NoteModel } from './notes.service';
import { MindfulBadgeComponent } from '../mindful-badge/mindful-badge.component';

@Component({
  selector: 'notes-home',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulBadgeComponent],
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
}
