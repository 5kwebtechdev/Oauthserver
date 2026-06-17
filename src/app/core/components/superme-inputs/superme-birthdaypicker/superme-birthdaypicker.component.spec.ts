import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SupermeBirthdaypickerComponent } from './superme-birthdaypicker.component';

describe('SupermeBirthdaypickerComponent', () => {
  let component: SupermeBirthdaypickerComponent;
  let fixture: ComponentFixture<SupermeBirthdaypickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SupermeBirthdaypickerComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SupermeBirthdaypickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
