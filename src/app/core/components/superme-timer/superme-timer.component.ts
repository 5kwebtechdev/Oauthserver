import { ChangeDetectorRef, Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { HabitApi } from '../../api/habit.api';
import { TaskApi } from '../../api/task.api';
import { HabitService } from '../activity-section/habit.service';
import { AutoAbortService } from '../activity-section/auto-abort.service';
import { BadgePopupService } from '../../services/badge-popup.service';
import { PetAgeService } from '../../services/pet-age.service';
import { CalendarService } from '../../services/calendar.service';
import { SupermePopupComponent, SupermePopupConfig } from '../superme-popup/superme-popup.component';
import { timerSnapshot } from './timer-state';

@Component({
  selector: 'app-superme-timer', standalone: true,
  templateUrl: './superme-timer.component.html', styleUrls: ['./superme-timer.component.scss'],
  imports: [IonicModule, CommonModule, SupermePopupComponent]
})
export class SupermeTimerComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() activityId = '';
  @Input() activityType: 'habits' | 'tasks' = 'habits';
  @Input() startTime = 0;
  @Input() endTime = 0;
  readonly assets = 'assets/figma/focus-timer/';
  readonly sounds = [
    { id: 'lofi', lines: ['Lo-Fi', 'Beats'], label: 'Lo-Fi Beats' },
    { id: 'ocean', lines: ['Ocean', 'Waves'], label: 'Ocean Waves' },
    { id: 'rain', lines: ['Rain', 'Drops'], label: 'Rain Drops' },
    { id: 'forest', lines: ['Forest', 'Ambience'], label: 'Forest Ambience' }
  ];
  remainingSeconds = 0;
  progress = 0;
  playingSound: string | null = null;
  audioError = '';
  completionError = '';
  busy = false;
  completed = false;
  confirmVisible = false;
  confirmConfig: SupermePopupConfig = {};
  private expired = false;
  private presented = false;
  private invalidSchedule = false;
  private destroyed = false;
  private frame = 0;
  private lastFrame = 0;
  private audio?: HTMLAudioElement;
  private soundRequest = 0;
  private appListener?: PluginListenerHandle;
  private visibility = () => {
    if (document.hidden) this.stopSound();
    else this.zone.run(() => this.tick());
  };

  constructor(private modal: ModalController, private router: Router,
    private zone: NgZone, private cd: ChangeDetectorRef,
    private habitApi: HabitApi, private taskApi: TaskApi, private habits: HabitService,
    private autoAbort: AutoAbortService, private badges: BadgePopupService,
    private petAge: PetAgeService, private calendar: CalendarService) {}

  get formattedTime(): string {
    return String(Math.floor(this.remainingSeconds / 60)).padStart(2, '0') + ':' + String(this.remainingSeconds % 60).padStart(2, '0');
  }
  get dotX(): number { return 126 + 118.5 * Math.sin(this.progress * 2 * Math.PI); }
  get dotY(): number { return 126 - 118.5 * Math.cos(this.progress * 2 * Math.PI); }
  get canRetryCompletion(): boolean { return this.expired && !this.busy && !this.completed; }

  ionViewDidEnter(): void {
    this.presented = true;
    this.tick();
    if (this.expired) void this.complete();
  }

  ngOnInit(): void {
    // Own expiry while open so a delayed abort cannot race completion on resume.
    this.autoAbort.cancelAutoAbort(this.activityId, this.activityType);
    this.tick();
    document.addEventListener('visibilitychange', this.visibility);
    void App.addListener('appStateChange', ({ isActive }) => {
      this.zone.run(() => { if (isActive) this.tick(); else this.stopSound(); });
    }).then(handle => { if (this.destroyed) void handle.remove(); else this.appListener = handle; })
      .catch(() => { /* Browser visibilitychange remains available. */ });
    this.zone.runOutsideAngular(() => {
      const animate = (now: number) => {
        if (this.destroyed) return;
        if (now - this.lastFrame >= 32 && !document.hidden) {
          this.lastFrame = now;
          this.zone.run(() => this.tick());
        }
        if (!this.expired && !this.invalidSchedule) this.frame = requestAnimationFrame(animate);
      };
      if (!this.expired && !this.invalidSchedule) this.frame = requestAnimationFrame(animate);
    });
  }

  private tick(): void {
    if (this.destroyed || this.expired) return;
    const snapshot = timerSnapshot(this.startTime, this.endTime, Date.now());
    if (!snapshot) {
      this.invalidSchedule = true;
      this.completionError = 'The activity schedule is unavailable. Please return and reopen the activity.';
      return;
    }
    this.remainingSeconds = snapshot.remainingSeconds;
    this.progress = snapshot.progress;
    this.cd.markForCheck();
    if (snapshot.finished) {
      this.expired = true;
      this.stopSound();
      if (this.presented) void this.complete();
    }
  }

  async toggleSound(id: string): Promise<void> {
    if (this.expired || this.invalidSchedule || !this.sounds.some(sound => sound.id === id)) return;
    if (this.playingSound === id) { this.stopSound(); return; }
    this.stopSound();
    const request = this.soundRequest;
    const audio = new Audio('assets/audio/focus/' + id + '.wav');
    audio.loop = true;
    audio.volume = 0.4;
    this.audio = audio;
    this.audioError = '';
    try {
      await audio.play();
      if (request !== this.soundRequest || this.destroyed) { audio.pause(); return; }
      this.playingSound = id;
    } catch {
      if (request === this.soundRequest) this.audioError = 'Unable to play this sound. Please try again.';
    }
    this.cd.markForCheck();
  }

  private stopSound(): void {
    this.soundRequest++;
    this.audio?.pause();
    if (this.audio) { this.audio.removeAttribute('src'); this.audio.load(); }
    this.audio = undefined;
    this.playingSound = null;
  }

  async complete(confirmed = false): Promise<void> {
    if (this.busy || this.completed || this.destroyed || !this.presented || !this.expired || !this.activityId) return;
    this.busy = true;
    this.confirmVisible = false;
    this.completionError = '';
    try {
      const result: any = await firstValueFrom(this.activityType === 'tasks'
        ? this.taskApi.completeTask(this.activityId, confirmed)
        : this.habitApi.completeHabit(this.activityId, confirmed));
      if (result?.requiresConfirmation) {
        this.confirmConfig = {
          image: 'assets/Images-Transparent/Image-Home-GreatWork.webp', heading: 'Daily Coin Limit Reached',
          subtitle: result.message || 'Mark this activity complete without additional coins?',
          primaryCTA: { text: 'Yes, mark complete', buttonStyle: 'green', buttonMedium: true },
          secondaryCTA: { text: 'Cancel', buttonStyle: 'bronze-transparent', buttonMedium: true },
          showCloseButton: false, backdrop: true, ctaDirection: 'row'
        };
        this.confirmVisible = true;
        return;
      }
      this.completed = true;
      localStorage.removeItem('ongoing_' + this.activityType + '_' + this.activityId);
      this.autoAbort.cancelAutoAbort(this.activityId, this.activityType);
      this.calendar.clearCache();
      this.taskApi.clearCache();
      if (this.activityType === 'tasks') this.habits.notifyTaskCompleted();
      else this.habits.completeHabit(this.activityId);
      this.petAge.recordActivity(this.activityType);
      await this.modal.dismiss({ completed: true }, 'completed');
      this.badges.check();
    } catch {
      this.completionError = 'Your timer has finished, but completion could not be saved. Please try again.';
    } finally {
      this.busy = false;
      if (!this.destroyed) this.cd.markForCheck();
    }
  }

  cancelConfirmation(): void {
    this.confirmVisible = false;
    this.completionError = 'Completion has not been saved. You can try again or return home.';
  }

  async onBack(home = false): Promise<void> {
    if (this.busy) return;
    this.stopSound();
    await this.modal.dismiss();
    if (home) await this.router.navigate(['/home']);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('visibilitychange', this.visibility);
    void this.appListener?.remove();
    this.stopSound();
    if (!this.completed && this.endTime > Date.now()) {
      this.autoAbort.scheduleAutoAbort({ id: this.activityId, type: this.activityType, endTimeStamp: this.endTime });
    }
  }
}
