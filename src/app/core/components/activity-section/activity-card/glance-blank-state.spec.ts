import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EMPTY, of } from 'rxjs';
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
import { GlanceBlankStateComponent } from './glance-blank-state.component';

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
    TestBed.overrideProvider(ProfileSelectorService, { useValue: { getSelectedChild: () => ({ name: 'Mira' }) } });
    await TestBed.configureTestingModule({
      imports: [ActivityCardComponent, GlanceBlankStateComponent],
      providers: [provideRouter([]), HabitButtonLogicService,
        { provide: HabitCardService, useValue: { lastToggled$: EMPTY } },
        ...[HabitApi, TaskApi, CalendarApi, AuthApi, EventApi, CalendarService, CustomToastService,
          UserService, AuthService, ProfileSelectorService, HabitService, AutoAbortService,
          FocusTimerService, ModalController, HttpClient].map(provide => ({ provide, useValue: {} })),
        { provide: AuthService, useValue: { isParentUser: () => false } },
        { provide: EventApi, useValue: { getCachedEvent: () => null } },
        { provide: HabitService, useValue: { formatDateToYYYYMMDD: HabitService.prototype.formatDateToYYYYMMDD } }]
    }).compileComponents();
  });

  function render(tab: GlanceTab, data: GlanceDailyData) {
    const fixture = TestBed.createComponent(ActivityCardComponent);
    const c = fixture.componentInstance;
    c.mode = 'recent'; c.currentActive = tab; c.glanceDailyData = data;
    c.glancePlannerLoaded = true;
    c.totalHabitsLoaded = data.habits.length; c.totalTasksLoaded = data.tasks.length;
    c.totalTimetablesLoaded = data.planners.length;
    c.totalHabitsCompleted = data.habits.filter(x => x.status === 'COMPLETED').length;
    c.totalTasksCompleted = data.tasks.filter(x => x.status === 'COMPLETED').length;
    fixture.nativeElement.style.display = 'block';
    fixture.nativeElement.style.width = '390px';
    fixture.detectChanges();
    return fixture;
  }

  it('hides the previous tab image until the newly selected image loads', () => {
    const f = TestBed.createComponent(GlanceBlankStateComponent);
    const c = f.componentInstance;
    c.state = GLANCE_BLANK_STATES['habits-passed'];
    f.detectChanges();
    const image = f.nativeElement.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('load'));
    f.detectChanges();
    expect(image.style.visibility).toBe('visible');

    c.state = GLANCE_BLANK_STATES['tasks-empty'];
    f.detectChanges();
    expect(image.style.visibility).toBe('hidden');
    expect(f.nativeElement.textContent).toContain('No tasks lined up for today!');
    image.dispatchEvent(new Event('load'));
    f.detectChanges();
    expect(image.style.visibility).toBe('visible');
    expect(image.src).toContain('tasks.png');
  });

  it('keeps empty-state art and copy synchronized during rapid tab switches', () => {
    const f = render('all', empty());
    const expected: Array<[GlanceTab, string, string]> = [
      ['all', 'all-empty', 'Your day is wide open'],
      ['habits', 'habits-empty', 'No habits lined up for today!'],
      ['tasks', 'tasks-empty', 'No tasks lined up for today!'],
      ['timetable', 'timetable-empty', 'No Plan lined up for today!'],
      ['all', 'all-empty', 'Your day is wide open']
    ];
    for (const [tab, key, title] of expected) {
      f.componentInstance.switchTab(tab);
      f.detectChanges();
      const state = f.nativeElement.querySelector(`.blank[data-blank-state="${key}"]`);
      expect(state).withContext(tab).toBeTruthy();
      expect(state.textContent).withContext(tab).toContain(title);
      const image = state.querySelector('img') as HTMLImageElement;
      expect(image.src).withContext(tab).toContain(GLANCE_BLANK_STATES[key].image);
    }
  });

  it('shows Figma Parent copy for only the three empty category tabs', () => {
    const f = render('habits', empty());
    const c = f.componentInstance;
    c.isParent = true;
    const expected = [
      ['habits', 'habits.png', 'Mira\nhas no habits today!', 'Habits help build consistency and good routines. Add one to get Mira started.', 'Add a Habit'],
      ['tasks', 'tasks.png', 'Mira\nhas no tasks today!', 'Tasks help Mira stay organized and focused. Add one to keep the day on track.', 'Add a Task'],
      ['timetable', 'planner.png', 'Mira\nhas no plans today!', 'Plans help Mira manage time better. Add one to keep the day structured.', 'Add a Plan']
    ] as const;
    for (const [tab, image, heading, description, cta] of expected) {
      c.currentActive = tab;
      f.detectChanges();
      const blank = f.nativeElement.querySelector('glance-blank-state') as HTMLElement;
      expect(blank.querySelector('h4')?.textContent).toBe(heading);
      expect(blank.querySelector('p')?.textContent).toBe(description);
      expect(blank.querySelector('img')?.getAttribute('src')).toContain(image);
      expect(blank.textContent).toContain(cta);
    }
    c.currentActive = 'all';
    expect(c.glanceBlankState?.title).toBe('Your day is wide open');
    c.isParent = false;
    c.currentActive = 'habits';
    expect(c.glanceBlankState?.title).toBe('No habits lined up for today!');
  });

  it('keeps Parent category blank states within mobile widths', () => {
    const f = render('habits', empty());
    const c = f.componentInstance;
    c.isParent = true;
    for (const width of [360, 375, 390, 414]) {
      f.nativeElement.style.width = `${width}px`;
      for (const tab of ['habits', 'tasks', 'timetable'] as GlanceTab[]) {
        c.currentActive = tab;
        f.detectChanges();
        const blank = f.nativeElement.querySelector('.blank') as HTMLElement;
        expect(blank.scrollWidth).withContext(`${tab} at ${width}px`).toBeLessThanOrEqual(blank.clientWidth);
      }
    }
  });

  it('uses the same Planner summary label and count in every tab and blank state', () => {
    const f = render('all', { habits: [active], tasks: [], planners: [] });
    const c = f.componentInstance;
    for (const tab of ['all', 'habits', 'tasks', 'timetable'] as GlanceTab[]) {
      c.currentActive = tab;
      f.detectChanges();
      expect(c.glanceSubtitle).toBe('1 Habit • 0 Tasks • 0 Planners');
      expect(f.nativeElement.textContent).not.toContain('Time Tables');
    }
    c.totalTimetablesLoaded = 1;
    f.detectChanges();
    expect(c.glanceSubtitle).toBe('1 Habit • 0 Tasks • 1 Planner');
  });

  it('keeps every tab in loading until daily and planner responses are ready', () => {
    const f = render('all', empty());
    const c = f.componentInstance;
    c.glanceLoading = true;
    for (const tab of ['all', 'habits', 'tasks', 'timetable'] as GlanceTab[]) {
      c.currentActive = tab;
      f.detectChanges();
      expect(c.glanceBlankState).toBeNull();
      expect(f.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
      expect(f.nativeElement.querySelector('glance-blank-state')).toBeNull();
    }
    c.glanceLoading = false;
    c.glancePlannerLoading = true;
    expect(c.glanceBlankState).toBeNull();
    c.glancePlannerLoading = false;
    c.currentActive = 'all';
    expect(c.glanceBlankState?.key).toBe('all-empty');
  });

  it('does not treat a failed refresh as a confirmed empty day', () => {
    const f = render('all', empty());
    f.componentInstance.glanceLoadError = true;
    f.detectChanges();
    expect(f.componentInstance.glanceBlankState).toBeNull();
    expect(f.nativeElement.textContent).toContain("Couldn't load today's activities");
  });

  it('resolves completed data after refreshing without displaying general empty art', () => {
    const f = render('all', empty());
    const c = f.componentInstance;
    c.glanceLoading = true;
    expect(c.glanceBlankState).toBeNull();
    c.glanceDailyData = { habits: [done], tasks: [done], planners: [] };
    expect(c.glanceBlankState).toBeNull();
    c.glanceLoading = false;
    expect(c.glanceBlankState?.key).toBe('all-completed');
  });

  it('applies Home CTA boundaries and removes expired rows from All and category lists', () => {
    const c = render('all', empty()).componentInstance;
    spyOn(c as any, 'hasOtherOngoingActivity').and.returnValue(false);
    c.homeTiming = true;
    for (const type of ['habits', 'tasks'] as const) {
      const activity = { id: 'timing', type, status: 'pending', startTimeStamp: now,
        endTimeStamp: now + 75 * 60_000 } as any;
      c.habit = activity;
      c.recentHabits = type === 'habits' ? [activity] : [];
      c.recentTasks = type === 'tasks' ? [activity] : [];
      for (const [offset, visible, go, done] of [
        [-600001, true, false, false], [-600000, true, true, false],
        [-480000, true, true, false],
        [599999, true, true, false], [600000, true, false, true],
        [4499999, true, false, true], [4500000, false, false, false]
      ] as const) {
        (Date.now as jasmine.Spy).and.returnValue(now + offset);
        expect(c.isLetsGoEnabled()).toBe(go);
        expect(c.isDoneEnabled()).toBe(done);
        expect(c.combinedAndSortedItems.length).toBe(visible ? 1 : 0);
        expect((type === 'habits' ? c.filteredRecentHabits : c.filteredRecentTasks).length).toBe(visible ? 1 : 0);
      }
      (c as any).hasOtherOngoingActivity.and.returnValue(true);
      (Date.now as jasmine.Spy).and.returnValue(now + 20 * 60_000);
      expect(c.isDoneEnabled()).toBeTrue();
      activity.status = 'ongoing';
      expect(c.isDoneEnabled()).toBeTrue();
      activity.status = 'pending';
      (c as any).hasOtherOngoingActivity.and.returnValue(false);
      activity.status = 'completed';
      (Date.now as jasmine.Spy).and.returnValue(now + 600000);
      expect(c.isDoneEnabled()).toBeFalse();
      expect(c.combinedAndSortedItems.length).toBe(0);
    }
  });

  it('enables Done immediately for running short and long Home activities until card expiry', () => {
    const c = render('all', empty()).componentInstance;
    c.homeTiming = true;
    for (const type of ['habits', 'tasks'] as const) {
      for (const duration of [3, 15] as const) {
        const activity = { id: `${type}-${duration}`, type, status: 'pending',
          startTimeStamp: now, endTimeStamp: now + duration * 60_000 } as any;
        c.habit = activity;
        c.recentHabits = type === 'habits' ? [activity] : [];
        c.recentTasks = type === 'tasks' ? [activity] : [];
        (Date.now as jasmine.Spy).and.returnValue(now);
        expect(c.isDoneEnabled()).toBeFalse();
        activity.status = 'ongoing';
        (Date.now as jasmine.Spy).and.returnValue(now - 1);
        expect(c.isDoneEnabled()).toBeFalse();
        for (const offset of [0, duration * 60_000 - 1] as const) {
          (Date.now as jasmine.Spy).and.returnValue(now + offset);
          expect(c.isDoneEnabled()).withContext(`${type} ${duration}m at ${offset}ms`).toBeTrue();
          expect(c.combinedAndSortedItems.length).toBe(1);
        }
        (Date.now as jasmine.Spy).and.returnValue(now + duration * 60_000);
        expect(c.isDoneEnabled()).toBeFalse();
        expect(c.combinedAndSortedItems.length).toBe(0);
      }
    }
  });

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
      expect(element.querySelectorAll('[role="tab"]').length).toBe(4);
      const add = spyOn(fixture.componentInstance, 'openHabitInput');
      (element.querySelector('.primary') as HTMLButtonElement).click();
      expect(add).toHaveBeenCalledTimes(1);
      const secondary = element.querySelector('.secondary') as HTMLButtonElement;
      if (secondary) {
        const route = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        secondary.click();
        const calendar = GLANCE_BLANK_STATES[key].secondaryRoute === 'calendar';
        expect(route.calls.mostRecent().args[0]).toEqual(['/authed/activity-page']);
        if (calendar) {
          expect(route).toHaveBeenCalledOnceWith(['/authed/activity-page'], { queryParams: { tab: 'all' } });
        }
      }
    });
  }
  it('keeps All active when Habit is complete but Task is active', () => {
    expect(render('all', { ...empty(), habits: [done], tasks: [active] }).componentInstance.glanceBlankState).toBeNull();
  });
  it('keeps the highlighted Add CTA inside the card at mobile widths', () => {
    const f = render('all', empty());
    // Geometry needs a visible, attached host in the headless test runner.
    document.body.appendChild(f.nativeElement);
    const bodyDisplay = document.body.style.display;
    document.body.style.display = 'block';
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
    document.body.style.display = bodyDisplay;
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
  it('keeps the updated Planner artwork and both actions readable at mobile widths', async () => {
    const f = render('timetable', empty());
    const host = f.nativeElement as HTMLElement;
    const bodyDisplay = document.body.style.display;
    document.body.style.display = 'block';
    document.body.appendChild(host);
    try {
      const art = host.querySelector('.art') as HTMLElement;
      const image = art.querySelector('img')!;
      await image.decode();
      expect(image.naturalWidth).toBeGreaterThan(0);
      expect(host.querySelector('.secondary')?.textContent).toBe('View Calendar');
      for (const width of [320, 360, 375, 390, 414, 430]) {
        host.style.width = `${width}px`;
        const card = host.querySelector('.glance-card') as HTMLElement;
        const actions = host.querySelector('.actions') as HTMLElement;
        const primary = host.querySelector('.primary') as HTMLElement;
        const secondary = host.querySelector('.secondary') as HTMLElement;
        expect(card.clientWidth).toBeGreaterThan(0);
        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
        expect(art.getBoundingClientRect().width).toBeLessThanOrEqual(card.clientWidth);
        expect(primary.getBoundingClientRect().left).toBeGreaterThanOrEqual(secondary.getBoundingClientRect().right);
        expect(actions.scrollWidth).toBeLessThanOrEqual(actions.clientWidth);
        expect(getComputedStyle(primary).backgroundColor).toBe('rgb(110, 158, 162)');
        expect(getComputedStyle(primary).animationName).toBe('none');
      }
    } finally {
      host.remove();
      document.body.style.display = bodyDisplay;
    }
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
  it('hides at the exact scheduled end boundary with seconds normalization', () => {
    const f = render('tasks', { ...empty(), tasks: [{ status: 'pending', endTimeStamp: (now + 1) / 1000 }] });
    expect(f.componentInstance.glanceBlankState).toBeNull();
    f.componentInstance.glanceDailyData!.tasks[0].endTimeStamp -= .001;
    expect(f.componentInstance.glanceBlankState?.key).toBe('tasks-passed');
  });
  it('does not treat skipped tasks as completed', () => {
    expect(render('tasks', { ...empty(), tasks: [{ ...active, status: 'SKIPPED' }] }).componentInstance.glanceBlankState).toBeNull();
    expect(render('tasks', { ...empty(), tasks: [{ ...passed, status: 'SKIPPED' }] }).componentInstance.glanceBlankState?.key).toBe('tasks-passed');
  });
  it('shows time over for skipped habits after the Home deadline', () => {
    expect(render('habits', { ...empty(), habits: [{ ...passed, status: 'SKIPPED' }] }).componentInstance.glanceBlankState?.key).toBe('habits-passed');
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
  it('shows a calendar timetable in Planner, not Upcoming Events, despite an EVENT label', () => {
    const f = render('timetable', empty());
    const c = f.componentInstance;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const viva = {
      id: 42, type: 'EVENT', title: 'Viva', startDate: date, endDate: date,
      activities: [{ name: 'Viva', startTime: '00:00', endTime: '23:59' }]
    };
    (c as any).calendarService = { getUserPlannerCalendarMonth: () => of({ events: [viva] }) };
    (c as any).eventApi = { getEvents: () => of([]), getCachedEvent: () => null };

    c.loadGlancePlannerCards(true);

    expect(c.glancePlannerCards.length).toBe(1);
    expect(c.glanceUpcomingEvents.length).toBe(0);
    expect(c.glanceBlankState).toBeNull();

    const emptyRowsViva = {
      ...viva, activities: [], eventDate: date, eventType: 'OTHER', startTime: '00:00', endTime: '23:59'
    };
    (c as any).calendarService = { getUserPlannerCalendarMonth: () => of({ events: [emptyRowsViva] }) };
    c.loadGlancePlannerCards(true);
    expect(c.glancePlannerCards.length).toBe(1);
    expect(c.glanceUpcomingEvents.length).toBe(0);
    expect(c.glanceBlankState).toBeNull();

    const flatViva: any = { ...emptyRowsViva };
    delete flatViva.activities;
    (c as any).calendarService = { getUserPlannerCalendarMonth: () => of({ events: [flatViva] }) };
    c.loadGlancePlannerCards(true);
    expect(c.glancePlannerCards.length).toBe(1);
    expect(c.glanceUpcomingEvents.length).toBe(0);
    expect(c.glanceBlankState).toBeNull();

    // A genuinely separate Event with the same name must remain an Event.
    (c as any).eventApi = { getEvents: () => of([{
      id: 99, name: 'Viva', eventDate: date, eventType: 'OTHER', isPrivate: false, allDay: false,
      startTime: '12:00', endTime: '13:00'
    }]), getCachedEvent: () => null };
    c.loadGlancePlannerCards(true);
    expect(c.glancePlannerCards.length).toBe(1);
    expect(c.glanceUpcomingEvents.length).toBe(1);

    c.glancePlannerRaw = [];
    c.totalTimetablesLoaded = 1;
    expect(c.glanceSubtitle).toMatch(/1 (Planner|Time Table)/);
  });
  it('shows Upcoming Event cards without swipe-delete controls', () => {
    const f = render('all', empty());
    const c = f.componentInstance;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    (c as any).eventApi = { getCachedEvent: () => null };
    c.glanceUpcomingEventRaw = [{ id: 7, name: 'Birthday', eventDate: date, eventType: 'BIRTHDAY', isPrivate: false, allDay: true }];
    const open = spyOn(c, 'onUpcomingEventTap');
    f.detectChanges();

    const eventCard: HTMLButtonElement = f.nativeElement.querySelector('.glance-event-card');
    expect(eventCard).toBeTruthy();
    const viewAll: HTMLButtonElement = f.nativeElement.querySelector('.glance-upcoming .glance-outline-button');
    expect(viewAll).toBeTruthy();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    viewAll.click();
    expect(navigate).toHaveBeenCalledOnceWith(['/events-list'], {
      state: { origin: TestBed.inject(Router).url, childId: null, calendarEvents: [] }
    });
    expect(f.nativeElement.querySelector('[aria-label="Delete event"]')).toBeNull();
    eventCard.click();
    expect(open).toHaveBeenCalledOnceWith(jasmine.objectContaining({ id: 7 }));
  });
  it('shows events through day 30 across a month boundary, but not day 31', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 9, 20, 12));
      const c = render('all', empty()).componentInstance;
      c.glanceUpcomingEventRaw = [
        { id: 1, name: 'Today', eventDate: '2026-10-20' },
        { id: 2, name: 'Next month', eventDate: '2026-11-01' },
        { id: 3, name: 'Day 30', eventDate: '2026-11-19' },
        { id: 4, name: 'Day 31', eventDate: '2026-11-20' },
        { id: 5, name: 'Yesterday', eventDate: '2026-10-19' }
      ];
      expect(c.glanceUpcomingEvents.map(event => event.name)).toEqual(['Today', 'Next month', 'Day 30']);
    } finally {
      jasmine.clock().uninstall();
    }
  });
  it('shows a selected child’s next-month Planner event on parent Home', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 9, 20, 12));
      const c = render('all', empty()).componentInstance;
      c.mode = 'list';
      c.isParentOverride = true;
      const requests: string[] = [];
      (c as any).calendarService = { getUserPlannerCalendarMonth: (date: string) => {
        requests.push(date);
        return of({ events: date.startsWith('2026-11') ? [{
          id: 52, plannerType: 'EVENT', title: 'Dad’s Birthday', startDate: '2026-11-01',
          endDate: '2026-11-01', activities: []
        }] : [] });
      } };
      (c as any).eventApi = { getEvents: () => of([]), getCachedEvent: () => null };

      c.loadGlancePlannerCards(true);

      expect(requests).toEqual(['2026-10-20', '2026-11-01']);
      expect(c.glanceUpcomingEvents.map(event => event.name)).toEqual(['Dad’s Birthday']);
      expect(c.glancePlannerCards.length).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });
  it('finds the next monthly and yearly occurrence beyond the current month', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 11, 20, 12));
      const c = render('all', empty()).componentInstance;
      c.glanceUpcomingEventRaw = [
        { id: 1, name: 'Monthly', eventDate: '2025-01-05', recurrence: 'MONTHLY' },
        { id: 2, name: 'Yearly', eventDate: '2024-01-10', recurrence: 'YEARLY' }
      ];
      expect(c.glanceUpcomingEvents.map(event => event.name)).toEqual(['Monthly', 'Yearly']);
    } finally {
      jasmine.clock().uninstall();
    }
  });
  it('keeps confirmed personal Events out of Planner cards and count', () => {
    const c = render('timetable', empty()).componentInstance;
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const planner = { id: 1, type: 'TIMETABLE', title: 'PlannerOneUpdated', startDate: date, endDate: date,
      activities: [{ title: 'Entries', startTime: '18:18', endTime: '18:20' }] };
    const birthday = { id: 2, type: 'EVENT', title: 'Birthday', startDate: date, endDate: date,
      startTime: '00:00', endTime: '23:59', activities: [] };
    const sasa = { id: 3, type: 'EVENT', title: 'sasa', startDate: date, endDate: date,
      startTime: '18:30', endTime: '18:32', activities: [] };
    (c as any).calendarService = { getUserPlannerCalendarMonth: () => of({ events: [planner, birthday, sasa] }) };
    (c as any).eventApi = { getEvents: () => of([
      { id: 2, name: 'Birthday', eventDate: date, eventType: 'BIRTHDAY', isPrivate: false, allDay: true },
      { id: 3, name: 'sasa', eventDate: date, eventType: 'OTHER', isPrivate: false, allDay: false,
        startTime: '18:30', endTime: '18:32' }
    ]), getCachedEvent: () => null };
    c.totalTimetablesLoaded = 3;

    c.loadGlancePlannerCards(true);

    expect(c.glancePlannerCards.map(card => card.source.title)).toEqual(['PlannerOneUpdated']);
    expect(c.glanceUpcomingEvents.map(event => event.name)).toEqual(['Birthday', 'sasa']);
    expect(c.glanceSubtitle).toContain('1 Planner');
  });
  it('fully closes a timetable card and reopens its entries from the header', () => {
    const f = render('all', empty());
    const c = f.componentInstance;
    c.glancePlannerRaw = [{ id: 91, type: 'TIMETABLE', title: 'Sports',
      startDate: '2020-01-01', endDate: '2030-12-31', everyday: true,
      activities: [{ title: 'Pickleball', startTime: '19:00', endTime: '20:45' }] }];
    f.detectChanges();
    const header = f.nativeElement.querySelector('.glance-planner-card__header') as HTMLButtonElement;
    expect(header).toBeTruthy();
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(f.nativeElement.querySelectorAll('.glance-planner-entry').length).toBe(1);
    header.click();
    f.detectChanges();
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(f.nativeElement.querySelector('.glance-planner-card__entries')).toBeNull();
    expect(f.nativeElement.querySelector('.glance-planner-card > p')).toBeNull();
    header.click();
    f.detectChanges();
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(f.nativeElement.querySelectorAll('.glance-planner-entry').length).toBe(1);
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
    const previewParams = new URLSearchParams(location.hash.slice(1));
    const preview = previewParams.get('glance-preview');
    if (!(window as any).__GLANCE_VISUAL__ && !preview) return;
    let fixture: ReturnType<typeof render> | undefined;
    (window as any).renderGlanceVisual = (key: string, width = 390) => {
      fixture?.destroy();
      const selected = cases.find(item => item[0] === key)!;
      fixture = render(selected[1], selected[2]);
      fixture.nativeElement.style.width = `${width}px`;
      fixture.nativeElement.setAttribute('data-visual-fixture', key);
      document.body.appendChild(fixture.nativeElement);
      document.body.style.margin = '0';
      document.body.style.display = 'block';
      document.body.style.background = '#f5f5f5';
      fixture.detectChanges();
    };
    if (preview === 'timetable-empty') {
      (window as any).renderGlanceVisual(preview, Number(previewParams.get('width')) || 390);
    }
    await new Promise<void>(resolve => (window as any).finishGlanceVisual = resolve);
  }, 300000);
});
