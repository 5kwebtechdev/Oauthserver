import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';
import { NotificationNavigationService } from '../../../services/notification-navigation.service';
import { NotificationUnreadService } from '../../../services/notification-unread.service';

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionScreen: string | null;
  actionReferenceId: number | null;
  readStatus: boolean | null;
  createdAt: string;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, IonicModule, SupermeNavigatorComponent],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  notifications: ApiNotification[] = [];
  loading = false;
  error = false;
  markingAllRead = false;
  private markingRead = new Set<number>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private navigation: NotificationNavigationService,
    private unread: NotificationUnreadService
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
  }

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = false;
    const token = this.authService.getToken();
    if (!token) {
      this.notifications = [];
      this.loading = false;
      this.error = true;
      return;
    }
    this.unread.load<ApiNotification>(token).subscribe({
      next: ({ notifications, current }) => {
        if (current) this.notifications = notifications;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => n.readStatus !== true).length;
  }

  onTap(n: ApiNotification): void {
    if (!n.readStatus) this.markAsRead(n);
    this.navigateFor(n);
  }

  private markAsRead(n: ApiNotification): void {
    if (this.markingRead.has(n.id)) return;
    this.markingRead.add(n.id);
    const previousStatus = n.readStatus;
    n.readStatus = true;
    const token = this.authService.getToken();
    if (token) this.unread.beginRead(token, this.notifications);
    this.cdr.detectChanges();
    this.http.post(`${environment.apiUrl}/user/notifications/${n.id}/read`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.markingRead.delete(n.id);
        if (token) this.unread.finishRead(token);
      },
      error: () => {
        this.markingRead.delete(n.id);
        n.readStatus = previousStatus;
        this.updateUnreadCount();
        if (token) this.unread.finishRead(token);
        this.cdr.detectChanges();
      }
    });
  }

  markAllAsRead(): void {
    if (this.markingAllRead || !this.unreadCount) return;
    this.markingAllRead = true;
    const previouslyUnread = this.notifications
      .filter(n => n.readStatus !== true)
      .map(notification => ({ notification, readStatus: notification.readStatus }));
    previouslyUnread.forEach(({ notification }) => notification.readStatus = true);
    const token = this.authService.getToken();
    if (token) this.unread.beginRead(token, this.notifications);
    this.cdr.detectChanges();
    this.http.post(`${environment.apiUrl}/user/notifications/read-all`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.markingAllRead = false;
        if (token) this.unread.finishRead(token);
        this.cdr.detectChanges();
      },
      error: () => {
        this.markingAllRead = false;
        previouslyUnread.forEach(({ notification, readStatus }) => notification.readStatus = readStatus);
        this.updateUnreadCount();
        if (token) this.unread.finishRead(token);
        this.cdr.detectChanges();
      }
    });
  }

  private navigateFor(n: ApiNotification): void {
    this.navigation.open(n);
  }

  private updateUnreadCount(): void {
    const token = this.authService.getToken();
    if (token) this.unread.setFromList(token, this.notifications);
  }

  iconFor(type: string): string {
    switch (type) {
      case 'ORDER_CREATED': return '🛍️';
      case 'ORDER_CANCELLED': return '❌';
      case 'RETURN_INITIATED': return '🔄';
      case 'COURSE': return '📚';
      default: return '🔔';
    }
  }

  iconClassFor(type: string): string {
    switch (type) {
      case 'ORDER_CREATED': return 'icon-success';
      case 'ORDER_CANCELLED': return 'icon-danger';
      case 'RETURN_INITIATED': return 'icon-brand';
      case 'COURSE': return 'icon-warn';
      default: return 'icon-default';
    }
  }

  formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
