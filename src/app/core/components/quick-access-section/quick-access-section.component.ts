import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotesService, NoteModel } from '../notes/notes.service';

@Component({
  selector: 'quick-access-section',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-access-section.component.html',
  styleUrls: ['./quick-access-section.component.scss']
})
export class QuickAccessSectionComponent implements OnInit, OnDestroy {
  /** Most recently created notes — kept live via NotesService.notes$ so a just-submitted note appears immediately. */
  qaRecentNotes: NoteModel[] = [];
  private qaNotesSub?: Subscription;

  constructor(private notesService: NotesService) {}

  ngOnInit(): void {
    this.notesService.initFromSession();
    this.qaRecentNotes = this.notesService.getAll().slice(0, 2);
    if (!this.qaRecentNotes.length) {
      this.notesService.fetchAll().subscribe({ error: () => undefined });
    }
    this.qaNotesSub = this.notesService.notes$.subscribe(list => {
      this.qaRecentNotes = (list || []).slice(0, 2);
    });
  }

  ngOnDestroy(): void {
    this.qaNotesSub?.unsubscribe();
  }

  qaNoteTitle(note: NoteModel): string {
    if (note.title && note.title.trim() && note.title !== 'Untitled') return note.title;
    const text = Array.isArray(note.text) ? note.text[0] : note.text;
    return (text || '').toString().trim() || 'Untitled note';
  }
}
