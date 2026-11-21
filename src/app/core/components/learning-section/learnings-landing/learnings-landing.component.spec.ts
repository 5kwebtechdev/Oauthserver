import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { SimpleChange } from '@angular/core';
import { LearningCardData } from '../../../models/learning.models';
import { LearningsLandingComponent } from './learnings-landing.component';

describe('Learning landing revamp', () => {
  const card = (id: number, type: LearningCardData['type'], completed = false): LearningCardData => ({
    id, type, title: `${type} ${id}`, image: '', description: 'Learn something', coins: id,
    buttonText: '', rawData: { userLearningStatus: completed ? 'COMPLETED' : 'PENDING' }
  });
  function setup() {
    const learning = {
      fetchLearningPage: jasmine.createSpy().and.callFake((type: string, page: number, progress: string, category: string) => {
        const records = type === 'QUIZ' ? [card(1, 'quiz'), card(2, 'quiz', true)] :
          type === 'ARTICLE' ? [card(3, 'article', true)] : [{
            ...card(4, 'masterclass', true), image: 'course.webp', coins: 80,
            rawData: { durationMinutes: 30, noOfLessons: 15 }
          }];
        const items = category === 'Unknown' ? [] : records.filter(item =>
          progress === 'ALL' || (item.id === 1 ? progress === 'PENDING' : progress === 'COMPLETED'));
        return of({ items, page, totalPages: items.length ? 1 : 0, totalPending: type === 'QUIZ' ? 1 : 0, totalCompleted: 1 });
      }),
      fetchChallengeCategorySummary: jasmine.createSpy().and.returnValue(of([{ id: 1, categoryName: 'Education' }])),
      fetchArticleCategories: jasmine.createSpy().and.returnValue(of([{ id: 2, categoryName: 'Reading' }])),
      fetchChallengesForLearningCategory: jasmine.createSpy().and.returnValue(of([card(1, 'quiz'), card(2, 'quiz', true)])),
      fetchArticlesForLearningCategory: jasmine.createSpy().and.returnValue(of([card(3, 'article', true)]))
    };
    const academy = {
      getCategories: jasmine.createSpy().and.returnValue(of([{ id: 3, categoryName: 'Digital Life' }])),
      getCoursesByCategory: jasmine.createSpy().and.returnValue(of([{ id: 4, courseName: 'Digital skills', noOfLessons: 15,
        totalCoins: 80, duration: 30, isCourseCompleted: true, thumbnailUrl: 'course.webp' }]))
    };
    const auth = { getUserId: jasmine.createSpy().and.returnValue('9'), getCurrentUserAge: () => 14 };
    const petData$ = new BehaviorSubject({ petType: 'owl' });
    const component = new LearningsLandingComponent(learning as any, academy as any, auth as any, { petData$ } as any);
    return { component, learning, academy, auth, petData$ };
  }

  it('opens Figma sheets and applies choices to the existing content filters', () => {
    const { component } = setup(); component.ngOnInit();
    component.openFilter('category'); expect(component.filterSheet).toBe('category');
    component.chooseCategory('Education'); expect(component.filterSheet).toBeNull();
    component.openFilter('progress'); component.chooseProgress('pending');
    expect(component.filterSheet).toBeNull(); expect(component.progressLabel).toBe('Pending');
    expect(component.items.map(item => item.id)).toEqual([1]);
    component.chooseProgress('completed'); expect(component.items.map(item => item.id)).toEqual([2]);
    component.chooseCategory(''); component.chooseProgress('all'); expect(component.items.length).toBe(2);
    component.ngOnDestroy();
  });

  it('uses matching original category icons and preserves other API artwork', () => {
    const { component } = setup();
    expect(component.categoryImage({id:1, categoryName:'Education'})).toBe('assets/figma/reels/categories/education.webp');
    expect(component.categoryImage({id:2, categoryName:'New topic', image:'https://example.invalid/topic.png'})).toBe('https://example.invalid/topic.png');
    expect(component.categoryLabel({id:3, categoryName:'People & Vlogs'})).toBe('People &\nVlogs');
  });

  it('loads only one card page and uses lightweight requests for the other tab counts', () => {
    const { component, learning } = setup();
    component.ngOnInit();
    expect(learning.fetchLearningPage).toHaveBeenCalledWith('QUIZ', 0, 'ALL', '', 14);
    expect(learning.fetchLearningPage).toHaveBeenCalledWith('ARTICLE', 0, 'ALL', '', 14, 1);
    expect(learning.fetchChallengesForLearningCategory).not.toHaveBeenCalled();
    expect(component.metrics('quizzes')).toEqual({ completed: 1, total: 2, percent: 50 });
    component.chooseCategory('Unknown');
    expect(component.items).toEqual([]);
    expect(component.metrics('quizzes').total).toBe(2);
    component.ngOnDestroy();
  });

  it('moves between server pages and resets to the first page on filter changes', () => {
    const { component, learning } = setup();
    learning.fetchLearningPage.and.callFake((_type, page) => of({
      page, items: [card(page + 1, 'quiz')], totalPages: 3, totalCompleted: 0, totalPending: 3
    }));
    component.ngOnInit();
    component.changePage(-1);
    component.changePage(1);
    expect(component.items.map(item => item.id)).toEqual([2]);
    component.changePage(2);
    component.changePage(3);
    expect(component.page).toBe(2);
    component.chooseProgress('pending');
    expect(learning.fetchLearningPage).toHaveBeenCalledWith('QUIZ', 0, 'PENDING', '', 14);
    expect(component.page).toBe(0);
    component.ngOnDestroy();
  });

  it('searches on submit and restores the page when search closes', () => {
    const { component } = setup();
    component.ngOnInit();
    component.toggleSearch();
    component.submitSearch(' quiz 2 ');
    expect(component.items.map(item => item.id)).toEqual([2]);
    component.toggleSearch();
    expect(component.items.length).toBe(2);
    component.ngOnDestroy();
  });

  it('shows an error on a failed page and allows retry', () => {
    const { component, learning } = setup();
    const original = learning.fetchLearningPage.and;
    original.returnValue(throwError(() => new Error('offline')));
    component.ngOnInit();
    expect(component.active.loading).toBeFalse();
    expect(component.active.error).toBeTrue();
    original.returnValue(of({ items: [], page: 0, totalPages: 0, totalPending: 0, totalCompleted: 0 }));
    component.reload();
    expect(component.active.error).toBeFalse();
    expect(component.items).toEqual([]);
    component.ngOnDestroy();
  });

  it('responds to the existing pet preference and unsubscribes when destroyed', () => {
    const { component, petData$ } = setup(); component.ngOnInit();
    expect(component.pet).toBe('owl');
    for (const petType of ['panda', 'dragon', 'llama']) {
      petData$.next({ petType }); expect(component.pet).toBe(petType as any);
    }
    component.ngOnDestroy(); petData$.next({ petType: 'owl' }); expect(component.pet).toBe('llama');
  });

  it('drops stale responses when refreshed and when the account changes', () => {
    const { component, learning, auth } = setup();
    const old = new Subject<any>();
    learning.fetchLearningPage.and.returnValue(old);
    component.ngOnInit();
    learning.fetchLearningPage.and.returnValue(of({ items: [card(4, 'quiz')], page: 0, totalPages: 1, totalCompleted: 0, totalPending: 1 }));
    component.reload(); old.next({ items: [card(999, 'quiz')] });
    expect(component.items.map(item => item.id)).toEqual([4]);
    const pending = new Subject<any>();
    learning.fetchLearningPage.and.returnValue(pending); component.reload();
    auth.getUserId.and.returnValue('10'); pending.next({ items: [card(999, 'quiz')] }); pending.complete();
    expect(component.items).toEqual([]);
    component.ngOnDestroy();
  });

  it('resets filters on tab changes while emitting the existing navigation action', () => {
    const { component } = setup(); component.ngOnInit();
    component.progress = 'completed'; component.category = 'Education'; component.query = 'quiz';
    const change = spyOn(component.tabChange, 'emit'); component.selectTab('articles');
    expect(change).toHaveBeenCalledOnceWith('articles');
    expect(component.progress).toBe('all'); expect(component.category).toBe(''); expect(component.query).toBe('');
    component.ngOnChanges({ tab: new SimpleChange('quizzes', 'articles', false) });
    component.openItem.emit(component.items[0]);
    component.ngOnDestroy();
  });

  it('preserves course metadata and uses real extra coins', () => {
    const { component } = setup(); component.tab = 'masterclass'; component.ngOnInit();
    const item = component.items[0];
    expect(component.lessons(item)).toBe(15); expect(component.duration(item)).toBe('30 min');
    expect(item.image).toBe('course.webp'); expect(item.coins).toBe(80);
    expect(component.bonus(item)).toBe(0);
    expect(component.bonus({ ...item, rawData: { extraCoinsByParent: 12 } })).toBe(12);
    component.ngOnDestroy();
  });
});
