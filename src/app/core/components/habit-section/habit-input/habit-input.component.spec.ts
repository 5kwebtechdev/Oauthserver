import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitInputComponent } from './habit-input.component';

describe('HabitInputComponent', () => {
  let component: HabitInputComponent;
  let fixture: ComponentFixture<HabitInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HabitInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form completion', () => {
    expect(component.isFormComplete).toBeFalsy();
    component.title = 'Test';
    component.startDate = new Date();
    component.endDate = new Date();
    component.startTime = '9:00 AM';
    component.endTime = '10:00 AM';
    component.everyday = true;
    expect(component.isFormComplete).toBeTruthy();
  });

  it('should toggle weekday selection', () => {
    component.toggleDay('M');
    expect(component.selectedDays.has('M')).toBeTruthy();
    component.toggleDay('M');
    expect(component.selectedDays.has('M')).toBeFalsy();
  });
});
