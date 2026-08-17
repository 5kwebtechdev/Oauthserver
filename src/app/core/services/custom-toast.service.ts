import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'default';

export interface Toast {
  message: string;
  type: ToastType;
  visible: boolean;
  duration?: number;
  variant?: 'insufficient-coins';
  iconPath?: string;
  iconColor?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomToastService {
  private subject = new BehaviorSubject<Toast | null>(null);
  toast$: Observable<Toast | null> = this.subject.asObservable();

  private hideTimer: any = null;

  show(message: string, type: ToastType = 'default', duration = 3000): void {
    this.clearTimer();
    const variant = type === 'error' && /insufficient\s+coins?/i.test(message)
      ? 'insufficient-coins'
      : undefined;
    // An insufficient-balance message needs a conscious acknowledgement; it
    // should not disappear while the user is deciding what to do next.
    const resolvedDuration = variant ? 0 : duration;
    const toast: Toast = { message, type, visible: true, duration: resolvedDuration, variant };
    this.subject.next(toast);
    if (resolvedDuration > 0) {
      this.hideTimer = setTimeout(() => this.hide(), resolvedDuration);
    }
  }

  showWithIcon(message: string, type: ToastType = 'default', iconPath: string, iconColor: string = '#2D6830', duration = 3000): void {
    this.clearTimer();
    const toast: Toast = { message, type, visible: true, duration, iconPath, iconColor };
    this.subject.next(toast);
    if (duration > 0) {
      this.hideTimer = setTimeout(() => this.hide(), duration);
    }
  }

  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  successWithIcon(message: string, iconPath: string, iconColor: string = '#2D6830', duration = 3000): void {
    this.showWithIcon(message, 'success', iconPath, iconColor, duration);
  }

  error(message: string, duration = 3000): void {
    this.show(message, 'error', duration);
  }

  hide(): void {
    this.clearTimer();
    const current = this.subject.getValue();
    if (current) {
      this.subject.next({ ...current, visible: false });
      // clear after short delay so template can animate/hide if needed
      setTimeout(() => this.subject.next(null), 200);
    }
  }

  private clearTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
