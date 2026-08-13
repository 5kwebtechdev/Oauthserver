import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { SupermeDropdownComponent } from './superme-dropdown.component';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
describe('SupermeDropdownComponent', () => {
  let component: SupermeDropdownComponent;
  let fixture: ComponentFixture<SupermeDropdownComponent>;
  let testForm: FormGroup;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ReactiveFormsModule]
    }).compileComponents();
    testForm = new FormGroup({ dropdown: new FormControl() });
    fixture = TestBed.createComponent(SupermeDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should toggle dropdown when clicked', () => {
    expect(component.isOpen).toBeFalse();
    component.toggleDropdown();
    expect(component.isOpen).toBeTrue();
    component.toggleDropdown();
    expect(component.isOpen).toBeFalse();
  });
  it('should select an option and update value', () => {
    const onChangeSpy = spyOn<any>(component, 'onChange');
    const testOption = { key: 'test', value: 'Test Option' };
    component.selectOption(testOption);
    expect(component.selectedOption).toEqual(testOption);
    expect(onChangeSpy).toHaveBeenCalledWith(testOption);
    expect(component.isOpen).toBeFalse();
  });

  it('filters options using whitespace-safe matching', () => {
    component.options = [
      { key: 'math', value: 'Engineering Mathematics' },
      { key: 'dsa', value: 'Data Structures & Algorithms' }
    ];
    component.searchTerm = 'data    structures';

    expect(component.filteredOptions).toEqual([{ key: 'dsa', value: 'Data Structures & Algorithms' }]);
  });

  it('uses an attached menu for the Second-Hand Books variant', () => {
    component.variant = 'second-hand-books';
    component.width = 'full-width';
    component.searchable = true;
    component.options = [{ key: 'nursery', value: 'Nursery' }];
    fixture.detectChanges();

    component.toggleDropdown();
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('.dropdown-selector') as HTMLElement;
    const menu = fixture.nativeElement.querySelector('.dropdown-options') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(getComputedStyle(menu).position).toBe('absolute');
    expect(getComputedStyle(menu).top).toBe('56px');
    expect(getComputedStyle(selector).minHeight).toBe('56px');
  });
});
