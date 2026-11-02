
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupermeBirthdaypickerComponent } from './superme-birthdaypicker.component';

describe('SupermeBirthdaypickerComponent', () => {
  let component: SupermeBirthdaypickerComponent;
  let fixture: ComponentFixture<SupermeBirthdaypickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupermeBirthdaypickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SupermeBirthdaypickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.selectedDay).toBe(5);
    expect(component.selectedMonth).toBe(3);
    expect(component.selectedYear).toBe(2025);
  });

  it('should toggle picker visibility', () => {
    expect(component.isOpen).toBeFalsy();
    component.togglePicker();
    expect(component.isOpen).toBeTruthy();
  });

  it('should emit date on done', () => {
    spyOn(component.dateSelected, 'emit');
    component.done();
    expect(component.dateSelected.emit).toHaveBeenCalled();
  });

  it('should have correct day, month, and year lists', () => {
    expect(component.daysList.length).toBe(31);
    expect(component.monthsList.length).toBe(12);
    expect(component.yearsList.length).toBe(100);
  });
});