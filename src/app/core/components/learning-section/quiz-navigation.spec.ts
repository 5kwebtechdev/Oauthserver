import { LearningDescriptionComponent } from './learning-description/learning-description.component';
import { QuestionsComponent } from './questions/questions.component';
import { ResultPageComponent } from './result-page/result-page.component';

describe('Completed quiz navigation history', () => {
  afterEach(() => sessionStorage.removeItem('superme.challenge-result'));

  it('returns to the learning list without leaving quiz screens behind on Back', () => {
    const stack = ['/authed/dashboard', '/authed/content', '/authed/content/description/7'];
    let navigationState: any;
    const navigate = (url: string, extras: any = {}) => {
      if (extras.replaceUrl) stack[stack.length - 1] = url;
      else stack.push(url);
      navigationState = extras.state;
      return Promise.resolve(true);
    };
    const router = {
      navigate: (commands: any[], extras: any) => navigate(commands.join('/'), extras),
      navigateByUrl: navigate,
      getCurrentNavigation: () => ({ extras: { state: navigationState } })
    } as any;
    const challenge = { challengeId: 7 } as any;
    const introduction = new LearningDescriptionComponent(router, null!, null!);
    introduction.challenge = challenge;
    introduction.startJourney();
    expect(stack[2]).toBe('/authed/content/questions/7');
    const quiz = new QuestionsComponent(router, null!, null!, null!, null!);
    quiz.challenge = challenge;
    (quiz as any).navigateToResult({ totalQuestions: 5, correctCount: 5 });
    expect(stack[2]).toBe('/authed/content/result');
    const result = new ResultPageComponent(router, null!, null!, null!);
    result.onContinue();
    expect(stack[2]).toBe('/authed/content');
    stack.pop(); // Back from the next screen.
    expect(stack[stack.length - 1]).toBe('/authed/content');
    expect(stack.some(url => /description|questions|result/.test(url))).toBeFalse();
    expect(navigationState.completedChallengeId).toBe(7);
  });

  it('also replaces the introduction in the no-challenge fallback', () => {
    const router = { navigate: jasmine.createSpy('navigate') } as any;
    new LearningDescriptionComponent(router, null!, null!).startJourney();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/authed/content/questions'], { replaceUrl: true });
  });

  it('asks before Android Back leaves an unfinished quiz and only quits after confirmation', () => {
    let onHardwareBack: (() => void) | undefined;
    const unsubscribe = jasmine.createSpy('unsubscribe');
    const platform = {
      backButton: {
        subscribeWithPriority: jasmine.createSpy('subscribeWithPriority').and.callFake((priority: number, handler: () => void) => {
          expect(priority).toBeGreaterThan(10); // AppComponent's navigation handler
          onHardwareBack = handler;
          return { unsubscribe };
        })
      }
    } as any;
    const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any;
    const quiz = new QuestionsComponent(router, null!, null!, null!, platform);

    quiz.ionViewWillEnter();
    onHardwareBack!();
    expect(quiz.showLeaveChallengePopup).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    onHardwareBack!();
    expect(quiz.showLeaveChallengePopup).toBeFalse();
    onHardwareBack!();
    quiz.leaveChallengePopupConfig.primaryCTA?.callback?.();
    expect(quiz.showLeaveChallengePopup).toBeFalse();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    onHardwareBack!();
    quiz.leaveChallengePopupConfig.secondaryCTA?.callback?.();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/authed/content');

    quiz.ionViewWillLeave();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
