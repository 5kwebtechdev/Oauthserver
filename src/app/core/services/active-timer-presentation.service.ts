import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const ActiveTimer = registerPlugin<{
  setSession(session: { title: string; endTime: number }): Promise<void>;
  clearSession(): Promise<void>;
}>('ActiveTimer');

/** Presentation only: completion and rewards remain owned by the existing timer. */
@Injectable({ providedIn: 'root' })
export class ActiveTimerPresentationService {
  private readonly notificationId = 19374021;
  private operations: Promise<void> = Promise.resolve();

  background(title: string, endTime: number): void {
    this.enqueue(async () => {
      if (Capacitor.getPlatform() !== 'ios' || endTime <= Date.now()) return;
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
      await LocalNotifications.schedule({ notifications: [{
        id: this.notificationId + 1, title: `${title} is running`,
        body: `Ends at ${new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Open SuperMe to return to your timer.`,
        extra: { activeTimerReminder: true }
      }] });
    });
  }

  foreground(): void {
    this.enqueue(async () => {
      if (Capacitor.getPlatform() !== 'ios') return;
      const delivered = await LocalNotifications.getDeliveredNotifications();
      await LocalNotifications.removeDeliveredNotifications({
        notifications: delivered.notifications.filter(item => item.id === this.notificationId + 1)
      });
    });
  }

  start(title: string, endTime: number): void {
    this.enqueue(async () => {
      if (endTime <= Date.now()) return;
      if (Capacitor.getPlatform() === 'android') {
        await ActiveTimer.setSession({ title, endTime });
      } else if (Capacitor.getPlatform() === 'ios') {
        // Respect the existing notification permission; timer startup never prompts.
        if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
        await LocalNotifications.schedule({ notifications: [{
          id: this.notificationId, title: `${title}: time finished`,
          body: 'Open SuperMe to continue your activity.',
          schedule: { at: new Date(endTime) },
          extra: { activeTimerReminder: true }
        }] });
      }
    });
  }

  stop(): void {
    this.enqueue(async () => {
      if (Capacitor.getPlatform() === 'android') await ActiveTimer.clearSession();
      if (Capacitor.getPlatform() === 'ios') {
        await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });
        const delivered = await LocalNotifications.getDeliveredNotifications();
        await LocalNotifications.removeDeliveredNotifications({
          notifications: delivered.notifications.filter(item => item.id === this.notificationId || item.id === this.notificationId + 1)
        });
      }
    });
  }

  private enqueue(operation: () => Promise<void>): void {
    this.operations = this.operations.then(operation).catch(error => {
      console.warn('Active timer presentation unavailable', error);
    });
  }
}
