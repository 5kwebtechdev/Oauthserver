import { NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { QuickAccessSectionComponent } from './quick-access-section.component';
import { JournalAvailabilityService } from '../../services/journal-availability.service';
import { RefreshService } from '../../services/refresh.service';

describe('Home Journal entry point', () => {
  let component: QuickAccessSectionComponent;
  let events: Subject<NavigationEnd>;
  let availability: jasmine.Spy;
  let navigate: jasmine.Spy;
  let refresh: RefreshService;

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
    availability = jasmine.createSpy().and.returnValue(of({ allowForTheDay: true }));
    navigate = jasmine.createSpy().and.returnValue(Promise.resolve(true));
    refresh = new RefreshService();
    component = new QuickAccessSectionComponent(
      { events, navigate } as unknown as Router,
      { allowForTheDay: availability } as unknown as JournalAvailabilityService,
      refresh,
    );
  });
  afterEach(() => component.ngOnDestroy());

  it('switches to the compact row immediately after saving and ignores an older response', () => {
    const pending = new Subject<{ allowForTheDay: boolean }>();
    availability.and.returnValue(pending);
    component.ngOnInit();
    refresh.notifyJournalAdded();
    pending.next({ allowForTheDay: true });
    expect(component.journalAvailable).toBeFalse();
    expect(component.checkingJournalAvailability).toBeFalse();
  });

  it('opens the existing entry if Write Now discovers a journal already saved', () => {
    component.ngOnInit();
    availability.and.returnValue(of({ allowForTheDay: false }));
    component.openJournal(new Event('click'));
    expect(navigate).toHaveBeenCalledWith(['/authed/journal-output'], { queryParams: { day: 'today' } });
  });

  it('opens the existing add flow when writing is allowed', () => {
    component.ngOnInit();
    component.openJournal(new Event('click'));
    expect(navigate).toHaveBeenCalledWith(['/journal-input']);
  });

  it('refreshes cached Home routes and preserves completed state on a network error', () => {
    availability.and.returnValue(of({ allowForTheDay: false }));
    component.ngOnInit();
    availability.and.returnValue(throwError(() => new Error('offline')));
    events.next(new NavigationEnd(1, '/authed/home', '/authed/home'));
    expect(availability).toHaveBeenCalledTimes(2);
    expect(component.journalAvailable).toBeFalse();
    availability.and.returnValue(of({ allowForTheDay: true }));
    events.next(new NavigationEnd(2, '/home', '/home'));
    expect(component.journalAvailable).toBeTrue();
  });
});
