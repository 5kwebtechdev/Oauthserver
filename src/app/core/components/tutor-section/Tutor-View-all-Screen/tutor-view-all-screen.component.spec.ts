import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorViewAllScreenComponent } from './tutor-view-all-screen.component';

describe('TutorViewAllScreenComponent', () => {
  let component: TutorViewAllScreenComponent;
  let fixture: ComponentFixture<TutorViewAllScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TutorViewAllScreenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorViewAllScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
