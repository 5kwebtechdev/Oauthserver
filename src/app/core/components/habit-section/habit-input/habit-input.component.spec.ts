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
});
