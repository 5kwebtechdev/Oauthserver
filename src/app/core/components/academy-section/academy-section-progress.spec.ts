import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AcademySectionComponent } from './academy-section.component';
import { AcademyFeedResponse, AcademyService } from '../../services/academy.service';
import { AuthService } from '../../services/auth.service';
import { LearningService } from '../../services/learning.service';

describe('Home MasterClass progress', () => {
  let academy: jasmine.SpyObj<AcademyService>;
  let learning: jasmine.SpyObj<LearningService>;

  beforeEach(async () => {
    academy = jasmine.createSpyObj<AcademyService>('AcademyService', ['getAcademyFeed', 'getCourseById', 'getCategories']);
    academy.getCategories.and.returnValue(of([]));
    learning = jasmine.createSpyObj<LearningService>('LearningService', ['fetchArticleCategories']);
    learning.fetchArticleCategories.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [AcademySectionComponent],
      providers: [
        { provide: AcademyService, useValue: academy },
        { provide: AuthService, useValue: { getCurrentUserAge: () => 15 } },
        { provide: LearningService, useValue: learning },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();
  });

  it('uses pending category totals even when the preview feed says completed', () => {
    academy.getAcademyFeed.and.returnValue(of({ state: 3, headerTitle: 'Your Skills Quest' }));
    academy.getCategories.and.returnValue(of([
      { id: 1, categoryName: 'Money', pending: 3 },
      { id: 2, categoryName: 'Communication', courseCount: 5, completedCount: 1 },
      { id: 3, categoryName: 'Inactive', status: 'INACTIVE', pending: 20 },
    ]));
    learning.fetchArticleCategories.and.returnValue(of([
      { id: 1, categoryName: 'Education', pendingCount: 4, count: 43 },
      { id: 2, categoryName: 'Nature', pendingCount: 0, count: 20 },
    ]));
    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.articleCount).toBe(4);
    expect(fixture.componentInstance.masterClassCount).toBe(7);
    expect(learning.fetchArticleCategories).toHaveBeenCalledWith(false, null, 15);
    expect(academy.getCategories).toHaveBeenCalledWith(15);
    expect(fixture.nativeElement.textContent).not.toContain('completed all courses');
  });

  it('does not claim zero pending or completed when category requests fail', () => {
    academy.getAcademyFeed.and.returnValue(of({ state: 3, headerTitle: 'Your Skills Quest' }));
    academy.getCategories.and.returnValue(throwError(() => new Error('offline')));
    learning.fetchArticleCategories.and.returnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.articleCount).toBeNull();
    expect(fixture.componentInstance.masterClassCount).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('completed all courses');
  });

  it('refreshes pending totals on Home return and ignores older responses', () => {
    const stale = new Subject<any[]>();
    academy.getAcademyFeed.and.returnValue(of({ state: 3, headerTitle: 'Your Skills Quest' }));
    academy.getCategories.and.returnValues(stale.asObservable(), of([{ id: 1, categoryName: 'Money', pending: 2 }]));
    learning.fetchArticleCategories.and.returnValues(stale.asObservable(), of([{ id: 1, categoryName: 'Education', pendingCount: 1 }]));
    const fixture = TestBed.createComponent(AcademySectionComponent);
    fixture.detectChanges();
    fixture.componentInstance.refreshFromApi();
    stale.next([{ id: 1, categoryName: 'Old', pending: 99, pendingCount: 99 }]);
    expect(fixture.componentInstance.articleCount).toBe(1);
    expect(fixture.componentInstance.masterClassCount).toBe(2);
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
