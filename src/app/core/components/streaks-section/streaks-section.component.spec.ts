import { of, Subject, throwError } from 'rxjs';
import { StreakCalendarResponse, StreakStatus } from '../../api/streak-restore.api';
import { StreaksSectionComponent } from './streaks-section.component';

describe('StreaksSectionComponent API mapping', () => {
  const user = {
    petMessage: '', currentStreak: 2, highestStreak: 13, streakDays: 13,
    totalActiveDays: 115, rank: 0, avatarName: '', hasStreak: true
  };
  const status: StreakStatus = {
    currentStreak: 2, highestStreak: 13, canRestore: false, missedDays: 0,
    lastMissedStreakDate: null, restoreToStreak: null, restoreCost: 5, coins: 100,
    nextMilestoneDay: 3, nextMilestoneCoins: 25,
    milestones: [
      { days: 7, coins: 40, claimed: false },
      { days: 3, coins: 25, claimed: true }
    ]
  };
  const response: StreakCalendarResponse = {
    year: 2026, month: 10, timezone: 'Asia/Kolkata',
    days: [
      { date: '2026-10-01', status: 'STREAK' },
      { date: '2026-10-02', status: 'RESTORED' },
      { date: '2026-10-03', status: 'MISSED' },
      { date: '2026-10-04', status: 'UNKNOWN' }
    ]
  };

  function create(calendar = jasmine.createSpy('getStreakCalendar').and.returnValue(of(response))) {
    const leaderboard = { getLeaderboard: jasmine.createSpy('getLeaderboard').and.returnValue(of({ currentUser: user })) };
    const api = {
      getStreakStatus: jasmine.createSpy('getStreakStatus').and.returnValue(of(status)),
      getStreakCalendar: calendar
    };
    const component = new StreaksSectionComponent(
      leaderboard as any, api as any, { getUserId: () => '42' } as any, { back: () => {} } as any
    );
    component.displayedMonth = new Date(2026, 9, 1);
    return { component, api };
  }

  it('uses the monthly statuses without deriving missed days from gaps', () => {
    const { component, api } = create();
    component.ngOnInit();

    expect(api.getStreakCalendar).toHaveBeenCalledWith(2026, 10);
    expect(component.calendarDays.find(day => day.key === '2026-10-01')?.state).toBe('streak');
    expect(component.calendarDays.find(day => day.key === '2026-10-02')?.state).toBe('restored');
    expect(component.calendarDays.find(day => day.key === '2026-10-03')?.state).toBe('missed');
    expect(component.calendarDays.find(day => day.key === '2026-10-05')?.state).toBe('unknown');
    expect(component.calendarDays.find(day => day.outside)?.state).toBe('unknown');
  });

  it('highlights today, keeps future dates plain, and retains confirmed older streaks', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date('2026-10-08T08:00:00Z'));
      const calendar = jasmine.createSpy('getStreakCalendar').and.returnValue(of({
        ...response,
        days: [
          { date: '2026-10-01', status: 'STREAK' },
          { date: '2026-10-08', status: 'STREAK' },
          { date: '2026-10-09', status: 'STREAK' }
        ]
      } as StreakCalendarResponse));
      const { component } = create(calendar);
      component.ngOnInit();

      expect(component.calendarDays.find(day => day.key === '2026-10-01')?.state).toBe('streak');
      expect(component.calendarDays.find(day => day.key === '2026-10-08')?.today).toBeTrue();
      expect(component.calendarDays.find(day => day.key === '2026-10-08')?.state).toBe('streak');
      expect(component.calendarDays.find(day => day.key === '2026-10-09')?.future).toBeTrue();
      expect(component.calendarDays.find(day => day.key === '2026-10-09')?.state).toBe('unknown');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('waits for the status check-in before reading the calendar', () => {
    const pendingStatus = new Subject<StreakStatus>();
    const { component, api } = create();
    api.getStreakStatus.and.returnValue(pendingStatus.asObservable());
    component.ngOnInit();

    expect(api.getStreakCalendar).not.toHaveBeenCalled();
    pendingStatus.next(status);
    expect(api.getStreakCalendar).toHaveBeenCalledWith(2026, 10);
  });

  it('uses backend milestone order, reward amounts, and claimed state', () => {
    const { component } = create();
    component.ngOnInit();

    expect(component.milestones.map(item => item.days)).toEqual([3, 7]);
    expect(component.milestones.map(item => item.coins)).toEqual([25, 40]);
    expect(component.isMilestoneClaimed(component.milestones[0])).toBeTrue();
    expect(component.isMilestoneClaimed(component.milestones[1])).toBeFalse();
  });

  it('requests a new month and ignores a cancelled older response', () => {
    const october = new Subject<StreakCalendarResponse>();
    const calendar = jasmine.createSpy('getStreakCalendar').and.callFake((_year: number, month: number) =>
      month === 10 ? october.asObservable() : of({ ...response, month: 9, days: [] })
    );
    const { component, api } = create(calendar);
    component.ngOnInit();
    component.changeMonth(-1);
    october.next(response);

    expect(api.getStreakCalendar).toHaveBeenCalledWith(2026, 9);
    expect(component.monthLabel).toBe('September 2026');
    expect(component.calendarDays.every(day => day.state === 'unknown')).toBeTrue();
    component.ngOnDestroy();
  });

  it('builds the correct number of dates for a leap-year February', () => {
    const calendar = jasmine.createSpy('getStreakCalendar').and.returnValue(
      of({ year: 2024, month: 2, timezone: 'Asia/Kolkata', days: [] })
    );
    const { component } = create(calendar);
    component.displayedMonth = new Date(2024, 1, 1);
    component.ngOnInit();

    expect(component.calendarDays.filter(day => !day.outside).length).toBe(29);
    expect(component.calendarDays.some(day => day.key === '2024-02-29')).toBeTrue();
  });

  it('keeps days neutral and offers retry when the calendar API is unavailable', () => {
    spyOn(console, 'error');
    const calendar = jasmine.createSpy('getStreakCalendar')
      .and.returnValues(throwError(() => new Error('Not deployed')), of(response));
    const { component } = create(calendar);
    component.ngOnInit();

    expect(component.calendarError).toBeTrue();
    expect(component.calendarDays.every(day => day.state === 'unknown')).toBeTrue();
    component.retryCalendar();
    expect(component.calendarError).toBeFalse();
    expect(component.calendarDays.find(day => day.key === '2026-10-02')?.state).toBe('restored');
  });
});
