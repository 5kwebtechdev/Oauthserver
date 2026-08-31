import { of, Subject } from 'rxjs';
import { TutorCardComponent } from './tutor-card.component';
import { Tutor } from '../../../models/tutor.model';

describe('TutorCardComponent counselor preview', () => {
  const counselor = { id: 42, name: 'Test Counselor', subjects: ['Study skills'], hourlyRate: 500 } as Tutor;
  let component: TutorCardComponent;
  let router: jasmine.SpyObj<any>;
  let service: jasmine.SpyObj<any>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    service = jasmine.createSpyObj('TutorService', ['getTutorsByEntityType']);
    service.getTutorsByEntityType.and.returnValue(of([counselor]));
    component = new TutorCardComponent(router, service, {} as any, {} as any, {} as any);
  });

  afterEach(() => component.ngOnDestroy());

  it('loads counselors inline without navigating and reuses the loaded list', () => {
    const category = component.categories.find(c => c.key === 'counselors')!;
    component.selectCategory(category);
    expect(component.selectedCategoryKey).toBe('counselors');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(service.getTutorsByEntityType).toHaveBeenCalledOnceWith('COUNSELOR');
    expect(component.visibleExternalPreviews[0].name).toBe('Test Counselor');
    expect(component.visibleExternalPreviews[0].fee).toBe(500);
    expect(component.showViewAll).toBeTrue();
    component.selectCategory(category);
    expect(service.getTutorsByEntityType).toHaveBeenCalledTimes(1);
  });

  it('does not let another category loading hide counselor results', () => {
    const response = new Subject<Tutor[]>();
    service.getTutorsByEntityType.and.returnValue(response);
    component.isLoading = true;
    component.selectCategory(component.categories.find(c => c.key === 'counselors')!);
    expect(component.isSelectedCategoryLoading).toBeTrue();
    response.next([]);
    expect(component.isSelectedCategoryLoading).toBeFalse();
    expect(component.visibleExternalPreviews).toEqual([]);
    expect(component.showViewAll).toBeFalse();
  });

  it('navigates only when a counselor profile or view-all is requested', () => {
    component.selectCategory(component.categories.find(c => c.key === 'counselors')!);
    component.onViewCounselorProfile(counselor);
    expect(router.navigate).toHaveBeenCalledWith(['/authed/counselors', 42], { state: { tutor: counselor } });
    component.onViewAll();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/authed/counselors');
  });
});
