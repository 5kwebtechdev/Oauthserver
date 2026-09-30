// Optional isolated visual fixture: run only this spec with Karma in watch mode,
// then open /debug.html?focus-preview=1. No production route or real API is used.
import { TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { SupermeTimerComponent } from './superme-timer.component';
import { HabitApi } from '../../api/habit.api';
import { TaskApi } from '../../api/task.api';
import { HabitService } from '../activity-section/habit.service';
import { AutoAbortService } from '../activity-section/auto-abort.service';
import { BadgePopupService } from '../../services/badge-popup.service';
import { PetAgeService } from '../../services/pet-age.service';
import { CalendarService } from '../../services/calendar.service';

if (new URLSearchParams(location.search).has('focus-preview')) {
  describe('Focus timer visual fixture', () => {
    it('renders the actual component with mock activity data', async () => {
      const noop = () => {};
      await TestBed.configureTestingModule({
        teardown: { destroyAfterEach: false },
        imports: [SupermeTimerComponent, IonicModule.forRoot()],
        providers: [
          { provide: ModalController, useValue: { dismiss: async () => true } },
          { provide: Router, useValue: { navigate: async () => true } },
          { provide: HabitApi, useValue: { completeHabit: () => of({}) } },
          { provide: TaskApi, useValue: { completeTask: () => of({}), clearCache: noop } },
          { provide: HabitService, useValue: { completeHabit: noop, notifyTaskCompleted: noop } },
          { provide: AutoAbortService, useValue: { cancelAutoAbort: noop, scheduleAutoAbort: noop } },
          { provide: BadgePopupService, useValue: { check: noop } },
          { provide: PetAgeService, useValue: { recordActivity: noop, getCurrentPetType: () => 'panda' } },
          { provide: CalendarService, useValue: { clearCache: noop } }
        ]
      }).overrideProvider(ModalController, { useValue: { dismiss: async () => true } }).compileComponents();
      const fixture = TestBed.createComponent(SupermeTimerComponent);
      const now = Date.now();
      Object.assign(fixture.componentInstance, { title: 'Reading', activityId: 'visual-only', startTime: now - 900000, endTime: now + 2700000 });
      Object.assign(fixture.nativeElement.style, { position: 'fixed', inset: '0', display: 'block', zIndex: '99999', background: '#fff' });
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      fixture.componentInstance.ionViewDidEnter();
      fixture.autoDetectChanges();
      expect(fixture.nativeElement.querySelectorAll('.sound').length).toBe(4);
    });
  });
}
