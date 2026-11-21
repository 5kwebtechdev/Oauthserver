import { convertToParamMap } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { of, throwError } from 'rxjs';
import { LearningService } from '../../services/learning.service';
import { ShareLinkService } from '../../services/share-link.service';
import { SharedListingRedirectComponent } from '../shared-listing-redirect/shared-listing-redirect.component';
import { LearningDescriptionComponent } from './learning-description/learning-description.component';

describe('Quiz slug sharing', () => {
  it('shares the supplied slug and keeps an ID fallback for older responses', () => {
    const links = new ShareLinkService();
    expect(links.buildQuizLink({ challengeId: 417, slug: 'diwali-decoded' }))
      .toMatch(/\/app\/share\/quiz\/diwali-decoded$/);
    expect(links.buildQuizLink({ challengeId: 417, slug: '  ' }))
      .toMatch(/\/app\/share\/quiz\/417$/);
  });

  it('sends slug links to slug lookup and old numeric links to ID lookup', () => {
    const redirect = new SharedListingRedirectComponent(null!, null!, null!);
    expect((redirect as any).internalRoute('quiz', 'diwali-decoded'))
      .toBe('/authed/content/quiz/diwali-decoded');
    expect((redirect as any).internalRoute('quiz', '417'))
      .toBe('/authed/content/description/417');
  });

  it('opens a quiz share in the browser through the authenticated preview route', () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    const navigateByUrl = jasmine.createSpy('navigateByUrl');
    const redirect = new SharedListingRedirectComponent({
      snapshot: { paramMap: convertToParamMap({ type: 'quiz', id: 'diwali-decoded' }) }
    } as any, { navigateByUrl } as any, null!);
    redirect.ngOnInit();
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/authed/content/quiz/diwali-decoded', { replaceUrl: true });
  });

  it('fetches by slug with Bearer auth and the normal challenge parsing', () => {
    const get = jasmine.createSpy('get').and.returnValue(of({
      id: 417, slug: 'diwali-decoded', challengeType: 'QUIZ'
    }));
    const service = new LearningService({ get } as any, { getToken: () => 'test-token' } as any, null!);
    let result: any;
    service.fetchChallengeBySlug('diwali-decoded').subscribe(value => result = value);
    const [url, options] = get.calls.mostRecent().args;
    expect(url).toMatch(/\/challenges\/by-slug\/diwali-decoded$/);
    expect(options.headers.get('Authorization')).toBe('Bearer test-token');
    expect(result.challengeId).toBe(417);
    expect(result.category).toBe('QUIZ');
    expect(result.slug).toBe('diwali-decoded');
  });

  it('handles a missing slug result without starting gameplay', () => {
    const service = new LearningService({
      get: () => throwError(() => ({ status: 404 }))
    } as any, { getToken: () => 'test-token' } as any, null!);
    let result: any = 'pending';
    service.fetchChallengeBySlug('missing').subscribe(value => result = value);
    expect(result).toBeNull();
  });

  for (const identifier of [{ slug: 'diwali-decoded' }, { id: '417' }]) {
    it('loads the preview and starts gameplay with the resolved ID for ' + JSON.stringify(identifier), () => {
      const quiz = { challengeId: 417, slug: 'diwali-decoded', name: 'Diwali Decoded' };
      const service = {
        fetchChallengeBySlug: jasmine.createSpy('slug').and.returnValue(of(quiz)),
        fetchChallengeById: jasmine.createSpy('id').and.returnValue(of(quiz))
      };
      const router = { getCurrentNavigation: () => null, navigate: jasmine.createSpy('navigate') } as any;
      const preview = new LearningDescriptionComponent(router, {
        snapshot: { paramMap: convertToParamMap(identifier), queryParamMap: convertToParamMap({}) }
      } as any, service as any);
      preview.ngOnInit();
      if ('slug' in identifier) {
        expect(service.fetchChallengeBySlug).toHaveBeenCalledOnceWith('diwali-decoded');
        expect(service.fetchChallengeById).not.toHaveBeenCalled();
      } else {
        expect(service.fetchChallengeById).toHaveBeenCalledOnceWith(417);
        expect(service.fetchChallengeBySlug).not.toHaveBeenCalled();
      }
      preview.startJourney();
      expect(router.navigate.calls.mostRecent().args[0]).toEqual(['/authed/content/questions', 417]);
    });
  }
});
