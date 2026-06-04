import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { MindfulDropdownComponent } from './mindful-dropdown.component';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
describe('MindfulDropdownComponent', () => {
  let component: MindfulDropdownComponent;
  let fixture: ComponentFixture<MindfulDropdownComponent>;
  let testForm: FormGroup;
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), ReactiveFormsModule]
    }).compileComponents();
    testForm = new FormGroup({ dropdown: new FormControl() });
    fixture = TestBed.createComponent(MindfulDropdownComponent);
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
});
