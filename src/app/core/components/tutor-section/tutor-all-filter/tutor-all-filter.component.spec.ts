import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorAllFilterComponent } from './tutor-all-filter.component';
import { By } from '@angular/platform-browser';

describe('TutorAllFilterComponent', () => {
  let component: TutorAllFilterComponent;
  let fixture: ComponentFixture<TutorAllFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TutorAllFilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(TutorAllFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => expect(component).toBeTruthy());

  it('toggles checkboxes and emits on apply', () => {
    // Using the template's subject checkboxes
    fixture.detectChanges();

    const mathCheckbox = fixture.debugElement.query(By.css('input[type="checkbox"][ (change) ]'));
    // Fallback: query first checkbox
    const checkboxes = fixture.debugElement.queryAll(By.css('.subject-list input[type="checkbox"]'));
    expect(checkboxes.length).toBeGreaterThan(0);

    spyOn(component.filterChange, 'emit');

    // simulate clicking the first checkbox
    checkboxes[0].triggerEventHandler('change', { target: { checked: true } });
    fixture.detectChanges();

    // call apply and expect emit with at least one selected
    component.apply();
    expect(component.filterChange.emit).toHaveBeenCalled();
    const emitted = (component.filterChange.emit as jasmine.Spy).calls.mostRecent().args[0];
    expect(Array.isArray(emitted)).toBeTrue();
    expect(emitted.length).toBeGreaterThan(0);
  });
});
