import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from './app-config';

export interface Note {
  id: number;
  ownerUsername: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface MeResponse {
  sub: string;
  scope: string;
  roles: string[];
  authorities: string[];
  issuedAt: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly base = APP_CONFIG.resourceServerBaseUrl;

  constructor(private readonly http: HttpClient) {}

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/api/me`);
  }

  myNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.base}/api/notes`);
  }

  createNote(title: string, content: string): Observable<Note> {
    return this.http.post<Note>(`${this.base}/api/notes`, { title, content });
  }

  allNotes(): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.base}/api/admin/notes`);
  }
}
