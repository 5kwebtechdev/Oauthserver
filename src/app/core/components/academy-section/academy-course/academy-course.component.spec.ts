import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademyCourseComponent } from './academy-course.component';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

describe('AcademyCourseComponent', () => {
  let component: AcademyCourseComponent;
  let fixture: ComponentFixture<AcademyCourseComponent>;

  const sampleCourse = {
    id: 'budget-1',
    title: 'Budgeting Basics',
    lessons: 4,
    duration: '20 min',
    level: 'Beginner',
    description: 'Learn simple steps to plan, track, and adjust your money so you can reach your goals with confidence.',
    image: '/assets/app-assets/Budget-basic.svg',
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [AcademyCourseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AcademyCourseComponent);
    component = fixture.componentInstance;
    component.course = sampleCourse;
    fixture.detectChanges();
  });

  it('should render header from course input', () => {
    const title = fixture.debugElement.query(By.css('.header h1')).nativeElement;
    const subtitle = fixture.debugElement.query(By.css('.subtitle')).nativeElement;

    expect(title.textContent).toContain('Budgeting Basics');
    expect(subtitle.textContent).toContain('20 min');
  });

  it('should render lesson items', () => {
    const lessons = fixture.debugElement.queryAll(By.css('.lesson'));
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('should emit lessonStart when start-btn clicked', () => {
    spyOn(component.lessonStart, 'emit');
    const btn = fixture.debugElement.query(By.css('.start-btn'));
    btn.triggerEventHandler('click', null);
    expect(component.lessonStart.emit).toHaveBeenCalledWith({ courseId: 'budget-1', lessonIndex: 0 });
  });

  it('should emit courseOpen when header clicked', () => {
    spyOn(component.courseOpen, 'emit');
    const header = fixture.debugElement.query(By.css('.header'));
    header.triggerEventHandler('click', null);
    expect(component.courseOpen.emit).toHaveBeenCalledWith(sampleCourse);
  });
});
