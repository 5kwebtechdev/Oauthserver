import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SupermeButtonComponent } from './superme-button.component';

describe('SupermeButtonComponent', () => {
  let component: SupermeButtonComponent;
  let fixture: ComponentFixture<SupermeButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SupermeButtonComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SupermeButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct property as false by default', () => {
    expect(component.correct).toBe(false);
  });

  it('should have incorrect property as false by default', () => {
    expect(component.incorrect).toBe(false);
  });

  it('should set correct property to true when input is provided', () => {
    component.correct = true;
    expect(component.correct).toBe(true);
  });

  it('should set incorrect property to true when input is provided', () => {
    component.incorrect = true;
    expect(component.incorrect).toBe(true);
  });
});