import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MindfulPopupComponent } from './mindful-popup.component';

describe('MindfulPopupComponent', () => {
  let component: MindfulPopupComponent;
  let fixture: ComponentFixture<MindfulPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MindfulPopupComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MindfulPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle config input', () => {
    const config = {
      heading: 'Test Heading',
      subtitle: 'Test Subtitle',
      image: 'test.jpg'
    };
    component.config = config;
    expect(component.finalConfig.heading).toBe('Test Heading');
    expect(component.finalConfig.subtitle).toBe('Test Subtitle');
    expect(component.finalConfig.image).toBe('test.jpg');
  });

  it('should emit primary action on primary click', () => {
    spyOn(component.primaryAction, 'emit');
    component.onPrimaryClick();
    expect(component.primaryAction.emit).toHaveBeenCalled();
  });

  it('should emit secondary action on secondary click', () => {
    spyOn(component.secondaryAction, 'emit');
    component.onSecondaryClick();
    expect(component.secondaryAction.emit).toHaveBeenCalled();
  });

  it('should emit share action on share click', () => {
    spyOn(component.shareAction, 'emit');
    component.onShareClick();
    expect(component.shareAction.emit).toHaveBeenCalled();
  });

  it('should emit close action on close click', () => {
    spyOn(component.closeAction, 'emit');
    component.onCloseClick();
    expect(component.closeAction.emit).toHaveBeenCalled();
  });

  it('should show/hide component', () => {
    component.show();
    expect(component.isVisible).toBe(true);

    component.hide();
    expect(component.isVisible).toBe(false);
  });

  it('should toggle visibility', () => {
    const initialState = component.isVisible;
    component.toggle();
    expect(component.isVisible).toBe(!initialState);
  });

  it('should detect single CTA correctly', () => {
    component.primaryCTA = { text: 'Primary' };
    component.secondaryCTA = undefined;
    expect(component.hasOneCTA).toBe(true);
    expect(component.hasTwoCTAs).toBe(false);
  });

  it('should detect two CTAs correctly', () => {
    component.primaryCTA = { text: 'Primary' };
    component.secondaryCTA = { text: 'Secondary' };
    expect(component.hasOneCTA).toBe(false);
    expect(component.hasTwoCTAs).toBe(true);
  });
});