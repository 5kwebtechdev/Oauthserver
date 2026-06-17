import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorListComponent } from './tutor-list.component';
import { By } from '@angular/platform-browser';

describe('TutorListComponent', () => {
  let component: TutorListComponent;
  let fixture: ComponentFixture<TutorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TutorListComponent] }).compileComponents();
    fixture = TestBed.createComponent(TutorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => expect(component).toBeTruthy());

  it('renders tutors and emits viewProfile', () => {
    component.tutors = [{ name: 'A' }, { name: 'B' }];
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.tutors-section__card'));
    expect(items.length).toBe(2);

    spyOn(component.viewProfile, 'emit');
    const btn = items[0].query(By.css('superme-button'));
    btn.triggerEventHandler('click', null);
    expect(component.viewProfile.emit).toHaveBeenCalledWith(component.tutors[0]);
  });
});
