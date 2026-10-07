import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { SupermeTimerComponent } from './superme-timer.component';
import { focusSchedule, timerSnapshot } from './timer-state';
import { HabitApi } from '../../api/habit.api';
import { TaskApi } from '../../api/task.api';
import { HabitService } from '../activity-section/habit.service';
import { AutoAbortService } from '../activity-section/auto-abort.service';
import { BadgePopupService } from '../../services/badge-popup.service';
import { PetAgeService } from '../../services/pet-age.service';
import { CalendarService } from '../../services/calendar.service';

describe('timestamp-based focus timer', () => {
  const start = 1_800_000_000_000;
  it('uses total schedule duration, including time elapsed before reopening', () => {
    expect(timerSnapshot(start, start + 3600000, start + 900000))
      .toEqual({ remainingSeconds: 2700, progress: .25, finished: false });
  });
  it('recovers all elapsed time after backgrounding, without relying on callbacks', () => {
    expect(timerSnapshot(start, start + 60000, start + 45123)?.remainingSeconds).toBe(15);
    expect(timerSnapshot(start, start + 60000, start + 90000))
      .toEqual({ remainingSeconds: 0, progress: 1, finished: true });
  });
  it('clamps progress before start and rejects missing/invalid schedules', () => {
    expect(timerSnapshot(start, start + 60000, start - 1000)?.progress).toBe(0);
    expect(timerSnapshot(0, start, start)).toBeNull();
    expect(timerSnapshot(start, start, start)).toBeNull();
    expect(timerSnapshot(start, NaN, start)).toBeNull();
  });
  it('uses a recurring occurrence rather than the multi-week series duration', () => {
    const date = new Date(2026, 8, 22, 10, 15).getTime();
    const schedule = focusSchedule({ everyday: true, startTime: '10:00:00', endTime: '11:00:00',
      startTimeStamp: new Date(2026, 8, 1, 10).getTime(), endTimeStamp: new Date(2026, 8, 30, 11).getTime() }, date);
    expect(timerSnapshot(schedule.start, schedule.end, date)?.remainingSeconds).toBe(2700);
    expect(schedule.end - schedule.start).toBe(3600000);
  });
  it('preserves calendar occurrence timestamps and supports overnight recurrences', () => {
    const occurrence = { everyday: true, startTimeStamp: start, endTimeStamp: start + 60000 };
    expect(focusSchedule(occurrence, start + 1000)).toEqual({ start, end: start + 60000 });
    const schedule = focusSchedule({ everyday: true, completionDate: '2026-09-22', startTime: '23:30', endTime: '00:30' });
    expect(schedule.end - schedule.start).toBe(3600000);
  });
});

describe('SupermeTimerComponent', () => {
  let fixture: ComponentFixture<SupermeTimerComponent>;
  let component: SupermeTimerComponent;
  let now: number;
  let modal: any, habits: any, taskApi: any, habitApi: any, abort: any, badges: any, pet: any;
  let sounds: any[];
  const start = 1_800_000_000_000;

  beforeEach(async () => {
    now = start + 900000;
    spyOn(Date, 'now').and.callFake(() => now);
    spyOn(window, 'requestAnimationFrame').and.returnValue(1);
    spyOn(window, 'cancelAnimationFrame');
    modal = { dismiss: jasmine.createSpy().and.resolveTo(true) };
    habits = { completeHabit: jasmine.createSpy(), notifyTaskCompleted: jasmine.createSpy(), notifyTaskUpdated: jasmine.createSpy(), notifyHabitStarted: jasmine.createSpy() };
    taskApi = { completeTask: jasmine.createSpy().and.returnValue(of({})), clearCache: jasmine.createSpy() };
    habitApi = { completeHabit: jasmine.createSpy().and.returnValue(of({})) };
    abort = { cancelAutoAbort: jasmine.createSpy(), scheduleAutoAbort: jasmine.createSpy() };
    badges = { check: jasmine.createSpy() };
    pet = { recordActivity: jasmine.createSpy(), getCurrentPetType: jasmine.createSpy().and.returnValue('panda') };
    sounds = [];
    spyOn(window, 'Audio').and.callFake(function () {
      const sound: any = { play: jasmine.createSpy().and.resolveTo(), pause: jasmine.createSpy(), removeAttribute: jasmine.createSpy(), load: jasmine.createSpy() };
      sounds.push(sound);
      return sound;
    });
    await TestBed.configureTestingModule({
      imports: [SupermeTimerComponent, IonicModule.forRoot()],
      providers: [
        { provide: ModalController, useValue: modal },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
        { provide: HabitApi, useValue: habitApi }, { provide: TaskApi, useValue: taskApi },
        { provide: HabitService, useValue: habits }, { provide: AutoAbortService, useValue: abort },
        { provide: BadgePopupService, useValue: badges }, { provide: PetAgeService, useValue: pet },
        { provide: CalendarService, useValue: { clearCache: jasmine.createSpy() } }
      ]
    }).overrideProvider(ModalController, { useValue: modal }).compileComponents();
    fixture = TestBed.createComponent(SupermeTimerComponent);
    component = fixture.componentInstance;
    Object.assign(component, { title: 'Reading', activityId: 'focus-test', startTime: start, endTime: start + 3600000 });
    fixture.detectChanges();
    component.ionViewDidEnter();
  });

  afterEach(() => fixture.destroy());
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

  it('renders the dynamic title, MM:SS, progress and four sound controls', () => {
    expect(component.formattedTime).toBe('45:00');
    expect(component.progress).toBe(.25);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Reading');
    expect(fixture.nativeElement.querySelectorAll('.sound').length).toBe(4);
    expect(component.dotX).toBeCloseTo(244.5);
    expect(component.dotY).toBeCloseTo(126);
    const schedule = fixture.nativeElement.querySelector('.scheduled-time');
    expect(schedule.textContent.trim()).toBe(component.scheduledTime);
    expect(component.scheduledTime).toContain(' - ');
    expect(fixture.nativeElement.querySelectorAll('.timer-actions button').length).toBe(2);
  });

  it('lets Done complete the current activity using the existing completion API', async () => {
    (fixture.nativeElement.querySelector('.done') as HTMLButtonElement).click();
    await settle();
    expect(habitApi.completeHabit).toHaveBeenCalledOnceWith('focus-test', false);
    expect(modal.dismiss).toHaveBeenCalledWith({ completed: true }, 'completed');
  });

  it('aborts through the existing API and closes the timer', async () => {
    habitApi.abortHabit = jasmine.createSpy().and.returnValue(of({}));
    (fixture.nativeElement.querySelector('.abort') as HTMLButtonElement).click();
    await settle();
    expect(habitApi.abortHabit).toHaveBeenCalledOnceWith('focus-test');
    expect(modal.dismiss).toHaveBeenCalledWith({ aborted: true }, 'aborted');
  });

  it('shows the selected Figma Timer pet without changing the timer controls', () => {
    const pets: Record<string, { image: string; width: number; height: number; left: number; top: number }> = {
      panda: { image: 'pet.png', width: 110, height: 101, left: 71, top: 144 },
      owl: { image: 'other-pets.png', width: 100, height: 105, left: 74, top: 137 },
      dragon: { image: 'other-pets.png', width: 110, height: 102, left: 71, top: 140 },
      llama: { image: 'llama.png', width: 100, height: 116, left: 76, top: 126 }
    };
    for (const [type, expected] of Object.entries(pets)) {
      pet.getCurrentPetType.and.returnValue(type);
      fixture.detectChanges();
      const crop: HTMLElement = fixture.nativeElement.querySelector('.pet-crop');
      const petImage: HTMLImageElement = crop.querySelector('img')!;
      expect(crop.classList.contains('pet-crop--' + type)).toBeTrue();
      expect(petImage.getAttribute('src')).toBe('assets/figma/focus-timer/' + expected.image);
      const style = getComputedStyle(crop);
      expect(parseFloat(style.width)).toBe(expected.width);
      expect(parseFloat(style.height)).toBe(expected.height);
      expect(parseFloat(style.left)).toBe(expected.left);
      expect(parseFloat(style.top)).toBe(expected.top);
      expect(fixture.nativeElement.querySelectorAll('.sound').length).toBe(4);
    }
  });

  it('switches sounds exclusively, toggles pause, and keeps counting during audio', async () => {
    await component.toggleSound('lofi');
    expect(component.playingSound).toBe('lofi');
    await component.toggleSound('ocean');
    expect(sounds[0].pause).toHaveBeenCalled();
    expect(component.playingSound).toBe('ocean');
    now += 1000;
    (component as any).tick();
    expect(component.formattedTime).toBe('44:59');
    await component.toggleSound('ocean');
    expect(component.playingSound).toBeNull();
    expect(sounds[1].pause).toHaveBeenCalled();
  });

  it('does not reactivate an obsolete audio request', async () => {
    const pending = component.toggleSound('lofi');
    // Start another sound before the first play promise settles.
    await component.toggleSound('rain');
    await pending;
    expect(component.playingSound).toBe('rain');
    expect(sounds[0].pause).toHaveBeenCalled();
  });

  it('pauses audio on background and derives the correct time on resume', async () => {
    let hidden = false;
    spyOnProperty(document, 'hidden', 'get').and.callFake(() => hidden);
    await component.toggleSound('forest');
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.playingSound).toBeNull();
    now += 125000;
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.formattedTime).toBe('42:55');
  });

  it('completes a habit once on expiry and stops its sound', async () => {
    await component.toggleSound('lofi');
    now = component.endTime;
    (component as any).tick();
    (component as any).tick();
    await settle();
    expect(component.formattedTime).toBe('00:00');
    expect(component.progress).toBe(1);
    expect(habitApi.completeHabit).toHaveBeenCalledOnceWith('focus-test', false);
    expect(habits.completeHabit).toHaveBeenCalledOnceWith('focus-test');
    expect(component.playingSound).toBeNull();
    expect(modal.dismiss).toHaveBeenCalledWith({ completed: true }, 'completed');
    expect(badges.check).toHaveBeenCalled();
  });

  it('uses task completion and ignores duplicate completion during a pending response', async () => {
    component.activityType = 'tasks';
    const response = new Subject<any>();
    taskApi.completeTask.and.returnValue(response);
    now = component.endTime + 10000;
    (component as any).tick();
    await component.complete();
    expect(taskApi.completeTask).toHaveBeenCalledTimes(1);
    response.next({});
    await settle();
    expect(habits.notifyTaskCompleted).toHaveBeenCalledTimes(1);
    expect(pet.recordActivity).toHaveBeenCalledWith('tasks');
  });

  it('retains the existing coin-limit confirmation before saving completion', async () => {
    habitApi.completeHabit.and.returnValue(of({ requiresConfirmation: true, message: 'Limit reached' }));
    now = component.endTime;
    (component as any).tick();
    await settle();
    expect(component.confirmVisible).toBeTrue();
    expect(modal.dismiss).not.toHaveBeenCalled();
    habitApi.completeHabit.and.returnValue(of({}));
    await component.complete(true);
    expect(habitApi.completeHabit).toHaveBeenCalledWith('focus-test', true);
    expect(component.completed).toBeTrue();
  });

  it('offers retry after failure instead of pretending completion succeeded', async () => {
    habitApi.completeHabit.and.returnValue(throwError(() => new Error('offline')));
    now = component.endTime;
    (component as any).tick();
    await settle();
    expect(component.completed).toBeFalse();
    expect(component.canRetryCompletion).toBeTrue();
    expect(modal.dismiss).not.toHaveBeenCalled();
    habitApi.completeHabit.and.returnValue(of({}));
    await component.complete();
    expect(component.completed).toBeTrue();
  });

  it('waits until the modal is presented before completing an already-expired activity', async () => {
    (component as any).presented = false;
    now = component.endTime;
    (component as any).tick();
    expect(habitApi.completeHabit).not.toHaveBeenCalled();
    component.ionViewDidEnter();
    await settle();
    expect(habitApi.completeHabit).toHaveBeenCalledTimes(1);
  });

  it('does not complete or invent a duration when schedule data is missing', () => {
    component.endTime = NaN;
    (component as any).tick();
    expect(component.completionError).toContain('schedule is unavailable');
    expect(component.canRetryCompletion).toBeFalse();
    expect(habitApi.completeHabit).not.toHaveBeenCalled();
  });

  it('stops audio and restores the existing abort scheduling when leaving early', async () => {
    await component.toggleSound('ocean');
    await component.onBack(true);
    expect(component.playingSound).toBeNull();
    fixture.destroy();
    expect(abort.scheduleAutoAbort).toHaveBeenCalledWith({ id: 'focus-test', type: 'habits', endTimeStamp: component.endTime });
  });
});
