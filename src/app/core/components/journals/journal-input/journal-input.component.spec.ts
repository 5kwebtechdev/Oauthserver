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

  it('emits save with text', () => {
    spyOn(component.save, 'emit');
    component.text = 'test note';
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('.save')).nativeElement as HTMLButtonElement;
    btn.click();
    expect(component.save.emit).toHaveBeenCalledWith('test note');
  });
});
