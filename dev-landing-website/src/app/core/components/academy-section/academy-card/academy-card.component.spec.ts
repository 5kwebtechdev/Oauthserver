import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademyCardComponent } from './academy-card.component';

describe('AcademyCardComponent', () => {
  let component: AcademyCardComponent;
  let fixture: ComponentFixture<AcademyCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademyCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AcademyCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit start when button clicked', () => {
    spyOn(component.start, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const btn = compiled.querySelector('.start-btn') as HTMLButtonElement;
    btn.click();
    expect(component.start.emit).toHaveBeenCalled();
  });
});
