import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorHomepageComponent } from './tutor-homepage.component';

describe('TutorHomepageComponent', () => {
  let component: TutorHomepageComponent;
  let fixture: ComponentFixture<TutorHomepageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorHomepageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TutorHomepageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
