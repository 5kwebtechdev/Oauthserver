import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademyCourseComponent } from './academy-course.component';

describe('AcademyCourseComponent', () => {
  let component: AcademyCourseComponent;
  let fixture: ComponentFixture<AcademyCourseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademyCourseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcademyCourseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});