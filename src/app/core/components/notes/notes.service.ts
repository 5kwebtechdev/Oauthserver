import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NoteTagDto, NotesApi } from '../../api/notes.api';

export interface NoteModel {
  title: string;
  /** note text can be a string or an array of strings (checklist) */
  text: string | string[];
  tags: string[];
  tagId?: any;
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
  private tagsChanged = new Subject<NoteTagDto[]>();
  public notes$ = this.notesChanged.asObservable();
  public tags$ = this.tagsChanged.asObservable();

  constructor(private notesApi: NotesApi) { }

  private rawList(res: any): any[] {
    const raw = res && (res.data || res) ? (res.data || res) : [];
    return Array.isArray(raw) ? raw : [];
  }

  private noteTags(source: any, fallback: any = {}): string[] {
    if (Array.isArray(source?.tags) && source.tags.length) {
      return source.tags.map((tag: any) => typeof tag === 'string' ? tag : (tag?.name || tag?.tagName || '')).filter(Boolean);
    }
    if (Array.isArray(fallback?.tags) && fallback.tags.length) return fallback.tags;
    const name = source?.tagName || source?.tag?.name || fallback?.tagName;
    return name ? [String(name)] : [];
  }

  private noteTagId(source: any, fallback: any = {}): any {
    return source?.tagId ?? source?.tag?.id ?? fallback?.tagId ?? undefined;
  }

  private mapNote(source: any, fallback: any = {}): NoteModel {
    const createdAt = source?.createdDate
      ? (source.createdTime ? `${source.createdDate}T${source.createdTime}` : source.createdDate)
      : (source?.createdAt || fallback?.createdAt || new Date().toISOString());
    const updatedAt = source?.updatedDate
      ? (source.updatedTime ? `${source.updatedDate}T${source.updatedTime}` : source.updatedDate)
      : (source?.updatedAt || fallback?.updatedAt || undefined);

    return {
      title: source?.title || fallback?.title || 'Untitled',
      text: source?.content || source?.text || fallback?.content || fallback?.text || '',
      tags: this.noteTags(source, fallback),
      tagId: this.noteTagId(source, fallback),
      createdAt,
      updatedAt,
      id: source?.id || source?.noteId || source?._id || fallback?.id || undefined
    };
  }

  /**
   * Initialize service state from sessionStorage if present.
   * Call this once on app/login load to avoid refetching repeatedly.
   */
  initFromSession() {
    try {
      const raw = sessionStorage.getItem('notes');
      if (raw) {
        const parsed = JSON.parse(raw) || [];
        this.notes = parsed;
        this.notesChanged.next(this.notes.slice());
      }
    } catch (e) {
      // ignore parse errors and continue to empty state
    }
  }

  /**
   * Add note locally
   */
  addLocal(note: NoteModel) {
    this.notes.unshift(note);
    // notify subscribers that notes changed
    this.notesChanged.next(this.notes.slice());
    this.persistToSession();
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
        const note = this.mapNote(created, payload);
        this.addLocal(note);
      })
    );
  }

  /**
   * Optimistic add: insert a temporary note immediately, call backend,
   * then replace the temp note with the server-created note on success,
   * or revert on error.
   */
  addOptimistic(payload: any): Observable<any> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const tempNote: NoteModel = {
      title: payload.title || 'Untitled',
      text: payload.content || payload.text || '',
      tags: payload.tags || (payload.tagName ? [payload.tagName] : []),
      tagId: payload.tagId,
      createdAt: new Date().toISOString(),
      id: tempId
    };
    // add locally so UI updates immediately
    this.notes.unshift(tempNote);
    this.notesChanged.next(this.notes.slice());
    this.persistToSession();

    // call backend and patch/replace on success
    return new Observable<any>((subscriber) => {
      this.notesApi.addNote(payload).subscribe({
        next: (res: any) => {
          const created = res && (res.data || res) ? (res.data || res) : payload;
          const serverNote = this.mapNote(created, payload);
          // replace temp note if present
          const idx = this.notes.findIndex(n => (n as any).id === tempId);
          if (idx > -1) {
            this.notes[idx] = serverNote;
          } else {
            this.notes.unshift(serverNote);
          }
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.next(serverNote);
          subscriber.complete();
        },
        error: (err: any) => {
          // remove temp note on failure
          this.notes = this.notes.filter(n => (n as any).id !== tempId);
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.error(err);
        }
      });
    });
  }

  /**
   * Persist current notes array to sessionStorage.
   */
  private persistToSession() {
    try {
      sessionStorage.setItem('notes', JSON.stringify(this.notes));
    } catch (e) {
      // ignore storage errors (quota etc.)
    }
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
          const raw = this.rawList(res);
          // map to NoteModel shape
          this.notes = raw.map((item: any) => this.mapNote(item));
          // notify subscribers and emit
          this.notesChanged.next(this.notes.slice());
          // persist fetched notes so subsequent opens can use session cache
          this.persistToSession();
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

  /**
   * Delete locally (synchronous) without calling API.
   */
  deleteLocal(id: any) {
    this.notes = this.notes.filter(n => (n as any).id !== id);
    this.notesChanged.next(this.notes.slice());
    this.persistToSession();
  }

  /**
   * Optimistic delete: remove locally and call backend. On error, refetch from server.
   */
  deleteNote(id: any): Observable<any> {
    // remove locally first
    const prev = this.notes.slice();
    this.deleteLocal(id);
    return new Observable<any>((subscriber) => {
      this.notesApi.deleteNote(id).subscribe({
        next: (res: any) => {
          subscriber.next(res);
          subscriber.complete();
        },
        error: (err: any) => {
          // revert to previous state on error and emit
          this.notes = prev;
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.error(err);
        }
      });
    });
  }

  /**
   * Update a note via backend and update local cache on success.
   */
  updateNote(id: any, payload: any): Observable<any> {
    return new Observable<any>((subscriber) => {
      this.notesApi.updateNote(id, payload).subscribe({
        next: (res: any) => {
          const updated = res && (res.data || res) ? (res.data || res) : payload;
          // map server response to NoteModel shape
          const note = this.mapNote(updated, { ...payload, id });

          // replace existing note in local cache if present
          const idx = this.notes.findIndex(n => (n as any).id === id);
          if (idx > -1) {
            this.notes[idx] = note;
          } else {
            // if not present, add to top
            this.notes.unshift(note);
          }
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.next(note);
          subscriber.complete();
        },
        error: (err: any) => {
          subscriber.error(err);
        }
      });
    });
  }

  /**
   * Optimistic update: apply the update to local cache immediately, emit change,
   * then call backend. On error, revert to previous state and emit an error.
   */
  updateOptimistic(id: any, payload: any): Observable<any> {
    return new Observable<any>((subscriber) => {
      // Snapshot previous note
      const idx = this.notes.findIndex(n => (n as any).id === id);
      const prev = idx > -1 ? { ...this.notes[idx] } : null;

      // Apply optimistic update locally
      const now = new Date().toISOString();
      const optimisticNote: NoteModel = {
        title: payload.title || 'Untitled',
        text: payload.content || payload.text || '',
        tags: payload.tags || (payload.tagName ? [payload.tagName] : []),
        tagId: payload.tagId,
        createdAt: prev ? prev.createdAt : now,
        updatedAt: now,
        id: id
      };

      if (idx > -1) {
        this.notes[idx] = optimisticNote;
      } else {
        this.notes.unshift(optimisticNote);
      }
      this.notesChanged.next(this.notes.slice());
      this.persistToSession();

      // Kick off backend update but don't block the UI
      this.notesApi.updateNote(id, payload).subscribe({
        next: (res: any) => {
          // map server response and replace note with authoritative data
          const updated = res && (res.data || res) ? (res.data || res) : payload;
          const serverNote = this.mapNote(updated, { ...payload, ...optimisticNote, id });
          const replaceIdx = this.notes.findIndex(n => (n as any).id === id);
          if (replaceIdx > -1) this.notes[replaceIdx] = serverNote;
          else this.notes.unshift(serverNote);
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.next(serverNote);
          subscriber.complete();
        },
        error: (err: any) => {
          // revert optimistic change
          if (prev) {
            const revertIdx = this.notes.findIndex(n => (n as any).id === id);
            if (revertIdx > -1) {
              this.notes[revertIdx] = prev;
            }
          } else {
            // remove optimistic note
            this.notes = this.notes.filter(n => (n as any).id !== id);
          }
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.error(err);
        }
      });

      // Immediately resolve so callers can navigate without waiting
      subscriber.next(optimisticNote);
      subscriber.complete();
    });
  }

  fetchByTag(tagName: string): Observable<NoteModel[]> {
    return new Observable<NoteModel[]>((subscriber) => {
      this.notesApi.getByTag(tagName).subscribe({
        next: (res: any) => {
          this.notes = this.rawList(res).map((item: any) => this.mapNote(item));
          this.notesChanged.next(this.notes.slice());
          this.persistToSession();
          subscriber.next(this.notes.slice());
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  searchNotes(query: string): Observable<NoteModel[]> {
    return new Observable<NoteModel[]>((subscriber) => {
      this.notesApi.searchNotes(query).subscribe({
        next: (res: any) => {
          this.notes = this.rawList(res).map((item: any) => this.mapNote(item));
          this.notesChanged.next(this.notes.slice());
          subscriber.next(this.notes.slice());
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  fetchTags(): Observable<NoteTagDto[]> {
    return new Observable<NoteTagDto[]>((subscriber) => {
      this.notesApi.getTags().subscribe({
        next: (tags) => {
          const normalized = Array.isArray(tags) ? tags : [];
          this.tagsChanged.next(normalized.slice());
          subscriber.next(normalized);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  createTag(name: string): Observable<NoteTagDto> {
    return new Observable<NoteTagDto>((subscriber) => {
      this.notesApi.createTag(name).subscribe({
        next: (tag) => {
          this.fetchTags().subscribe({ next: () => undefined, error: () => undefined });
          subscriber.next(tag);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  updateTag(tagId: any, name: string): Observable<NoteTagDto> {
    return new Observable<NoteTagDto>((subscriber) => {
      this.notesApi.updateTag(tagId, name).subscribe({
        next: (tag) => {
          this.fetchTags().subscribe({ next: () => undefined, error: () => undefined });
          subscriber.next(tag);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  deleteTag(tagId: any): Observable<{ message?: string }> {
    return new Observable<{ message?: string }>((subscriber) => {
      this.notesApi.deleteTag(tagId).subscribe({
        next: (res) => {
          this.fetchTags().subscribe({ next: () => undefined, error: () => undefined });
          subscriber.next(res);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err)
      });
    });
  }

  clear() {
    this.notes = [];
    this.notesChanged.next(this.notes.slice());
    try {
      sessionStorage.removeItem('notes');
    } catch (e) { /* ignore */ }
  }
}
