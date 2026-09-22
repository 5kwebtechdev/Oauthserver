import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { focusSchedule } from './timer-state';

/** One focus screen across Home, calendar, and detail entry points. */
@Injectable({ providedIn: 'root' })
export class FocusTimerService {
  private opening = false;
  constructor(private modals: ModalController) {}

  async open(activity: any): Promise<boolean> {
    if (this.opening || !activity?.id || String(activity.status).trim().toLowerCase() !== 'ongoing') return false;
    this.opening = true;
    try {
      const { SupermeTimerComponent } = await import('./superme-timer.component');
      const schedule = focusSchedule(activity);
      const modal = await this.modals.create({
        id: 'activity-focus-timer', component: SupermeTimerComponent,
        cssClass: 'activity-focus-timer', backdropDismiss: false,
        componentProps: {
          title: activity.title || '', activityId: String(activity.id),
          activityType: activity.type === 'tasks' ? 'tasks' : 'habits',
          startTime: schedule.start, endTime: schedule.end
        }
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      return !!data?.completed;
    } finally { this.opening = false; }
  }
}
