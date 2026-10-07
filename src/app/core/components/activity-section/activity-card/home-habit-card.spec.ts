import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Subject } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { ActivityCardComponent } from './activity-card.component';
import { HabitCardService } from './activity-card.service';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { CalendarApi } from '../../../api/calendar.api';
import { AuthApi } from '../../../api/auth.api';
import { EventApi } from '../../../api/event.api';
import { CalendarService } from '../../../services/calendar.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileSelectorService } from '../../../services/profile-selector-service';
import { HabitService } from '../habit.service';
import { HabitButtonLogicService } from '../habit-button-logic.service';
import { AutoAbortService } from '../auto-abort.service';
import { FocusTimerService } from '../../superme-timer/focus-timer.service';
import { Habit } from '../habit.types';

describe('Compact Home Habit card', () => {
  let now: number;
  let clock: jasmine.Spy;
  beforeEach(async () => {
    const today = new Date();
    now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime();
    clock = spyOn(Date, 'now').and.returnValue(now);
    // Render the production template without fetching/mutating account data.
    for (const method of ['ngOnInit', 'ngOnChanges', 'ngAfterViewInit', 'ngOnDestroy'] as const) {
      spyOn(ActivityCardComponent.prototype, method);
    }
    TestBed.overrideProvider(ModalController, { useValue: {} });
    await TestBed.configureTestingModule({
      imports: [ActivityCardComponent],
      providers: [provideRouter([]), HabitButtonLogicService,
        { provide: HabitCardService, useValue: { lastToggled$: EMPTY } },
        ...[HabitApi, TaskApi, CalendarApi, AuthApi, EventApi, CalendarService, CustomToastService,
          UserService, AuthService, ProfileSelectorService, HabitService, AutoAbortService,
          FocusTimerService, ModalController, HttpClient].map(provide => ({ provide, useValue: {} })),
        { provide: HabitService, useValue: { formatDateToYYYYMMDD: HabitService.prototype.formatDateToYYYYMMDD } }]
    }).compileComponents();
  });

  function render(overrides: Partial<Habit> = {}, compact = true, task = false) {
    const fixture = TestBed.createComponent(ActivityCardComponent);
    const c = fixture.componentInstance;
    c.homeHabitCard = compact;
    c.homeTaskCard = task;
    c.habit = { id: 'test-habit', title: 'Reading', type: 'habits', status: 'pending',
      startTimeStamp: now, endTimeStamp: now + 3600000, tags: ['Fitness'],
      currentHabitStreak: 14, coinReward: 200, ...overrides } as Habit;
    c.startTime = c.habit.startTimeStamp; c.endTime = c.habit.endTimeStamp;
    c.isParent = false; c.isCurrentDateView = true;
    fixture.nativeElement.style.cssText = 'display:block;width:361px;max-width:100%;';
    fixture.detectChanges();
    return fixture;
  }
  function button(f: ComponentFixture<ActivityCardComponent>, name: string): HTMLButtonElement {
    return f.nativeElement.querySelector(`.compact-habit__${name}`);
  }

  it('renders dynamic title, category, streak, coins and compact actions without the old expanded content', () => {
    const f = render({ title: 'Sketching', tags: ['Creativity'], currentHabitStreak: 9, coinReward: 35 });
    expect(f.nativeElement.querySelector('h3').textContent).toBe('Sketching');
    expect(f.nativeElement.querySelector('.compact-habit__category').textContent).toBe('Creativity');
    expect(f.nativeElement.querySelector('[aria-label="9 day streak"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('[aria-label="35 coins"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('.habit-expandable-content')).toBeNull();
    expect(button(f, 'start').disabled).toBeFalse();
    expect(button(f, 'done').disabled).toBeTrue(); // Existing start-window rule.
  });
  for (const type of ['habits', 'tasks'] as const) {
    for (const duration of [3, 45] as const) {
      it(`keeps inner ${type} Done available after a ${duration}-minute schedule until midnight`, () => {
        const time = (timestamp: number) => {
          const date = new Date(timestamp);
          return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        };
        const f = render({ type, status: 'ongoing', startTimeStamp: now - (duration + 30) * 60_000,
          endTimeStamp: now - 30 * 60_000, startDate: '2020-01-01', endDate: '2020-01-01',
          startTime: time(now - (duration + 30) * 60_000), endTime: time(now - 30 * 60_000) } as unknown as Partial<Habit>, false);
        const c = f.componentInstance;
        const today = new Date(now);
        c.selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        spyOn<any>(c, 'hasOtherOngoingActivity').and.returnValue(true);
        expect(c.isDoneVisible()).toBeTrue();
        expect(c.isDoneEnabled()).toBeTrue();
        c.habit = { ...c.habit!, status: 'pending' } as Habit;
        expect(c.isDoneVisible()).toBeTrue();
        expect(c.isDoneEnabled()).toBeTrue();
        c.isCurrentDateView = false;
        expect(c.isDoneVisible()).toBeFalse();
        expect(c.isDoneEnabled()).toBeFalse();
      });
    }
  }
  it('routes one click to the existing start handler without opening the card', () => {
    const f = render();
    const start = spyOn(f.componentInstance, 'openStartPopup').and.callThrough();
    const details = spyOn<any>(f.componentInstance, 'openActivityDetail');
    button(f, 'start').click();
    expect(start).toHaveBeenCalledTimes(1);
    expect(f.componentInstance.showStartPopup).toBeTrue();
    expect(details).not.toHaveBeenCalled();
  });
  it('shows a live remaining time, existing progress, focus timer and abort for an ongoing habit', () => {
    const f = render({ status: 'ongoing', startTimeStamp: now - 600000, endTimeStamp: now + 910000 });
    const c = f.componentInstance;
    c.percentageCompleted = 40; c.showStartBubble = true; f.detectChanges();
    expect(f.nativeElement.querySelector('[role="timer"]').textContent).toBe('15:10 left');
    expect(f.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('40');
    clock.and.returnValue(now + 1000); f.detectChanges();
    expect(f.nativeElement.querySelector('[role="timer"]').textContent).toBe('15:09 left');
    expect(button(f, 'start')).toBeNull();
    expect(button(f, 'done').disabled).toBeFalse();
    const focus = spyOn(c, 'openTimer'); const abort = spyOn(c, 'openAbortPopup'); const done = spyOn(c, 'openCompletePopup');
    button(f, 'timer').click(); button(f, 'abort').click(); button(f, 'done').click();
    expect(focus).toHaveBeenCalledTimes(1); expect(abort).toHaveBeenCalledTimes(1); expect(done).toHaveBeenCalledTimes(1);
  });
  for (const type of ['habits', 'tasks'] as const) {
    it(`starts ${type} with inline progress and opens focus only from the timer icon`, fakeAsync(() => {
      const f = render({ type }, true, true);
      const c = f.componentInstance;
      const response = new Subject<any>();
      const api: any = type === 'tasks' ? TestBed.inject(TaskApi) : TestBed.inject(HabitApi);
      const start = jasmine.createSpy('start activity').and.returnValue(response);
      api[type === 'tasks' ? 'letsGoTask' : 'letsGoHabit'] = start;
      const habits = TestBed.inject(HabitService) as any;
      habits.updateHabit = jasmine.createSpy('updateHabit');
      habits.notifyTaskStarted = jasmine.createSpy('notifyTaskStarted');
      (TestBed.inject(AutoAbortService) as any).scheduleAutoAbort = jasmine.createSpy('scheduleAutoAbort');
      (TestBed.inject(CalendarService) as any).clearCache = jasmine.createSpy('clearCache');
      spyOn<any>(c, 'saveOngoingState');
      spyOn(c, 'loadHabits');
      spyOn(c, 'loadTodayTasks');
      const progress = spyOn(c, 'startProgress').and.callFake(() => { c.percentageCompleted = 25; });
      const focus = spyOn(c, 'openTimer');
      const details = spyOn<any>(c, 'openActivityDetail');

      button(f, 'start').click();
      c.handlePopupPrimary();
      expect(start).toHaveBeenCalledOnceWith('test-habit');
      expect(focus).not.toHaveBeenCalled();
      expect(c.getStatus()).toBe('pending');
      expect(c.showStartBubble).toBeFalse();
      response.next({});
      response.complete();
      f.detectChanges();
      expect(c.getStatus()).toBe('ongoing');
      expect(c.showStartBubble).toBeTrue();
      expect(f.nativeElement.querySelector('.compact-habit__hint')).toBeTruthy();
      expect(f.nativeElement.querySelector('.compact-habit__scheduled-time')).toBeNull();
      expect(progress).toHaveBeenCalledTimes(1);
      expect(f.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('25');
      expect(button(f, 'timer')).toBeTruthy();
      expect(focus).not.toHaveBeenCalled();
      (f.nativeElement.querySelector('.habit-wrapper') as HTMLElement).click();
      expect(focus).not.toHaveBeenCalled();
      expect(details).toHaveBeenCalledTimes(1);
      button(f, 'timer').click();
      expect(focus).toHaveBeenCalledTimes(1);
      expect(details).toHaveBeenCalledTimes(1);
      tick(9999);
      expect(c.showStartBubble).toBeTrue();
      expect(f.nativeElement.querySelector('.compact-habit__scheduled-time')).toBeNull();
      tick(1);
      expect(c.showStartBubble).toBeFalse();
      f.detectChanges();
      expect(f.nativeElement.querySelector('.compact-habit__hint')).toBeNull();
      expect(f.nativeElement.querySelector('.compact-habit__scheduled-time').textContent).toBe('12.00-13.00');
    }));
  }
  it('uses the focus timer occurrence instead of counting down an entire recurring series', () => {
    const f = render({ status: 'ongoing', everyday: true, startTime: '11:00', endTime: '13:00',
      startTimeStamp: now - 86400000, endTimeStamp: now + 30 * 86400000 });
    expect(f.componentInstance.habitRemainingLabel).toBe('60:00 left');
  });
  it('clamps finished remaining time at zero', () => {
    expect(render({ status: 'ongoing', startTimeStamp: now - 3600000, endTimeStamp: now - 1000 }).componentInstance.habitRemainingLabel).toBe('0:00 left');
  });
  it('formats actual schedule times in the Figma notation without changing their values', () => {
    const f = render({ startTime: '08:00:00', endTime: '09:15:00' });
    expect(f.nativeElement.querySelector('.compact-habit__time').textContent).toBe('8.00-9.15');
    expect(f.componentInstance.habit?.startTime).toBe('08:00:00');
  });
  for (const type of ['habits', 'tasks'] as const) {
    it(`shows the live time-until-start chip for an upcoming ${type}, then hides it at start`, () => {
      const f = render({ type, status: 'pending', startTimeStamp: now + 75 * 60000,
        endTimeStamp: now + 135 * 60000 }, true, type === 'tasks');
      expect(f.nativeElement.querySelector('.compact-habit__starts-in').textContent).toBe('In 1h 15 min');
      clock.and.returnValue(now + 74 * 60000);
      f.detectChanges();
      expect(f.nativeElement.querySelector('.compact-habit__starts-in').textContent).toBe('In 1 min');
      clock.and.returnValue(now + 75 * 60000);
      f.detectChanges();
      expect(f.nativeElement.querySelector('.compact-habit__starts-in')).toBeNull();
    });
  }
  it('keeps upcoming actions disabled using the existing button service', () => {
    const f = render({ startTimeStamp: now + 3600000, endTimeStamp: now + 7200000 });
    expect(button(f, 'start').disabled).toBeTrue(); expect(button(f, 'done').disabled).toBeTrue();
  });
  it('does not invent a new completion cutoff for time-gone habits', () => {
    const f = render({ startTimeStamp: now - 7200000, endTimeStamp: now - 3600000 });
    expect(button(f, 'start').disabled).toBeTrue();
    expect(button(f, 'done').disabled).toBeFalse(); // Existing pending-after-start completion rule.
  });
  for (const status of ['completed', 'skipped'] as const) {
    it(`keeps ${status} actions hidden`, () => {
      expect(render({ status }).nativeElement.querySelector('.compact-habit__actions')).toBeNull();
    });
  }
  it('keeps parent and non-current-date controls hidden', () => {
    const f = render(); f.componentInstance.isParent = true; f.detectChanges();
    expect(f.nativeElement.querySelector('.compact-habit__actions')).toBeNull();
    f.componentInstance.isParent = false; f.componentInstance.isCurrentDateView = false; f.detectChanges();
    expect(f.nativeElement.querySelector('.compact-habit__actions')).toBeNull();
  });
  it('does not change Task or non-Home Habit presentation', () => {
    expect(render({ type: 'tasks' }).nativeElement.querySelector('.compact-habit')).toBeNull();
    expect(render({}, false).nativeElement.querySelector('.compact-habit')).toBeNull();
  });
  for (const status of ['pending', 'ongoing', 'completed', 'skipped'] as const) {
    it(`reuses compact presentation and existing actions for Home Task ${status}`, () => {
      const f = render({ type: 'tasks', title: 'Finish homework', status, currentTaskStreak: 7 }, true, true);
      expect(f.nativeElement.querySelector('.habit-wrapper--compact-task')).toBeTruthy();
      expect(f.nativeElement.querySelector('h3').textContent).toBe('Finish homework');
      if (status === 'completed' || status === 'skipped') {
        expect(f.nativeElement.querySelector('.compact-habit__actions')).toBeNull();
      } else if (status === 'ongoing') {
        expect(f.nativeElement.querySelector('[aria-label="Task progress"]')).toBeTruthy();
        const focus = spyOn(f.componentInstance, 'openTimer');
        const abort = spyOn(f.componentInstance, 'openAbortPopup');
        const done = spyOn(f.componentInstance, 'openCompletePopup');
        button(f, 'timer').click(); button(f, 'abort').click(); button(f, 'done').click();
        expect(focus).toHaveBeenCalledTimes(1); expect(abort).toHaveBeenCalledTimes(1); expect(done).toHaveBeenCalledTimes(1);
      } else {
        expect(f.nativeElement.querySelector('[aria-label="7 day streak"]')).toBeTruthy();
        const start = spyOn(f.componentInstance, 'openStartPopup').and.callThrough();
        button(f, 'start').click(); expect(start).toHaveBeenCalledTimes(1);
        expect(f.componentInstance.showStartPopup).toBeTrue();
      }
    });
  }
  it('preserves upcoming and time-gone Task button rules', () => {
    const future = render({ type: 'tasks', startTimeStamp: now + 3600000, endTimeStamp: now + 7200000 }, true, true);
    expect(button(future, 'start').disabled).toBeTrue(); expect(button(future, 'done').disabled).toBeTrue();
    const past = render({ type: 'tasks', startTimeStamp: now - 7200000, endTimeStamp: now - 3600000 }, true, true);
    expect(button(past, 'start').disabled).toBeTrue(); expect(button(past, 'done').disabled).toBeFalse();
  });
  it('preserves long title and category text rather than truncating data', () => {
    const f = render({ title: 'Read a chapter and write a reflection', tags: ['Personal development and wellbeing'] });
    expect(f.nativeElement.querySelector('h3').textContent).toContain('write a reflection');
    expect(f.nativeElement.querySelector('.compact-habit__category').textContent).toContain('wellbeing');
  });

  for (const width of [260, 292, 326, 361, 390, 600]) {
    it(`keeps Habit and Task controls inside the card at ${width}px, including long names`, () => {
      const previousDisplay = document.body.style.display;
      document.body.style.display = 'block';
      try {
        for (const type of ['habits', 'tasks'] as const) {
        for (const status of ['pending', 'ongoing', 'completed'] as const) {
          const f = render({ type, status, title: 'Read a chapter and write a reflection', tags: ['Personal development and wellbeing'] }, true, true);
          f.nativeElement.style.width = `${width}px`;
          f.componentInstance.showStartBubble = true; f.detectChanges();
          const card: HTMLElement = f.nativeElement.querySelector('.habit-wrapper--compact');
          expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
          const bounds = card.getBoundingClientRect();
          for (const action of Array.from(card.querySelectorAll('.compact-habit__actions button'))) {
            const rect = action.getBoundingClientRect();
            expect(rect.right).toBeLessThanOrEqual(bounds.right);
            expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom);
            expect(rect.height).toBe(34);
          }
          f.destroy();
        }
        }
      } finally { document.body.style.display = previousDisplay; }
    });
  }

  // Optional manual visual QA using the actual component; never included in app builds.
  // Open /debug.html?homeHabitVisual=1, then click Finish visual check when done.
  if (new URLSearchParams(window.location.search).has('homeHabitVisual')) {
    it('visual comparison of every state', async () => {
      const previousDisplay = document.body.style.display;
      document.body.style.display = 'block';
      const board = document.createElement('div');
      board.id = 'habit-visual-board';
      board.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f6f5ff;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:16px;align-items:center;';
      document.body.appendChild(board);
      const variants: Array<[string, Partial<Habit>]> = [
        ['Ready', {}],
        ['Running', { status: 'ongoing', startTimeStamp: now - 600000, endTimeStamp: now + 910000 }],
        ['Disabled/upcoming', { startTimeStamp: now + 3600000, endTimeStamp: now + 7200000 }],
        ['Time gone (existing Done availability)', { startTimeStamp: now - 7200000, endTimeStamp: now - 3600000 }],
        ['Completed', { status: 'completed' }],
        ['Long names', { title: 'Read a chapter and write a reflection', tags: ['Personal development and wellbeing'] }]
      ];
      for (const [label, overrides] of variants) {
        const heading = document.createElement('strong'); heading.textContent = label; board.appendChild(heading);
        const task = new URLSearchParams(window.location.search).has('taskVisual');
        const f = render({ ...overrides, ...(task ? { type: 'tasks' as const, currentTaskStreak: 7 } : {}) }, true, task); f.componentInstance.showStartBubble = true;
        f.componentInstance.percentageCompleted = 40; f.detectChanges();
        f.nativeElement.removeAttribute('id'); board.appendChild(f.nativeElement);
      }
      await new Promise<void>(resolve => {
        const finish = document.createElement('button'); finish.textContent = 'Finish visual check';
        finish.style.cssText = 'padding:12px;background:white;border:1px solid purple;';
        finish.onclick = () => { board.remove(); document.body.style.display = previousDisplay; resolve(); }; board.appendChild(finish);
      });
    }, 600000);
  }
});
