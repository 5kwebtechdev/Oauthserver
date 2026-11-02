import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrivacyPolicyPageComponent } from './privacy-policy-page.component';

describe('PrivacyPolicyPageComponent', () => {
  let component: PrivacyPolicyPageComponent;
  let fixture: ComponentFixture<PrivacyPolicyPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrivacyPolicyPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 privacy sections', () => {
    expect(component.privacySections.length).toBe(4);
  });

  it('should have correct section titles', () => {
    const expectedTitles = [
      'What We Collect',
      'Data Security',
      'Your Control',
      'Updates To Privacy Policy'
    ];
    
    component.privacySections.forEach((section, index) => {
      expect(section.title).toBe(expectedTitles[index]);
    });
  });

  it('should call contactTeam method', () => {
    spyOn(console, 'log');
    component.contactTeam();
    expect(console.log).toHaveBeenCalledWith('Contact team clicked');
  });
});
