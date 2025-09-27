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
  /** optional last-updated timestamp from backend */
  updatedAt?: string;
  /** optional id from backend */
  id?: any;
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
        const createdAtVal = created.createdDate ? (created.createdTime ? `${created.createdDate}T${created.createdTime}` : created.createdDate) : (payload.createdAt || new Date().toISOString());
        const updatedAtVal = created.updatedDate ? (created.updatedTime ? `${created.updatedDate}T${created.updatedTime}` : created.updatedDate) : (created.updatedAt || payload.updatedAt || undefined);
        const note: NoteModel = {
          title: created.title || payload.title || 'Untitled',
          text: created.content || created.text || payload.text || '',
          tags: created.tags || payload.tags || [],
          createdAt: createdAtVal,
          updatedAt: updatedAtVal
          ,
          id: created.id || created.noteId || created._id || payload.id || undefined
        };
        this.addLocal(note);
      })
    );
  }

  /**
   * Fetch all notes from backend and update local cache.
   * Returns observable so callers can react to loading/error if desired.
   */
  fetchAll(): Observable<NoteModel[]> {
    return new Observable<NoteModel[]>((subscriber) => {
      this.notesApi.getAll().subscribe({
        next: (res: any) => {
          // API may return { data: [...] } or [...] directly
          const raw = res && (res.data || res) ? (res.data || res) : [];
          // map to NoteModel shape
          this.notes = (raw || []).map((item: any) => {
            const createdAt = item.createdDate ? (item.createdTime ? `${item.createdDate}T${item.createdTime}` : item.createdDate) : (item.createdAt || new Date().toISOString());
            const updatedAt = item.updatedDate ? (item.updatedTime ? `${item.updatedDate}T${item.updatedTime}` : item.updatedDate) : (item.updatedAt || undefined);
            return {
              title: item.title || item.name || 'Untitled',
              text: item.content || item.text || '',
              tags: item.tags || [],
              createdAt,
              updatedAt
              ,
              id: item.id || item.noteId || item._id || undefined
            } as NoteModel;
          });
          // notify subscribers and emit
          this.notesChanged.next(this.notes.slice());
          subscriber.next(this.notes.slice());
          subscriber.complete();
        },
        error: (err) => {
          subscriber.error(err);
        }
      });
    });
  }

  getAll(): NoteModel[] {
    return this.notes;
  }

  clear() {
    this.notes = [];
  }
}
