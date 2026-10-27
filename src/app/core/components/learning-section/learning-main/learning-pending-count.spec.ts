import { of, Subject } from 'rxjs';
import { LearningCategorySummary } from 'src/app/core/models/learning.models';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningMainComponent } from './learning-main.component';

describe('Learning pending category counts', () => {
  it('keeps the selected child ID paired with their age when loading MasterClass categories', () => {
    const getCategories = jasmine.createSpy('getCategories').and.returnValue(of([]));
    const component = Object.create(LearningMainComponent.prototype) as LearningMainComponent;
    Object.assign(component as any, {
      parentView: true,
      selectedChildId: 301,
      selectedChild: { id: 301, age: 11 },
      academyService: { getCategories },
    });

    (component as any).fetchMasterClassCategories().subscribe();
    expect(getCategories).toHaveBeenCalledWith(11, 301);

    Object.assign(component as any, {
      selectedChildId: 302,
      selectedChild: { id: 302, age: 15 },
    });
    (component as any).fetchMasterClassCategories().subscribe();
    expect(getCategories).toHaveBeenCalledWith(15, 302);
  });

  it('prefers the article-specific pending count over a generic summary total', () => {
    const service = Object.create(LearningService.prototype) as LearningService;
    const resolve = (service as any).resolvePendingCategoryCount.bind(service);

    expect(resolve({ count: 4, pending: 4, pendingCount: 4, pendingArticleCount: 3 }, 'article')).toBe(3);
    expect(resolve({ totalCount: 4, completedArticleCount: 1 }, 'article')).toBe(3);
  });

  it('keeps the outer card and detail heading in sync with the Pending tab after refresh', () => {
    const category: LearningCategorySummary = { id: 12, categoryName: 'Education', pendingCount: 4, count: 4 };
    let completed = 1;
    const makeItems = () => Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      title: `Article ${index + 1}`,
      type: 'article' as const,
      rawData: { alreadyRead: index < completed }
    }));
    const component = Object.create(LearningMainComponent.prototype) as LearningMainComponent;
    Object.assign(component as any, {
      selectedCategory: 'articles', parentView: false, childView: true,
      categoryItems: { puzzles: [], quizzes: [], articles: [category], masterclass: [] },
      authService: { getUserId: () => 7, getCurrentUserAge: () => 14 },
      learningService: { fetchArticlesForLearningCategory: () => of(makeItems()) },
      destroy$: new Subject<void>(), childRequestCancel$: new Subject<void>()
    });
    spyOn(component as any, 'scrollLearningToTop').and.stub();

    component.onCategoryCardClick(category);
    expect(component.getParentStatusCount('pending')).toBe(3);
    expect(component.getCategoryCountText(component.selectedCategoryItem!)).toBe('3 pending');
    component.closeCategoryContent();
    expect(component.getCategoryCountText(component.categoryItems.articles[0])).toBe('3 pending');

    completed = 2;
    component.onCategoryCardClick(component.categoryItems.articles[0]);
    expect(component.getParentStatusCount('pending')).toBe(2);
    expect(component.getCategoryCountText(component.categoryItems.articles[0])).toBe('2 pending');
  });
});
