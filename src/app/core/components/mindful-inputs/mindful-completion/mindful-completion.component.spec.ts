import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MindfulCompletionComponent } from './mindful-completion.component';

describe('MindfulCompletionComponent', () => {
  let component: MindfulCompletionComponent;
  let fixture: ComponentFixture<MindfulCompletionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MindfulCompletionComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MindfulCompletionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render ring-bg with stroke #DCDBDC and ring-progress with stroke #4CAF50', () => {
    component.completionPercentage = 50;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const ringBg = compiled.querySelector('circle.ring-bg');
    const ringProgress = compiled.querySelector('circle.ring-progress');

    expect(ringBg).toBeTruthy();
    expect(ringProgress).toBeTruthy();
    expect(ringBg?.getAttribute('stroke')).toBe('#DCDBDC');
    expect(ringProgress?.getAttribute('stroke')).toBe('#4CAF50');
  });

  it('should maintain colors across completion ranges', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const ringBg = compiled.querySelector('circle.ring-bg');
    const ringProgress = compiled.querySelector('circle.ring-progress');

    expect(ringBg?.getAttribute('stroke')).toBe('#DCDBDC');
    expect(ringProgress?.getAttribute('stroke')).toBe('#4CAF50');

    // Test range: 0, 50, 100
    [0, 50, 100].forEach(value => {
      component.completionPercentage = value;
      fixture.detectChanges();
      expect(ringBg?.getAttribute('stroke')).toBe('#DCDBDC');
      expect(ringProgress?.getAttribute('stroke')).toBe('#4CAF50');
    });
  });
});
