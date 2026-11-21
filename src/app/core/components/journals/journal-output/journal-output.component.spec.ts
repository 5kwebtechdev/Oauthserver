import { JournalOutputComponent } from './journal-output.component';
import { dailyMoodRecord, moodDateKey } from '../../../services/daily-mood-records.service';
import { of } from 'rxjs';

describe('Journal card and calendar shared mood', () => {
  function create() {
    return new JournalOutputComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  }
  it('overrides the save-time snapshot with the current daily mood without changing journal content', () => {
    const component = create();
    component.entries = [{ id: 1, date: new Date(), mood: 'Happy', text: 'Original content' }];
    component.dailyMoodRecords = { [moodDateKey()]: dailyMoodRecord('NEUTRAL') };
    expect(component.filteredEntries[0].mood).toBe('Calm');
    expect(component.filteredEntries[0].text).toBe('Original content');
    expect(component.moodDays[29].tone).toBe('great');
    component.dailyMoodRecords = { [moodDateKey()]: dailyMoodRecord('NERVOUS') };
    expect(component.filteredEntries[0].mood).toBe('Anxious');
    expect(component.moodDays[29].tone).toBe('okay');
  });
  it('shows mood days without journal entries and does not substitute a stale journal mood', () => {
    const component = create();
    component.dailyMoodRecords = { [moodDateKey()]: dailyMoodRecord('SAD') };
    expect(component.moodDays.length).toBe(30);
    expect(component.moodDays[29].tone).toBe('low');
    component.entries = [{ date: new Date(), mood: 'Happy' }];
    component.dailyMoodRecords = {};
    expect(component.filteredEntries[0].mood).toBe('');
  });
  it('uses all-time streaks from the response even when the selected month has no entries', () => {
    const http = { get: jasmine.createSpy().and.returnValue(of({ body: { entries: [], currentStreak: 3, bestStreak: 12 } })) };
    const component = new JournalOutputComponent({} as any, http as any,
      { getToken: () => null } as any, {} as any, {} as any, {} as any, { watch: () => of({}) } as any);
    component.retry();
    expect(component.entries).toEqual([]);
    expect(component.currentStreak).toBe(3);
    expect(component.bestStreak).toBe(12);
    component.prevMonth();
    expect(component.currentStreak).toBe(3);
    expect(component.bestStreak).toBe(12);
  });
});
