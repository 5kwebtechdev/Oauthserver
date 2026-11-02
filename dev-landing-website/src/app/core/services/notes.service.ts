import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { NotesApi } from '../api/notes.api';

export interface NoteModel {
    id?: any;
    title: string;
    text: string;
    tags: string[];
    createdAt: string;
    updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
    private notes: NoteModel[] = [];
    private notesChanged = new Subject<NoteModel[]>();
    private loadingSubject = new BehaviorSubject<boolean>(false);
    private errorSubject = new BehaviorSubject<string | null>(null);

    public notes$ = this.notesChanged.asObservable();
    public loading$ = this.loadingSubject.asObservable();
    public error$ = this.errorSubject.asObservable();

    constructor(private notesApi: NotesApi) { }

    /** Initialize service state from sessionStorage if present. Call once on app load. */
    initFromSession() {
        try {
            const raw = sessionStorage.getItem('notes');
            if (raw) {
                const parsed = JSON.parse(raw) || [];
                this.notes = parsed;
                this.notesChanged.next(this.notes.slice());
            }
        } catch (e) {
            // ignore parse errors
        }
    }

    /** Persist current notes array to sessionStorage. */
    private persistToSession() {
        try {
            sessionStorage.setItem('notes', JSON.stringify(this.notes));
        } catch (e) {
            // ignore storage errors
        }
    }

    /** Delete locally (synchronous) without calling API. */
    deleteLocal(id: any) {
        this.notes = this.notes.filter(n => (n as any).id !== id);
        this.notesChanged.next(this.notes.slice());
        this.persistToSession();
    }

    /** Add note via API and update local cache */
    addNote(payload: any): Observable<any> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        return this.notesApi.addNote(payload).pipe(
            tap((res: any) => {
                const created = res?.data || res || payload;
                const note = this.mapToNoteModel(created, payload);
                this.addLocal(note);
                this.loadingSubject.next(false);
            }),
            catchError((err) => {
                this.loadingSubject.next(false);
                this.errorSubject.next(err?.message || 'Failed to save note');
                throw err;
            })
        );
    }

    /** Backwards-compatible add() used by older components — keeps local behavior. */
    addLocal(note: NoteModel) {
        this.notes.unshift(note);
        this.notesChanged.next(this.notes.slice());
        this.persistToSession();
    }

    /** Optimistic add: insert a temporary note immediately, call backend, then replace or revert. */
    addOptimistic(payload: any): Observable<any> {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const tempNote: NoteModel = {
            title: payload.title || 'Untitled',
            text: payload.content || payload.text || '',
            tags: payload.tags || [],
            createdAt: new Date().toISOString(),
            id: tempId
        };
        this.notes.unshift(tempNote);
        this.notesChanged.next(this.notes.slice());
        this.persistToSession();

        return new Observable<any>((subscriber) => {
            this.notesApi.addNote(payload).subscribe({
                next: (res: any) => {
                    const created = res?.data || res || payload;
                    const serverNote = this.mapToNoteModel(created, payload);
                    const idx = this.notes.findIndex(n => (n as any).id === tempId);
                    if (idx > -1) this.notes[idx] = serverNote;
                    else this.notes.unshift(serverNote);
                    this.notesChanged.next(this.notes.slice());
                    this.persistToSession();
                    subscriber.next(serverNote);
                    subscriber.complete();
                },
                error: (err: any) => {
                    this.notes = this.notes.filter(n => (n as any).id !== tempId);
                    this.notesChanged.next(this.notes.slice());
                    this.persistToSession();
                    subscriber.error(err);
                }
            });
        });
    }

    /** Update note via API */
    updateNote(id: any, payload: any): Observable<any> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        return this.notesApi.updateNote(id, payload).pipe(
            tap((res: any) => {
                const updated = res?.data || res || payload;
                const idx = this.notes.findIndex((n) => n.id === id);
                if (idx !== -1) {
                    this.notes[idx] = this.mapToNoteModel(updated, payload, id);
                }
                this.notesChanged.next(this.notes.slice());
                this.loadingSubject.next(false);
            }),
            catchError((err) => {
                this.loadingSubject.next(false);
                this.errorSubject.next(err?.message || 'Failed to update note');
                throw err;
            })
        );
    }

    /** Optimistic update: apply change locally immediately, call API, revert on error. */
    updateOptimistic(id: any, payload: any): Observable<any> {
        return new Observable<any>((subscriber) => {
            const idx = this.notes.findIndex(n => (n as any).id === id);
            const prev = idx > -1 ? { ...this.notes[idx] } : null;

            const now = new Date().toISOString();
            const optimisticNote: NoteModel = {
                title: payload.title || 'Untitled',
                text: payload.content || payload.text || '',
                tags: payload.tags || [],
                createdAt: prev ? prev.createdAt : now,
                updatedAt: now,
                id
            };

            if (idx > -1) this.notes[idx] = optimisticNote;
            else this.notes.unshift(optimisticNote);
            this.notesChanged.next(this.notes.slice());
            this.persistToSession();

            this.notesApi.updateNote(id, payload).subscribe({
                next: (res: any) => {
                    const updated = res?.data || res || payload;
                    const serverNote = this.mapToNoteModel(updated, payload, id);
                    const replaceIdx = this.notes.findIndex(n => (n as any).id === id);
                    if (replaceIdx > -1) this.notes[replaceIdx] = serverNote;
                    else this.notes.unshift(serverNote);
                    this.notesChanged.next(this.notes.slice());
                    this.persistToSession();
                    subscriber.next(serverNote);
                    subscriber.complete();
                },
                error: (err: any) => {
                    if (prev) {
                        const revertIdx = this.notes.findIndex(n => (n as any).id === id);
                        if (revertIdx > -1) this.notes[revertIdx] = prev;
                    } else {
                        this.notes = this.notes.filter(n => (n as any).id !== id);
                    }
                    this.notesChanged.next(this.notes.slice());
                    this.persistToSession();
                    subscriber.error(err);
                }
            });

            subscriber.next(optimisticNote);
            subscriber.complete();
        });
    }

    /** Delete note via API */
    deleteNote(id: any): Observable<any> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        // Optimistic delete: remove locally, call backend, revert on error
        const prev = this.notes.slice();
        this.notes = this.notes.filter((n) => n.id !== id);
        this.notesChanged.next(this.notes.slice());
        this.persistToSession();

        return new Observable<any>((subscriber) => {
            this.notesApi.deleteNote(id).subscribe({
                next: (res: any) => {
                    this.loadingSubject.next(false);
                    subscriber.next(res);
                    subscriber.complete();
                },
                error: (err: any) => {
                    // revert
                    this.notes = prev;
                    this.notesChanged.next(this.notes.slice());
                    this.persistToSession();
                    this.loadingSubject.next(false);
                    this.errorSubject.next(err?.message || 'Failed to delete note');
                    subscriber.error(err);
                }
            });
        });
    }

    /** Fetch all notes from backend */
    fetchAll(): Observable<NoteModel[]> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);
        console.log('[NotesService] fetchAll called');

        return new Observable<NoteModel[]>((subscriber) => {
            this.notesApi.getAll().subscribe({
                next: (res: any) => {
                    console.log('[NotesService] fetchAll raw response:', res);
                    const raw = res?.data || res || [];
                    this.notes = (Array.isArray(raw) ? raw : []).map((item: any) => this.mapToNoteModel(item));
                    console.log('[NotesService] mapped notes:', this.notes);
                    this.notesChanged.next(this.notes.slice());
                    this.loadingSubject.next(false);
                    subscriber.next(this.notes.slice());
                    subscriber.complete();
                },
                error: (err) => {
                    console.error('[NotesService] fetchAll error:', err);
                    this.loadingSubject.next(false);
                    this.errorSubject.next(err?.error?.message || err?.message || 'Failed to load notes');
                    subscriber.error(err);
                }
            });
        });
    }

    getAll(): NoteModel[] {
        return this.notes;
    }

    getById(id: any): NoteModel | undefined {
        return this.notes.find((n) => n.id === id);
    }

    clear(): void {
        this.notes = [];
        this.notesChanged.next([]);
        try { sessionStorage.removeItem('notes'); } catch (e) { /* ignore */ }
    }

    /** Map backend response to NoteModel */
    private mapToNoteModel(item: any, fallback?: any, forceId?: any): NoteModel {
        const createdAt = item?.createdDate
            ? item.createdTime
                ? `${item.createdDate}T${item.createdTime}`
                : item.createdDate
            : item?.createdAt || fallback?.createdAt || new Date().toISOString();

        const updatedAt = item?.updatedDate
            ? item.updatedTime
                ? `${item.updatedDate}T${item.updatedTime}`
                : item.updatedDate
            : item?.updatedAt || fallback?.updatedAt;

        return {
            id: forceId || item?.id || item?.noteId || item?._id || fallback?.id,
            title: item?.title || item?.name || fallback?.title || 'Untitled',
            text: item?.content || item?.text || item?.excerpt || fallback?.text || '',
            tags: item?.tags || fallback?.tags || [],
            createdAt,
            updatedAt
        };
    }
}
