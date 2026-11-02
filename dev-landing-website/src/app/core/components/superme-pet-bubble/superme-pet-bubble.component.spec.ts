import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupremePetBubbleComponent } from './superme-pet-bubble.component';

describe('SupremePetBubbleComponent', () => {
  let component: SupremePetBubbleComponent;
  let fixture: ComponentFixture<SupremePetBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupremePetBubbleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SupremePetBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render pet and message', () => {
    component.petName = 'Panda';
    component.message = 'Hello!';
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bubble-message')).toBeTruthy();
  });

  it('should emit petClick when pet is clicked and clickable is true', () => {
    spyOn(component.petClick, 'emit');
    component.clickable = true;
    component.onPetClick();
    
    expect(component.petClick.emit).toHaveBeenCalled();
  });

  it('should emit bubbleClick when bubble is clicked', () => {
    spyOn(component.bubbleClick, 'emit');
    component.onBubbleClick();
    
    expect(component.bubbleClick.emit).toHaveBeenCalled();
  });

  it('should apply correct position class', () => {
    component.bubblePosition = 'top';
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.position-top')).toBeTruthy();
  });

  it('should apply clickable class when clickable is true', () => {
    component.clickable = true;
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.clickable')).toBeTruthy();
  });
});
