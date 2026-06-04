import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JournalOutputComponent } from './journal-output.component';

describe('JournalOutputComponent', () => {
  let component: JournalOutputComponent;
  let fixture: ComponentFixture<JournalOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalOutputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalOutputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty state when no entries', () => {
    component.entries = [];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty')?.textContent).toContain('No journal entries yet');
  });
});
