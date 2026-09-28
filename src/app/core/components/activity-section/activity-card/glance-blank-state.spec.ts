import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
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
import { GLANCE_BLANK_STATES, GlanceDailyData, GlanceTab } from './glance-blank-state';

describe('Home Today at a Glance Figma states', () => {
  const now = new Date(2026, 8, 28, 12).getTime();
  const active = { status: 'pending', endTimeStamp: now + 3600000 };
  const done = { status: 'COMPLETED', endTimeStamp: now - 3600000 };
  const passed = { status: 'pending', endTimeStamp: now - 3600000 };
  const empty = (): GlanceDailyData => ({ habits: [], tasks: [], planners: [] });

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(now);
    // Isolate the real component/template from account APIs and lifecycle polling.
    spyOn(ActivityCardComponent.prototype, 'ngOnInit');
    spyOn(ActivityCardComponent.prototype, 'ngOnChanges');
    spyOn(ActivityCardComponent.prototype, 'ngAfterViewInit');
    spyOn(ActivityCardComponent.prototype, 'ngOnDestroy');
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

  function render(tab: GlanceTab, data: GlanceDailyData) {
    const fixture = TestBed.createComponent(ActivityCardComponent);
    const c = fixture.componentInstance;
    c.mode = 'recent'; c.currentActive = tab; c.glanceDailyData = data;
    c.totalHabitsLoaded = data.habits.length; c.totalTasksLoaded = data.tasks.length;
    c.totalTimetablesLoaded = data.planners.length;
    c.totalHabitsCompleted = data.habits.filter(x => x.status === 'COMPLETED').length;
    c.totalTasksCompleted = data.tasks.filter(x => x.status === 'COMPLETED').length;
    fixture.nativeElement.style.display = 'block';
    fixture.nativeElement.style.width = '390px';
    fixture.detectChanges();
    return fixture;
  }

  const cases: Array<[string, GlanceTab, GlanceDailyData]> = [
    ['habits-empty', 'habits', empty()],
    ['habits-completed', 'habits', { ...empty(), habits: [done] }],
    ['habits-passed', 'habits', { ...empty(), habits: [passed] }],
    ['tasks-empty', 'tasks', empty()],
    ['tasks-completed', 'tasks', { ...empty(), tasks: [done] }],
    ['tasks-passed', 'tasks', { ...empty(), tasks: [passed] }],
    ['timetable-empty', 'timetable', empty()],
    ['all-empty', 'all', empty()],
    ['all-completed', 'all', { ...empty(), habits: [done], tasks: [done] }],
    ['all-passed', 'all', { ...empty(), habits: [passed], tasks: [passed] }],
    ['all-mixed-passed', 'all', { ...empty(), habits: [done], tasks: [passed] }]
  ];
  for (const [key, tab, data] of cases) {
    it(`renders only ${key}, its Figma copy, artwork and actions`, () => {
      const fixture = render(tab, data);
      const element = fixture.nativeElement as HTMLElement;
      expect(fixture.componentInstance.glanceBlankState?.key).toBe(key);
      expect(element.querySelectorAll('glance-blank-state').length).toBe(1);
      expect(element.querySelector('h4')?.textContent).toBe(GLANCE_BLANK_STATES[key].title);
      expect(element.querySelector('.art img')?.getAttribute('src')).toBe(GLANCE_BLANK_STATES[key].image);
      expect(element.querySelector('.primary')?.textContent).toBe(GLANCE_BLANK_STATES[key].primary);
      expect(element.querySelector('.primary--attention')).toBeTruthy();
      expect(element.querySelector('.secondary.primary--attention')).toBeNull();
      expect(element.querySelectorAll('[role="tab"]').length).toBe(tab === 'all' ? 0 : 4);
      const add = spyOn(fixture.componentInstance, 'openHabitInput');
      (element.querySelector('.primary') as HTMLButtonElement).click();
      expect(add).toHaveBeenCalledTimes(1);
      const secondary = element.querySelector('.secondary') as HTMLButtonElement;
      if (secondary) {
        const route = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        secondary.click();
        const calendar = GLANCE_BLANK_STATES[key].secondaryRoute === 'calendar';
        expect(route.calls.mostRecent().args[0]).toEqual([calendar ? '/authed/activity-calendar' : '/authed/activity-page']);
      }
    });
  }
  it('keeps All active when Habit is complete but Task is active', () => {
    expect(render('all', { ...empty(), habits: [done], tasks: [active] }).componentInstance.glanceBlankState).toBeNull();
  });
  it('keeps the highlighted Add CTA inside the card at mobile widths', () => {
    const f = render('all', empty());
    for (const width of [320, 360, 375, 390, 414, 430]) {
      f.nativeElement.style.width = `${width}px`;
      const card = f.nativeElement.querySelector('.glance-card') as HTMLElement;
      const button = f.nativeElement.querySelector('.primary--attention') as HTMLButtonElement;
      button.style.animation = 'none';
      const cardRect = card.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
      expect(buttonRect.left).toBeGreaterThanOrEqual(cardRect.left + 6);
      expect(buttonRect.right).toBeLessThanOrEqual(cardRect.right - 6);
      expect(getComputedStyle(button, '::before').pointerEvents).toBe('none');
      expect(getComputedStyle(button, '::after').pointerEvents).toBe('none');
    }
  });
  it('shows No Habit while Tasks exist, without claiming All is empty', () => {
    const f = render('habits', { ...empty(), tasks: [active] });
    expect(f.componentInstance.glanceBlankState?.key).toBe('habits-empty');
    f.componentInstance.currentActive = 'all';
    expect(f.componentInstance.glanceBlankState).toBeNull();
  });
  it('shows No Planner while Habits exist', () => {
    expect(render('timetable', { ...empty(), habits: [active] }).componentInstance.glanceBlankState?.key).toBe('timetable-empty');
  });
  it('keeps mixed completed/pending habits active', () => {
    expect(render('habits', { ...empty(), habits: [done, active] }).componentInstance.glanceBlankState).toBeNull();
  });
  it('uses passed, not completed, for mixed complete/past incomplete records', () => {
    expect(render('all', { ...empty(), habits: [done], tasks: [passed] }).componentInstance.glanceBlankState?.key).toBe('all-mixed-passed');
  });
  it('uses all daily records, including active items beyond the four-card limit', () => {
    expect(render('habits', { ...empty(), habits: [done, done, passed, passed, active] }).componentInstance.glanceBlankState).toBeNull();
  });
  it('preserves the exact five-minute grace boundary and seconds normalization', () => {
    const f = render('tasks', { ...empty(), tasks: [{ status: 'pending', endTimeStamp: (now - 300000) / 1000 }] });
    expect(f.componentInstance.glanceBlankState).toBeNull();
    f.componentInstance.glanceDailyData!.tasks[0].endTimeStamp -= .001;
    expect(f.componentInstance.glanceBlankState?.key).toBe('tasks-passed');
  });
  it('does not treat skipped tasks as completed', () => {
    expect(render('tasks', { ...empty(), tasks: [{ ...active, status: 'SKIPPED' }] }).componentInstance.glanceBlankState).toBeNull();
    expect(render('tasks', { ...empty(), tasks: [{ ...passed, status: 'SKIPPED' }] }).componentInstance.glanceBlankState?.key).toBe('tasks-passed');
  });
  it('keeps skipped habits visible after their end, as the Home list does', () => {
    expect(render('habits', { ...empty(), habits: [{ ...passed, status: 'SKIPPED' }] }).componentInstance.glanceBlankState).toBeNull();
  });
  it('shows Habit time Over for explicitly expired skipped habits hidden by Home', () => {
    const data = { ...empty(), habits: [{ ...passed, status: 'SKIPPED', today: true, expired: true }] };
    expect(render('habits', data).componentInstance.glanceBlankState?.key).toBe('habits-passed');
    expect(render('all', data).componentInstance.glanceBlankState?.key).toBe('all-passed');
  });
  it('keeps All active for an active planner even if Habit and Task are done', () => {
    const f = render('all', { ...empty(), habits: [done], tasks: [done], planners: [{type: 'timetable', endTime: '23:59'}] });
    spyOn(f.componentInstance, 'isGlancePlannerEntryPassed').and.returnValue(false);
    expect(f.componentInstance.glanceBlankState).toBeNull();
  });
  it('includes explicit planner completion in All completion', () => {
    expect(render('all', { ...empty(), habits: [done], planners: [{type: 'timetable', completed: true}] }).componentInstance.glanceBlankState?.key).toBe('all-completed');
  });
  it('includes passed planner slots in All, and keeps planner-tab cards', () => {
    const f = render('all', { ...empty(), planners: [{type: 'timetable', endTime: '01:00'}] });
    spyOn(f.componentInstance, 'isGlancePlannerEntryPassed').and.returnValue(true);
    expect(f.componentInstance.glanceBlankState?.key).toBe('all-passed');
    f.componentInstance.currentActive = 'timetable';
    expect(f.componentInstance.glanceBlankState).toBeNull();
  });
  it('does not display an empty state before daily data arrives or while planner loads', () => {
    const f = render('all', empty());
    f.componentInstance.glanceDailyData = null;
    expect(f.componentInstance.glanceBlankState).toBeNull();
    f.componentInstance.glanceDailyData = empty(); f.componentInstance.glancePlannerLoading = true;
    expect(f.componentInstance.glanceBlankState).toBeNull();
  });
  it('keeps existing active habit cards rendered', () => {
    const f = render('habits', { ...empty(), habits: [active] });
    f.componentInstance.hasHabits = true;
    f.componentInstance.recentHabits = [{ ...active, id: '1', title: 'Existing habit', type: 'habits' } as any];
    f.detectChanges();
    expect(f.nativeElement.querySelector('activity-card')).toBeTruthy();
    expect(f.nativeElement.querySelector('glance-blank-state')).toBeNull();
    expect(f.nativeElement.querySelector('.primary--attention')).toBeNull();
  });

  // Optional local visual runner: real Angular template/styles, no account writes.
  it('provides the eleven fixtures for optional browser comparison', async () => {
    expect(cases.length).toBe(11);
    if (!(window as any).__GLANCE_VISUAL__) return;
    let fixture: ReturnType<typeof render> | undefined;
    (window as any).renderGlanceVisual = (key: string, width = 390) => {
      fixture?.destroy();
      const selected = cases.find(item => item[0] === key)!;
      fixture = render(selected[1], selected[2]);
      fixture.nativeElement.style.width = `${width}px`;
      fixture.nativeElement.setAttribute('data-visual-fixture', key);
      document.body.style.margin = '0';
      document.body.style.background = '#f5f5f5';
      fixture.detectChanges();
    };
    await new Promise<void>(resolve => (window as any).finishGlanceVisual = resolve);
  }, 300000);
});
