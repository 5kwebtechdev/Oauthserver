import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PetAgeService, PetType } from 'src/app/core/services/pet-age.service';
import { ScoreStatusComponent } from './score-status.component';

describe('Quiz score status', () => {
  let fixture: ComponentFixture<ScoreStatusComponent>;
  let pets: BehaviorSubject<{ petType: PetType }>;

  beforeEach(async () => {
    pets = new BehaviorSubject<{ petType: PetType }>({ petType: 'panda' });
    await TestBed.configureTestingModule({
      imports: [ScoreStatusComponent],
      providers: [{ provide: PetAgeService, useValue: { petData$: pets } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ScoreStatusComponent);
    fixture.componentInstance.totalQuestions = 100;
  });

  for (const score of [0, 20, 59, 60, 75, 99, 100]) {
    it(`renders score ${score} in the correct state`, () => {
      fixture.componentInstance.score = score;
      fixture.componentInstance.correctAnswers = score;
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('section')?.getAttribute('aria-label')).toBe(score >= 60 ? 'Good' : 'Needs Attention');
      expect(root.querySelector('.score-count')?.textContent).toBe(`${score} out of 100`);
      expect(root.querySelector('.score-message')?.textContent).toBe(score >= 60
        ? "Great job! You're on a roll" : 'Keep learning, you’ll get there!');
      expect(root.querySelector('.score-card')?.classList.contains('score-card--good')).toBe(score >= 60);
    });
  }

  it('selects the matching Good and Needs Attention artwork for each pet', () => {
    for (const petType of ['panda', 'owl', 'dragon', 'llama'] as PetType[]) {
      pets.next({ petType });
      for (const score of [59, 60]) {
        fixture.componentInstance.score = score;
        fixture.detectChanges();
        const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
        expect(image.getAttribute('src')).toBe(
          `assets/figma/quiz-score/${petType}-${score >= 60 ? 'good' : 'needs-attention'}.png`
        );
      }
    }
  });
});
