import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AcademySectionComponent } from './academy-section.component';
import { AcademyFeedResponse, AcademyService } from '../../services/academy.service';
import { AuthService } from '../../services/auth.service';
import { LearningService } from '../../services/learning.service';

describe('Home MasterClass progress', () => {
  let academy: jasmine.SpyObj<AcademyService>;

  beforeEach(async () => {
    academy = jasmine.createSpyObj<AcademyService>('AcademyService', ['getAcademyFeed', 'getCourseById']);
    await TestBed.configureTestingModule({
      imports: [AcademySectionComponent],
      providers: [
        { provide: AcademyService, useValue: academy },
        { provide: AuthService, useValue: { getCurrentUserAge: () => 15 } },
        { provide: LearningService, useValue: { getArticleCards: () => of([]) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
  });

  const lessonFeed = (courseIds: number[]): AcademyFeedResponse => ({
    state: 2,
    headerTitle: 'Continue Your Skills Quest',
    lessons: courseIds.map((courseId, index) => ({
      lessonId: index + 1,
      lessonTitle: `Lesson ${index + 1}`,
      courseId,
      courseName: `Course ${courseId}`,
      isCompleted: false,
      ctaLabel: 'Continue',
    })),
  });

  it('uses each course detail percentage for the label and bar, including 0 and 100', () => {
    academy.getAcademyFeed.and.returnValue(of(lessonFeed([1, 2, 3])));
    academy.getCourseById.and.callFake(id => of({ completionPercentage: ({ 1: 0, 2: 25, 3: 100 } as Record<number, number>)[Number(id)] } as any));

    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();

    expect(academy.getAcademyFeed).toHaveBeenCalledWith(15);
    expect(academy.getCourseById).toHaveBeenCalledTimes(3);
    const labels = [...fixture.nativeElement.querySelectorAll('.academy__progress-label small')] as HTMLElement[];
    const bars = [...fixture.nativeElement.querySelectorAll('.academy__progress-track span')] as HTMLElement[];
    expect(labels.map(label => label.textContent?.trim())).toEqual(['0%', '25%', '100%']);
    expect(bars.map(bar => bar.style.width)).toEqual(['0%', '25%', '100%']);
  });

  it('refreshes progress after returning Home without mixing course IDs', () => {
    const feed = new Subject<AcademyFeedResponse>();
    academy.getAcademyFeed.and.returnValue(feed.asObservable());
    academy.getCourseById.and.returnValues(
      of({ completionPercentage: 25 } as any),
      of({ completionPercentage: 50 } as any),
    );
    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();
    feed.next(lessonFeed([7]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.academy__progress-label small').textContent.trim()).toBe('25%');

    fixture.componentInstance.refreshFromApi();
    feed.next(lessonFeed([7]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.academy__progress-label small').textContent.trim()).toBe('50%');
  });

  it('does not display a fabricated percentage when detail progress is unavailable', () => {
    academy.getAcademyFeed.and.returnValue(of(lessonFeed([8])));
    academy.getCourseById.and.returnValue(of({ completionPercentage: null } as any));
    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.academy__progress-label small').textContent.trim()).toBe('—');
  });
});
