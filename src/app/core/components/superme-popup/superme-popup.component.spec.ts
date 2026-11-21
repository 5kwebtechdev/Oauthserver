import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activityConfirmationConfig } from '../activity-section/activity-confirmation-config';
import { IonicModule } from '@ionic/angular';

import { SupermePopupComponent } from './superme-popup.component';

describe('SupermePopupComponent', () => {
  let component: SupermePopupComponent;
  let fixture: ComponentFixture<SupermePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupermePopupComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SupermePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the activity artwork and keeps the confirmation actions interactive', () => {
    component.isVisible = true;
    const primary = spyOn(component.primaryAction, 'emit');
    const secondary = spyOn(component.secondaryAction, 'emit');
    for (const action of ['start', 'complete', 'abort'] as const) {
      component.config = activityConfirmationConfig(
        action,
        action === 'start' ? undefined : { coins: 8, streak: 19 },
      );
      fixture.detectChanges();
      const popup: HTMLElement = fixture.nativeElement.querySelector('.activity-confirmation');
      expect(popup.querySelector('.superme-popup-image')?.getAttribute('src')).toContain(`/${action}.webp`);
      const badges = popup.querySelectorAll('.activity-rewards span');
      expect(badges.length).toBe(action === 'start' ? 0 : 2);
      if (action !== 'start') {
        expect(badges[0].textContent?.trim()).toBe('8');
        expect(badges[1].textContent?.trim()).toBe('19');
      }
      popup.querySelectorAll<HTMLButtonElement>('.superme-popup-actions button').forEach(button => button.click());
    }
    expect(primary).toHaveBeenCalledTimes(3);
    expect(secondary).toHaveBeenCalledTimes(3);
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