import { ReferFriendComponent } from './refer-friend.component';

describe('Referral Back destination', () => {
  it('skips contest entries and replaces the referral view with its source', () => {
    const root = jasmine.createSpy('navigateRoot');
    const replace = jasmine.createSpy('replaceHistory');
    const page = new ReferFriendComponent(null!, null!, { navigateRoot: root } as any, null!, {
      getHistory: () => ['/authed/dashboard', '/authed/refer-friend', '/authed/refer-friend/contest', '/authed/refer-friend'],
      replaceHistory: replace,
    } as any, null!);
    page.goBack();
    page.goBack();
    expect(root).toHaveBeenCalledOnceWith('/authed/dashboard', { replaceUrl: true, animated: false });
    expect(replace).toHaveBeenCalledOnceWith('/authed/dashboard');
  });
  it('uses Profile when there is no source outside the referral flow', () => {
    const root = jasmine.createSpy('navigateRoot');
    const page = new ReferFriendComponent(null!, null!, { navigateRoot: root } as any, null!, {
      getHistory: () => ['/authed/refer-friend/contest', '/authed/refer-friend'],
      replaceHistory: () => {},
    } as any, null!);
    page.goBack();
    expect(root).toHaveBeenCalledOnceWith('/authed/user-profile', { replaceUrl: true, animated: false });
  });
});
