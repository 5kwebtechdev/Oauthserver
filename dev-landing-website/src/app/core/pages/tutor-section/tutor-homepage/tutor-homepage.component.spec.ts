import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TutorHomepageComponent } from './tutor-homepage.component';

describe('TutorHomepageComponent', () => {
  let fixture: ComponentFixture<TutorHomepageComponent>;
  let component: TutorHomepageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorHomepageComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TutorHomepageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selectedFiltersMap starts empty', () => {
    expect(component.selectedFiltersMap.size).toBe(0);
  });

  it('applyFilters closes the filter panel', () => {
    component.showFilters = true;
    component.applyFilters();
    expect(component.showFilters).toBeFalse();
  });

  it('clearFilters resets selectedFiltersMap', () => {
    component.selectedFiltersMap.set('grade', new Set(['Third']));
    component.clearFilters();
    expect(component.selectedFiltersMap.size).toBe(0);
  });

  it('getSelectedFilters returns only non-empty filter sets', () => {
    component.selectedFiltersMap.set('grade', new Set(['Third']));
    component.selectedFiltersMap.set('mode', new Set());
    const result = component.getSelectedFilters();
    expect(result.filters['grade']).toEqual(['Third']);
    expect(result.filters['mode']).toBeUndefined();
  });
});
