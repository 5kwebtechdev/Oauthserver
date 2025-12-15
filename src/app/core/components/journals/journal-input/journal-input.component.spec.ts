import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { JournalInputComponent } from './journal-input.component';

describe('JournalInputComponent', () => {
  let component: JournalInputComponent;
  let fixture: ComponentFixture<JournalInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JournalInputComponent],
      imports: [FormsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JournalInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.text).toBe('');
    expect(component.selected).toEqual({});
    expect(component.sections.length).toBe(7); // All sections defined
  });

  it('should emit save with text', () => {
    spyOn(component.save, 'emit');
    component.text = 'test note';
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('.save')).nativeElement as HTMLButtonElement;
    btn.click();
    expect(component.save.emit).toHaveBeenCalledWith('test note');
  });

  it('should select and deselect options correctly', () => {
    // Select an option
    component.selectOption('emotions', 0);
    expect(component.selected['emotions']).toBe(0);
    expect(component.isSelected('emotions', 0)).toBe(true);

    // Select again to deselect
    component.selectOption('emotions', 0);
    expect(component.selected['emotions']).toBe(null);
    expect(component.isSelected('emotions', 0)).toBe(false);
  });

  it('should track sections by key', () => {
    const section = component.sections[0];
    expect(component.trackBySection(0, section)).toBe(section.key);
  });

  it('should reset form correctly', () => {
    component.text = 'test';
    component.selected = { emotions: 0 };
    component.selectedFile = {} as File;
    component.imagePreviewUrl = 'test.jpg';
    component.uploadedImageUrl = 'uploaded.jpg';

    component.resetForm();

    expect(component.text).toBe('');
    expect(component.selected).toEqual({});
    expect(component.selectedFile).toBe(null);
    expect(component.imagePreviewUrl).toBe(null);
    expect(component.uploadedImageUrl).toBe(null);
  });
});
