import { Injectable } from '@angular/core';

export interface NoteModel {
  title: string;
  /** note text can be a string or an array of strings (checklist) */
  text: string | string[];
  tags: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private notes: NoteModel[] = [];

  add(note: NoteModel) {
    this.notes.unshift(note);
  }

  getAll(): NoteModel[] {
    return this.notes;
  }

  clear() {
    this.notes = [];
  }
}
