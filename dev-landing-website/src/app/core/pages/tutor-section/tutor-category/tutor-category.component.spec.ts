import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TutorCategoryComponent } from './tutor-category.component';

describe('TutorCategoryComponent', () => {
  let component: TutorCategoryComponent;
  let fixture: ComponentFixture<TutorCategoryComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TutorCategoryComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TutorCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have categories defined', () => {
    expect(component.categories).toBeDefined();
    expect(component.categories.length).toBeGreaterThan(0);
  });

  it('should navigate back when goBack is called', () => {
    component.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should navigate to category route when clicked and not coming soon', () => {
    const category = component.categories.find(c => !c.isComingSoon && c.route);
    if (category) {
      component.onCategoryClick(category);
      expect(mockRouter.navigate).toHaveBeenCalledWith([category.route]);
    }
  });

  it('should not navigate when coming soon category is clicked', () => {
    const comingSoonCategory = component.categories.find(c => c.isComingSoon);
    if (comingSoonCategory) {
      component.onCategoryClick(comingSoonCategory);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }
  });

  it('should change banner index when nextBanner is called', () => {
    const initialIndex = component.currentBannerIndex;
    component.nextBanner();
    expect(component.currentBannerIndex).not.toBe(initialIndex);
  });

  it('should change banner index when prevBanner is called', () => {
    component.currentBannerIndex = 1;
    component.prevBanner();
    expect(component.currentBannerIndex).toBe(0);
  });

  it('should set banner index when goToBanner is called', () => {
    component.goToBanner(0);
    expect(component.currentBannerIndex).toBe(0);
  });
});
