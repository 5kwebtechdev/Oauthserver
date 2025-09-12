import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitPageComponent } from './habit-page.component';

describe('HabitPageComponent', () => {
  let component: HabitPageComponent;
  let fixture: ComponentFixture<HabitPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HabitPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
