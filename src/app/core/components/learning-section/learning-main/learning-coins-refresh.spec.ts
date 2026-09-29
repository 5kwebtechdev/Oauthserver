import { of, Subject, throwError } from 'rxjs';
import { LearningMainComponent } from './learning-main.component';

describe('Learning return coin refresh', () => {
  function screen(parentView = false, category = false, fails = false) {
    return {
      parentView, hasSelectedChild: true, selectedCategory: 'challenges',
      selectedCategoryItem: category ? { id: 1 } : null,
      destroy$: new Subject<void>(),
      userService: { refreshStats: jasmine.createSpy('refreshStats').and.returnValue(
        fails ? throwError(() => new Error('offline')) : of({ coins: 69 })) },
      onCategoryCardClick: jasmine.createSpy('onCategoryCardClick'),
      loadTab: jasmine.createSpy('loadTab')
    } as any;
  }

  for (const category of [true, false]) {
    it(`refreshes coins when returning to ${category ? 'quiz category' : 'Learning home'}`, () => {
      const component = screen(false, category);
      LearningMainComponent.prototype.ionViewWillEnter.call(component);
      expect(component.userService.refreshStats).toHaveBeenCalledTimes(1);
      expect(category ? component.onCategoryCardClick : component.loadTab).toHaveBeenCalled();
    });
  }
  it('does not refresh the parent balance for a selected child', () => {
    const component = screen(true, true);
    LearningMainComponent.prototype.ionViewWillEnter.call(component);
    expect(component.userService.refreshStats).not.toHaveBeenCalled();
  });
  it('still refreshes the listing if the stats request fails', () => {
    const component = screen(false, true, true);
    expect(() => LearningMainComponent.prototype.ionViewWillEnter.call(component)).not.toThrow();
    expect(component.onCategoryCardClick).toHaveBeenCalled();
  });
});
