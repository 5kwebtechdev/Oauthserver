import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface JournalEntry {
    id: string;
    title: string;
    content: string;
    date: Date;
    time?: string;
    mood: string;
    tags: string[];
    images?: string[];
    isPrivate: boolean;
}

export interface JournalPayload {
    notes: string;
    emotions?: string | null;
    sleep?: string | null;
    health?: string | null;
    hobbies?: string | null;
    food?: string | null;
    social?: string | null;
    school?: string | null;
    attachmentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class JournalService {
    private readonly apiUrl = `${environment.apiUrl}/journal`;
    private entriesSubject = new BehaviorSubject<JournalEntry[]>([]);
    public entries$ = this.entriesSubject.asObservable();
    public loading$ = new BehaviorSubject<boolean>(false);

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(json = false): HttpHeaders {
        let headers = new HttpHeaders();
        const token = this.authService.getToken();
        if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
        if (json) headers = headers.set('Content-Type', 'application/json');
        return headers;
    }

    loadEntries(): Observable<JournalEntry[]> {
        this.loading$.next(true);
        return this.http.get<any[]>(`${this.apiUrl}/entries`, { headers: this.getHeaders() }).pipe(
            map(res => {
                const entries = this.mapApiToEntries(res);
                this.entriesSubject.next(entries);
                this.loading$.next(false);
                return entries;
            }),
            catchError(err => {
                console.error('Failed to load journal entries', err);
                this.loading$.next(false);
                return of([]);
            })
        );
    }

    loadEntriesForMonth(year: number, month: number): Observable<JournalEntry[]> {
        this.loading$.next(true);
        const params = new HttpParams()
            .set('type', 'MONTH')
            .set('month', month.toString())
            .set('year', year.toString());
        return this.http.get<any>(`${this.apiUrl}/entries`, { headers: this.getHeaders(), params }).pipe(
            map(res => {
                const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.entries ?? []);
                const entries = this.mapApiToEntries(raw);
                this.entriesSubject.next(entries);
                this.loading$.next(false);
                return entries;
            }),
            catchError(err => {
                console.error('Failed to load journal entries for month', err);
                this.loading$.next(false);
                return of([]);
            })
        );
    }

    addEntry(payload: JournalPayload, files: File[] = []): Observable<any> {
        const form = new FormData();

        // Append text fields
        const keys: (keyof JournalPayload)[] = ['emotions', 'sleep', 'health', 'hobbies', 'food', 'social', 'school', 'notes'];
        keys.forEach(k => {
            const v = (payload as any)[k];
            if (v !== undefined && v !== null && v !== '') form.append(k, String(v));
        });

        // Append actual file objects (API field name: "files")
        files.forEach(f => form.append('files', f, f.name));

        // Only set Authorization — do NOT set Content-Type (browser sets it with boundary automatically)
        const token = this.authService.getToken();
        const headers = token
            ? new HttpHeaders({ Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` })
            : new HttpHeaders();

        return this.http.post(`${this.apiUrl}/add`, form, { headers }).pipe(
            map(res => {
                this.loadEntries().subscribe();
                return res;
            }),
            catchError(err => {
                console.error('Failed to add journal entry', err);
                throw err;
            })
        );
    }

    getEntryById(id: string): Observable<JournalEntry | null> {
        return this.http.get<any>(`${this.apiUrl}/entries/${id}`, { headers: this.getHeaders() }).pipe(
            map(item => this.mapSingleEntry(item)),
            catchError(() => of(null))
        );
    }

    deleteEntry(id: string): Observable<boolean> {
        return this.http.delete(`${this.apiUrl}/entries/${id}`, { headers: this.getHeaders() }).pipe(
            map(() => {
                const current = this.entriesSubject.value.filter(e => e.id !== id);
                this.entriesSubject.next(current);
                return true;
            }),
            catchError(() => of(false))
        );
    }

    private mapApiToEntries(res: any[]): JournalEntry[] {
        if (!Array.isArray(res)) return [];
        return res
            .map(item => this.mapSingleEntry(item))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    private mapSingleEntry(item: any): JournalEntry {
        let dateVal = new Date();
        try {
            if (item.creationDate && item.creationTime) {
                dateVal = new Date(`${item.creationDate}T${item.creationTime}`);
            } else if (item.creationDate) {
                dateVal = new Date(item.creationDate);
            } else if (item.date) {
                dateVal = new Date(item.date);
            }
        } catch { dateVal = new Date(); }

        const tags: string[] = [];
        // Hobbies may be comma-separated
        if (item.hobbies && typeof item.hobbies === 'string') {
            item.hobbies.split(',').forEach((t: string) => {
                const s = t.trim();
                if (s && tags.indexOf(s) === -1) tags.push(s);
            });
        }

        // Each field value becomes a plain tag
        ['sleep', 'health', 'food', 'social', 'school', 'emotions'].forEach(k => {
            if (item[k]) {
                const val = String(item[k]).trim();
                if (val && tags.indexOf(val) === -1) tags.push(val);
            }
        });

        const images: string[] = [];
        if (item.attachments && Array.isArray(item.attachments)) {
            item.attachments.forEach((u: string) => { if (u) images.push(u); });
        } else if (item.attachmentUrls && Array.isArray(item.attachmentUrls)) {
            item.attachmentUrls.forEach((u: string) => { if (u) images.push(u); });
        } else if (item.attachmentUrl) {
            images.push(item.attachmentUrl);
        }

        return {
            id: item.id?.toString() ?? '',
            title: item.notes ? (String(item.notes).split('\n')[0].slice(0, 80)) : (item.title || 'Journal entry'),
            content: item.notes || '',
            date: dateVal,
            time: item.creationTime || undefined,
            mood: item.emotions || item.mood || '',
            tags,
            images,
            isPrivate: !!item.isPrivate
        };
    }

    // Validation helpers
    validatePayload(payload: JournalPayload): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        // Require an emotion selection (frontend also enforces this)
        if (!payload.emotions || !String(payload.emotions).trim()) {
            errors.push('How are you feeling? Pick an emotion to continue.');
        }

        // Notes required and keep concise (align with MindfulBuddy input)
        if (!payload.notes || !payload.notes.trim()) {
            errors.push('Write a short note about your day');
        }
        // Keep note length conservative to fit the input UI
        if (payload.notes && payload.notes.length > 160) {
            errors.push('Notes must be 160 characters or less');
        }

        return { valid: errors.length === 0, errors };
    }

    validateFile(file: File): { valid: boolean; error?: string } {
        try {
            // Accept common image MIME types, but tolerate empty type by checking extension
            const fileType = file.type || '';
            if (fileType) {
                if (!fileType.startsWith('image/')) return { valid: false, error: 'Invalid format' };
            } else {
                const name = (file.name || '').toLowerCase();
                if (!name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) {
                    return { valid: false, error: 'Invalid format' };
                }
            }

            // Allow up to 7 MB to match MindfulBuddy behavior
            const maxBytes = 7 * 1024 * 1024;
            if (file.size > maxBytes) return { valid: false, error: 'File size limit 7mb' };

            return { valid: true };
        } catch (e) {
            return { valid: false, error: 'Invalid file' };
        }
    }

    private capitalize(s: string): string {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}
