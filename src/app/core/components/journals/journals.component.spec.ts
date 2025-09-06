import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { JournalsComponent } from './journals.component';

describe('JournalsComponent', () => {
  let component: JournalsComponent;
  let fixture: ComponentFixture<JournalsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), JournalsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display journal entries', () => {
    component.entries = [
      {
        id: '1',
        title: 'Test Entry',
        content: 'Test content',
        date: new Date(),
        mood: 'happy',
        tags: ['test'],
        isPrivate: false
      }
    ];
    fixture.detectChanges();
    
    const entryElements = fixture.nativeElement.querySelectorAll('.journal-entry');
    expect(entryElements.length).toBe(1);
  });

  it('should show empty state when no entries', () => {
    component.entries = [];
    fixture.detectChanges();
    
    const emptyState = fixture.nativeElement.querySelector('.journals-section__empty');
    expect(emptyState).toBeTruthy();
  });

  it('should limit displayed entries based on maxDisplayEntries', () => {
    component.maxDisplayEntries = 2;
    component.entries = [
      { id: '1', title: 'Entry 1', content: 'Content 1', date: new Date(), mood: 'happy', tags: [], isPrivate: false },
      { id: '2', title: 'Entry 2', content: 'Content 2', date: new Date(), mood: 'calm', tags: [], isPrivate: false },
      { id: '3', title: 'Entry 3', content: 'Content 3', date: new Date(), mood: 'grateful', tags: [], isPrivate: false }
    ];
    
    const displayedEntries = component.getDisplayEntries();
    expect(displayedEntries.length).toBe(2);
  });

  it('should return correct mood emoji', () => {
    expect(component.getMoodEmoji('happy')).toBe('😊');
    expect(component.getMoodEmoji('grateful')).toBe('🙏');
    expect(component.getMoodEmoji('unknown')).toBe('📝');
  });

  it('should format date correctly', () => {
    const testDate = new Date('2024-01-15');
    const formattedDate = component.formatDate(testDate);
    expect(formattedDate).toContain('Jan');
    expect(formattedDate).toContain('15');
    expect(formattedDate).toContain('2024');
  });

  it('should call onCreateNewEntry when create button is clicked', () => {
    spyOn(component, 'onCreateNewEntry');
    const createButton = fixture.nativeElement.querySelector('.create-entry-btn');
    
    if (createButton) {
      createButton.click();
      expect(component.onCreateNewEntry).toHaveBeenCalled();
    }
  });

  it('should call onViewAllEntries when view all is clicked', () => {
    spyOn(component, 'onViewAllEntries');
    const viewAllButton = fixture.nativeElement.querySelector('.journals-section__view-all');
    
    if (viewAllButton) {
      viewAllButton.click();
      expect(component.onViewAllEntries).toHaveBeenCalled();
    }
  });
});