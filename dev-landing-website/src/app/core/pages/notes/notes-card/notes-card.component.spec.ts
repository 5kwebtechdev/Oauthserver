import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesCardComponent } from './notes-card.component';

describe('NotesCardComponent', () => {
  let component: NotesCardComponent;
  let fixture: ComponentFixture<NotesCardComponent>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotesCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NotesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display note excerpt', () => {
    const compiled = fixture.nativeElement;
    const excerptElement = compiled.querySelector('.excerpt-text');
    expect(excerptElement.textContent).toContain(component.truncatedExcerpt);
  });

  it('should display note title', () => {
    const compiled = fixture.nativeElement;
    const titleElement = compiled.querySelector('.meta-title');
    expect(titleElement.textContent).toContain(component.truncatedTitle);
  });

  it('should display note date', () => {
    const compiled = fixture.nativeElement;
    const dateElement = compiled.querySelector('.meta-date');
    expect(dateElement.textContent).toContain(component.note.date);
  });

  it('should display note tag', () => {
    const compiled = fixture.nativeElement;
    const tagElement = compiled.querySelector('.tag-label');
    expect(tagElement.textContent).toContain(component.note.tag);
  });

  it('should emit cardClick event when clicked', () => {
    spyOn(component.cardClick, 'emit');
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.notes-card');
    
    cardElement.click();
    
    expect(component.cardClick.emit).toHaveBeenCalledWith(component.note);
  });

  it('should emit cardClick event on Enter key press', () => {
    spyOn(component.cardClick, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    
    component.onKeyPress(event);
    
    expect(component.cardClick.emit).toHaveBeenCalledWith(component.note);
  });

  it('should emit cardClick event on Space key press', () => {
    spyOn(component.cardClick, 'emit');
    const event = new KeyboardEvent('keydown', { key: ' ' });
    
    component.onKeyPress(event);
    
    expect(component.cardClick.emit).toHaveBeenCalledWith(component.note);
  });

  it('should have proper accessibility attributes', () => {
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.notes-card');
    
    expect(cardElement.getAttribute('role')).toBe('button');
    expect(cardElement.getAttribute('tabindex')).toBe('0');
    expect(cardElement.getAttribute('aria-label')).toContain(component.note.title);
  });

  it('should have proper CSS classes', () => {
    const compiled = fixture.nativeElement;
    
    expect(compiled.querySelector('.notes-card')).toBeTruthy();
    expect(compiled.querySelector('.notes-card__excerpt')).toBeTruthy();
    expect(compiled.querySelector('.notes-card__footer')).toBeTruthy();
    expect(compiled.querySelector('.notes-card__meta')).toBeTruthy();
    expect(compiled.querySelector('.notes-card__tag')).toBeTruthy();
  });
});
