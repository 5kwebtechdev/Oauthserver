import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TutorCardComponent } from './tutor-card.component';
import { ITutor } from '../../../models/tutor.model';

describe('TutorCardComponent', () => {
  let component: TutorCardComponent;
  let fixture: ComponentFixture<TutorCardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockTutor: ITutor = {
    id: '1',
    name: 'Rahul Sharma',
    avatar: 'assets/images/tutor-avatar.jpg',
    rating: 400,
    experience: '3-5 years Exp',
    subjects: ['Mathematics', 'Chemistry', 'Science', 'English', 'History'],
    classes: ['Class 8', 'Class 10', 'Class 11'],
    availableHours: 'Mon,Wed,Fri - 5:00PM-7:00PM',
    hourlyRate: 800,
    price: 800,
    hearts: 400,
    priceUnit: '/ Hour'
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TutorCardComponent],
      providers: [{ provide: Router, useValue: mockRouter }]
    }).compileComponents();

    fixture = TestBed.createComponent(TutorCardComponent);
    component = fixture.componentInstance;
    component.tutor = mockTutor;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Input & Properties', () => {
    it('should accept tutor input', () => {
      expect(component.tutor).toEqual(mockTutor);
    });

    it('should have correct avatar URL when provided', () => {
      expect(component.avatarUrl).toBe(mockTutor.avatar!);
    });

    it('should use default avatar when not provided', () => {
      component.tutor = { ...mockTutor, avatar: '' };
      expect(component.avatarUrl).toBe(component.defaultAvatar);
    });

    it('should display correct experience format', () => {
      expect(component.experienceDisplay).toBe('400 | 3-5 years Exp');
    });

    it('should handle missing experience gracefully', () => {
      const tutorWithoutExp = { ...mockTutor, rating: 0, experience: '' };
      component.tutor = tutorWithoutExp;
      expect(component.experienceDisplay).toBe('0 | ');
    });
  });

  describe('Subjects Display', () => {
    it('should display first 3 subjects with +count for remaining', () => {
      expect(component.subjectsDisplay).toBe('Mathematics, Chemistry, Science +2');
    });

    it('should display all subjects when 3 or fewer', () => {
      component.tutor = { ...mockTutor, subjects: ['Mathematics', 'Chemistry'] };
      expect(component.subjectsDisplay).toBe('Mathematics, Chemistry');
    });

    it('should handle empty subjects array', () => {
      component.tutor = { ...mockTutor, subjects: [] };
      expect(component.subjectsDisplay).toBe('');
    });

    it('should handle undefined subjects', () => {
      component.tutor = { ...mockTutor, subjects: undefined as any };
      expect(component.subjectsDisplay).toBe('');
    });
  });

  describe('Classes Display', () => {
    it('should display all classes joined by comma', () => {
      expect(component.classesDisplay).toBe('Class 8, Class 10, Class 11');
    });

    it('should handle empty classes array', () => {
      component.tutor = { ...mockTutor, classes: [] };
      expect(component.classesDisplay).toBe('');
    });

    it('should handle undefined classes', () => {
      component.tutor = { ...mockTutor, classes: undefined as any };
      expect(component.classesDisplay).toBe('');
    });
  });

  describe('View Profile Click Event', () => {
    it('should emit viewProfileClick event with tutor id', (done) => {
      component.viewProfileClick.subscribe((id: string) => {
        expect(id).toBe(mockTutor.id!);
        done();
      });

      component.onViewProfileClick();
    });

    it('should navigate to tutor profile page', () => {
      component.onViewProfileClick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tutor', mockTutor.id]);
    });

    it('should call onViewProfileClick when card is clicked', () => {
      spyOn(component, 'onViewProfileClick');
      component.onCardClick();
      expect(component.onViewProfileClick).toHaveBeenCalled();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should handle Enter key press', () => {
      spyOn(component, 'onViewProfileClick');
      const event = new KeyboardEvent('keyup', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onCardKeyPress(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onViewProfileClick).toHaveBeenCalled();
    });

    it('should handle Space key press', () => {
      spyOn(component, 'onViewProfileClick');
      const event = new KeyboardEvent('keyup', { key: ' ' });
      spyOn(event, 'preventDefault');

      component.onCardKeyPress(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.onViewProfileClick).toHaveBeenCalled();
    });

    it('should not trigger onViewProfileClick for other keys', () => {
      spyOn(component, 'onViewProfileClick');
      const event = new KeyboardEvent('keyup', { key: 'a' });

      component.onCardKeyPress(event);

      expect(component.onViewProfileClick).not.toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render tutor name', () => {
      const nameElement = fixture.nativeElement.querySelector('.tutor-name');
      expect(nameElement.textContent).toContain(mockTutor.name);
    });

    it('should render hourly rate', () => {
      const rateElements = fixture.nativeElement.querySelectorAll('.amount, .unit');
      expect(fixture.nativeElement.textContent).toContain((mockTutor.hourlyRate || 0).toString());
    });

    it('should render view profile button', () => {
      const button = fixture.nativeElement.querySelector('.view-profile-btn');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('View Profile');
    });

    it('should render avatar image with lazy loading', () => {
      const avatar = fixture.nativeElement.querySelector('.tutor-avatar');
      expect(avatar).toBeTruthy();
      expect(avatar.getAttribute('loading')).toBe('lazy');
      expect(avatar.getAttribute('src')).toBe(mockTutor.avatar!);
    });

    it('should render available hours', () => {
      const hoursElement = fixture.nativeElement.querySelector('.hours-text');
      expect(hoursElement.textContent).toContain(mockTutor.availableHours);
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      const card = fixture.nativeElement.querySelector('.tutor-card');
      expect(card.getAttribute('role')).toBe('button');
    });

    it('should be keyboard focusable', () => {
      const card = fixture.nativeElement.querySelector('.tutor-card');
      expect(card.getAttribute('tabindex')).toBe('0');
    });

    it('should have aria-label on card', () => {
      const card = fixture.nativeElement.querySelector('.tutor-card');
      expect(card.getAttribute('aria-label')).toContain(mockTutor.name);
    });

    it('should have aria-label on view profile button', () => {
      const button = fixture.nativeElement.querySelector('.view-profile-btn');
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
