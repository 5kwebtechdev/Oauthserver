import { PkceEntryComponent } from './pkce-entry.component';

describe('PKCE entry routing', () => {
  let user: any;
  let onboarding: any;
  let router: any;
  let component: PkceEntryComponent;

  beforeEach(() => {
    sessionStorage.clear();
    user = { id: 7, relationship: 'CHILD', onboardingStep: 4 };
    onboarding = { getResumeNavigation: jasmine.createSpy().and.returnValue({
      url: '/signup', queryParams: { step: 2, role: 'child' }
    }) };
    router = { navigate: jasmine.createSpy().and.resolveTo(true), navigateByUrl: jasmine.createSpy().and.resolveTo(true) };
    component = new PkceEntryComponent(
      { init: async () => {}, error: '', token: 'access-token' } as any,
      { getUserData: () => user, getDashboardRoute: () => '/authed/child-home' } as any,
      onboarding,
      { snapshot: { routeConfig: { path: 'callback' }, queryParamMap: { get: () => null } } } as any,
      router
    );
  });

  it('sends an ordinary password login to the dashboard even when an old profile has an incomplete step', async () => {
    await component.ngOnInit();

    expect(onboarding.getResumeNavigation).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/authed/child-home');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('resumes profile setup for a social account', async () => {
    user.authProvider = 'google';
    await component.ngOnInit();

    expect(onboarding.getResumeNavigation).toHaveBeenCalledOnceWith(user);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/signup'], {
      queryParams: { step: 2, role: 'child' }
    });
  });
});
