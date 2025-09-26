import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NotesApi } from '../../api/notes.api';

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
  private notesChanged = new Subject<NoteModel[]>();
  public notes$ = this.notesChanged.asObservable();

  constructor(private notesApi: NotesApi) { }

  /**
   * Add note locally
   */
  addLocal(note: NoteModel) {
    this.notes.unshift(note);
    // notify subscribers that notes changed
    this.notesChanged.next(this.notes.slice());
  }

  /**
   * Backwards-compatible add() used by older components — keeps local behavior.
   * If callers provide a payload intended for the backend, they should use addNote().
   */
  add(note: NoteModel) {
    this.addLocal(note);
  }

  /**
   * Add note via backend API. Returns observable of response.
   * On success, update local cache with the created note (if backend returns it) or the local payload.
   */
  addNote(payload: any): Observable<any> {
    return this.notesApi.addNote(payload).pipe(
      tap((res: any) => {
        // If server returns the created note object, use it; otherwise use payload
        const created = res && (res.data || res) ? (res.data || res) : payload;
        const note: NoteModel = {
          title: created.title || payload.title || 'Untitled',
          text: created.content || created.text || payload.text || '',
          tags: created.tags || payload.tags || [],
          createdAt: created.createdDate || created.createdAt || new Date().toISOString()
        };
        this.addLocal(note);
      })
    );
  }

  getAll(): NoteModel[] {
    return this.notes;
  }

  clear() {
    this.notes = [];
  }
}
