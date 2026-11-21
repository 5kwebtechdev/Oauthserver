import { EMPTY } from 'rxjs';
import { QuestionsComponent } from './questions/questions.component';
import { ResultPageComponent } from './result-page/result-page.component';

describe('Challenge batch API contract', () => {
  const apply = (result: any) => {
    const target: any = {};
    (ResultPageComponent.prototype as any).applySubmissionResult.call(target, result);
    return target;
  };

  it('displays the server totalCorrect and totalQuestions', () => {
    const result = apply({ totalCorrect: 3, totalQuestions: 5, percentageScore: 60 });
    expect(result.correctAnswers).toBe(3);
    expect(result.totalQuestions).toBe(5);
    expect(result.scorePercentage).toBe(60);
  });

  it('preserves a genuine zero and supports legacy scores', () => {
    expect(apply({ totalCorrect: 0, correctCount: 4 }).correctAnswers).toBe(0);
    expect(apply({ totalCorrect: null, correctCount: 4 }).correctAnswers).toBe(4);
    expect(apply({ totalQuestions: 0 }).totalQuestions).toBe(0);
  });

  it('submits option IDs, not text, for MCQ, boolean and visual questions', () => {
    const submit = jasmine.createSpy('submit').and.returnValue(EMPTY);
    const quiz = new QuestionsComponent(null!, null!, { submitChallengeNewFormat: submit } as any, null!, null!, null!);
    quiz.challenge = { challengeId: 7 } as any;
    quiz.questions = [{ id: 101, type: 'mcq' }, { id: 102, type: 'true-false' }, { id: 103, type: 'visual' }, { id: 104, type: 'mcq' }] as any;
    quiz.questionAnswers = {
      101: { selected: 'Answer text', selectedOptionId: 501, correct: false },
      102: { selected: 'true', selectedOptionId: 507, correct: false },
      103: { selected: 'Picture text', selectedOptionId: 509, correct: false },
      104: { selected: null, selectedOptionId: null, correct: false },
    };
    spyOn(window, 'confirm').and.returnValue(true);
    quiz.submitChallengeAnswers();
    expect(submit.calls.mostRecent().args[1].questionAnswers).toEqual({ '101': 501, '102': 507, '103': 509 });
    expect(submit.calls.mostRecent().args[1].skippedQuestions).toEqual([104]);
  });
});
