import { convertToParamMap } from '@angular/router';
import { of, Subject } from 'rxjs';
import { LearningSectionComponent } from './learning-section.component';
import { LearningChallengeCardComponent } from './learning-card/learning-challenge-card.component';
import { LearningDescriptionComponent } from './learning-description/learning-description.component';
import { LearningArticleCardComponent } from './learning-card/learning-article-card.component';
import { ArticlePageComponent } from './article-page/article-page.component';

describe('Parent Home quiz assignment flow', () => {
  const quiz: any = { id: 42, challengeId: 42, type: 'quiz', title: 'Chemistry quiz', name: 'Chemistry quiz' };

  it('opens the assignment preview without assigning or navigating twice', () => {
    const navigate = jasmine.createSpy('navigate');
    const section = Object.create(LearningSectionComponent.prototype) as LearningSectionComponent;
    Object.assign(section, {
      rewardMode: true,
      forUserId: 7,
      source: '/content?view=parent',
      router: { navigate },
      rewardSelected: { emit: jasmine.createSpy('emit') }
    });
    section.onItemClick(quiz, 0);

    expect(section.rewardSelected.emit).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledOnceWith(['/authed/content/description', 42], jasmine.objectContaining({
      queryParams: { parentAssign: '1', assignmentCoins: 20, childId: 7 }
    }));

    const card = Object.create(LearningChallengeCardComponent.prototype) as LearningChallengeCardComponent;
    Object.assign(card, { item: quiz, index: 0, parentPreviewOnly: true, router: { navigate } });
    card.cardClick = { emit: jasmine.createSpy('emit') } as any;
    card.onCardClick();
    expect(card.cardClick.emit).toHaveBeenCalledOnceWith({ item: quiz, index: 0 });
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('assigns only after the parent taps Assign and never starts gameplay', () => {
    const navigate = jasmine.createSpy('navigate');
    const assignChallenge = jasmine.createSpy('assignChallenge').and.returnValue(of({}));
    const route = {
      snapshot: {
        queryParamMap: convertToParamMap({ parentAssign: '1', childId: '7', assignmentCoins: '20' }),
        paramMap: convertToParamMap({ id: '42' })
      }
    } as any;
    const router = { getCurrentNavigation: () => null, navigate } as any;
    const service = { fetchChallengeById: () => of(quiz), assignChallenge } as any;
    const preview = new LearningDescriptionComponent(router, route, service);

    preview.ngOnInit();
    expect(preview.isParentAssignment).toBeTrue();
    expect(assignChallenge).not.toHaveBeenCalled();
    preview.startJourney();
    expect(navigate).not.toHaveBeenCalled();

    preview.assignToChild();
    expect(assignChallenge).toHaveBeenCalledOnceWith(42, [7], 20);
    expect(preview.assignmentComplete).toBeTrue();
    preview.assignToChild();
    expect(assignChallenge).toHaveBeenCalledTimes(1);
  });

  it('keeps the child quiz card navigation unchanged', () => {
    const navigate = jasmine.createSpy('navigate');
    const card = Object.create(LearningChallengeCardComponent.prototype) as LearningChallengeCardComponent;
    Object.assign(card, {
      item: quiz,
      index: 0,
      parentPreviewOnly: false,
      source: '/content',
      router: { navigate },
      cardClick: { emit: jasmine.createSpy('emit') }
    });

    card.onCardClick();
    expect(navigate).toHaveBeenCalledOnceWith(['/authed/content/description', 42], {
      state: { source: '/content' }
    });
  });

  it('opens a parent article without assigning until its detail CTA is tapped', () => {
    const navigate = jasmine.createSpy('navigate');
    const assignArticle = jasmine.createSpy('assignArticle').and.returnValue(of({ assignedAt: 'now' }));
    const article: any = { id: 52, type: 'article', title: 'Positive Thinking', rawData: { alreadyAssignedToThisUser: false } };
    const section = Object.create(LearningSectionComponent.prototype) as LearningSectionComponent;
    Object.assign(section, { rewardMode: true, rewardSelected: { emit: jasmine.createSpy('emit') } });
    section.onItemClick(article, 0);
    expect(section.rewardSelected.emit).not.toHaveBeenCalled();
    expect(assignArticle).not.toHaveBeenCalled();

    const card = Object.create(LearningArticleCardComponent.prototype) as LearningArticleCardComponent;
    Object.assign(card, { item: article, source: '/content?view=parent', forUserId: 7, router: { navigate },
      cardClick: { emit: jasmine.createSpy('emit') } });
    card.onCardClick();
    expect(navigate).toHaveBeenCalledOnceWith(['/content/article', 52], jasmine.objectContaining({
      queryParams: { parentAssign: '1', childId: 7 },
      state: jasmine.objectContaining({ selectedChildId: 7, alreadyAssigned: false })
    }));

    const page = Object.create(ArticlePageComponent.prototype) as ArticlePageComponent;
    Object.assign(page, { article: { id: 52 }, isParentAssignment: true, parentAssignmentChildId: 7,
      assignmentCoins: 20, parentAssignmentComplete: false, learningService: { assignArticle }, destroy$: new Subject<void>() });
    page.assignToChild();
    expect(assignArticle).toHaveBeenCalledOnceWith(52, [7], 20);
    expect(page.parentAssignmentComplete).toBeTrue();
    page.assignToChild();
    expect(assignArticle).toHaveBeenCalledTimes(1);
  });
});
