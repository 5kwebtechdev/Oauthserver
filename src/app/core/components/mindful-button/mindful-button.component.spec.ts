import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MindfulButtonComponent } from './mindful-button.component';

describe('MindfulButtonComponent', () => {
  let component: MindfulButtonComponent;
  let fixture: ComponentFixture<MindfulButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MindfulButtonComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MindfulButtonComponent);
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