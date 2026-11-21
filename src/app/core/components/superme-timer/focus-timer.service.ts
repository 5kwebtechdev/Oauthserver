import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MicroRewardService } from '../../services/micro-reward/micro-reward.service';
import { ModalController } from '@ionic/angular';
import { focusSchedule } from './timer-state';

/** One focus screen across Home, calendar, and detail entry points. */
@Injectable({ providedIn: 'root' })
export class FocusTimerService {
  private opening = false;
  constructor(
    private modals: ModalController,
    private readonly router?: Router,
    @Inject(DOCUMENT) private readonly document?: Document,
    private readonly auth?: AuthService,
    private readonly rewards?: MicroRewardService,
  ) {}

  async open(activity: any): Promise<boolean> {
    if (this.opening || !activity?.id || String(activity.status).trim().toLowerCase() !== 'ongoing') return false;
    this.opening = true;
    const user = this.auth?.getUserData();
    const child = String(user?.relationship).toUpperCase() === 'CHILD';
    if (child) this.rewards?.unlockSound();
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
      const view = this.document?.defaultView;
      if (data?.completed && child && view && this.document) {
        const home = this.router?.url.split(/[?#]/)[0].endsWith('/home');
        void this.rewards?.celebrate({
          from: new DOMRect(view.innerWidth / 2, view.innerHeight / 2, 0, 0),
          coins: Number(data.coinsAwarded ?? 0),
          balance: Number(user?.coins) || 0,
          screenCoin: home ? this.document.querySelector<HTMLElement>('.coin-pill-icon') : null,
          pill: home ? 'auto' : 'floating',
          confetti: 'both',
        }).catch(() => undefined);
      }
      return !!data?.completed;
    } finally { this.opening = false; }
  }
}
