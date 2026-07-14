import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  actionScreen: string | null;
  actionReferenceId: number | null;
  readStatus: boolean;
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
    private cdr: ChangeDetectorRef
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
    this.http.get<ApiNotification[]>(`${environment.apiUrl}/user/notifications`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.notifications = Array.isArray(res) ? res : [];
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
    return this.notifications.filter(n => !n.readStatus).length;
  }

  onTap(n: ApiNotification): void {
    if (!n.readStatus) this.markAsRead(n);
    this.navigateFor(n);
  }

  private markAsRead(n: ApiNotification): void {
    if (this.markingRead.has(n.id)) return;
    this.markingRead.add(n.id);
    n.readStatus = true;
    this.cdr.detectChanges();
    this.http.post(`${environment.apiUrl}/user/notifications/${n.id}/read`, {}, { headers: this.headers() }).subscribe({
      next: () => { this.markingRead.delete(n.id); },
      error: () => {
        this.markingRead.delete(n.id);
        n.readStatus = false;
        this.cdr.detectChanges();
      }
    });
  }

  markAllAsRead(): void {
    if (this.markingAllRead || !this.unreadCount) return;
    this.markingAllRead = true;
    const previouslyUnread = this.notifications.filter(n => !n.readStatus);
    previouslyUnread.forEach(n => n.readStatus = true);
    this.cdr.detectChanges();
    this.http.post(`${environment.apiUrl}/user/notifications/read-all`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.markingAllRead = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.markingAllRead = false;
        previouslyUnread.forEach(n => n.readStatus = false);
        this.cdr.detectChanges();
      }
    });
  }

  private navigateFor(n: ApiNotification): void {
    if (n.actionReferenceId == null) return;
    switch (n.actionScreen) {
      case 'SCREEN_ORDER_DETAIL':
        this.router.navigate(['/authed/school-store/my-orders'], { queryParams: { orderId: n.actionReferenceId } });
        break;
      case 'COURSE_LESSON':
        this.router.navigate(['/authed/academy/course', n.actionReferenceId]);
        break;
      default:
        break;
    }
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
