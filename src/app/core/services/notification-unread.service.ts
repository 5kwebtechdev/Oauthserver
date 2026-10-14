import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationReadState {
  readStatus: boolean | null;
}

export interface NotificationSnapshot<T extends NotificationReadState> {
  notifications: T[];
  current: boolean;
}

/** The server's visible notification list is the badge's source of truth. */
@Injectable({ providedIn: 'root' })
export class NotificationUnreadService {
  readonly count$ = new BehaviorSubject<number>(0);
  private token: string | null = null;
  private revision = 0;
  private contentRevision = 0;
  private pendingReads = 0;

  constructor(private http: HttpClient) {}

  private useToken(token: string | null): void {
    if (this.token === token) return;
    this.token = token;
    this.revision++;
    this.contentRevision = this.revision;
    this.pendingReads = 0;
    this.count$.next(0);
  }

  load<T extends NotificationReadState>(token: string): Observable<NotificationSnapshot<T>> {
    this.useToken(token);
    const revision = ++this.revision;
    const headers = new HttpHeaders({
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      Accept: 'application/json',
      'x-skip-loading': '1'
    });
    return this.http.get<T[]>(`${environment.apiUrl}/user/notifications`, { headers }).pipe(
      map(response => Array.isArray(response) ? response : []),
      map(notifications => ({ notifications, current: this.token === token && revision >= this.contentRevision && this.pendingReads === 0 })),
      tap(snapshot => {
        if (snapshot.current && this.revision === revision) {
          this.count$.next(this.countUnread(snapshot.notifications));
        }
      })
    );
  }

  refresh(token: string | null): void {
    if (!token) {
      this.useToken(null);
      return;
    }
    if (this.token === token && this.pendingReads > 0) return;
    this.load(token).subscribe({ error: () => { /* Keep the last confirmed count on a transient error. */ } });
  }

  /** A read action updates the badge at once and holds it until the write settles. */
  beginRead<T extends NotificationReadState>(token: string, notifications: T[]): void {
    this.useToken(token);
    this.pendingReads++;
    this.setFromList(token, notifications);
  }

  finishRead(token: string): void {
    if (this.token !== token) return;
    this.pendingReads = Math.max(0, this.pendingReads - 1);
    this.revision++;
    this.contentRevision = this.revision;
    if (this.pendingReads === 0) this.refresh(token);
  }

  /** Apply a rollback or a newly received list to the shared count. */
  setFromList<T extends NotificationReadState>(token: string, notifications: T[]): void {
    this.useToken(token);
    this.revision++;
    this.contentRevision = this.revision;
    this.count$.next(this.countUnread(notifications));
  }

  private countUnread(notifications: NotificationReadState[]): number {
    // The backend already applies its 10-day/FAMILY_MESSAGE visibility rule.
    return notifications.filter(notification => notification.readStatus !== true).length;
  }
}
