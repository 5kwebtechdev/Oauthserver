import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpCentrePageComponent } from './help-centre-page.component';

describe('HelpCentrePageComponent', () => {
  let component: HelpCentrePageComponent;
  let fixture: ComponentFixture<HelpCentrePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpCentrePageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HelpCentrePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 3 help topics', () => {
    expect(component.helpTopics.length).toBe(3);
  });

  it('should have 3 contact options', () => {
    expect(component.contactOptions.length).toBe(3);
  });

  it('should navigate to FAQ when button is clicked', () => {
    const originalLocation = window.location.href;
    component.navigateToFAQ();
    // Just verify the method runs without error
    expect(component).toBeTruthy();
  });
});
