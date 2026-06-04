import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MindfulBirthdaypickerComponent } from './mindful-birthdaypicker.component';

describe('MindfulBirthdaypickerComponent', () => {
  let component: MindfulBirthdaypickerComponent;
  let fixture: ComponentFixture<MindfulBirthdaypickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MindfulBirthdaypickerComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MindfulBirthdaypickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
