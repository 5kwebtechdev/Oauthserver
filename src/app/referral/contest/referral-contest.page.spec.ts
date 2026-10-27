import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, NavController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { ReferralContestPage } from './referral-contest.page';
import { AuthService } from '../../core/services/auth.service';
import { ReferralShareService } from '../../core/services/referral-share.service';
import { NavigationService } from '../../core/services/navigation.service';
import { Location } from '@angular/common';

describe('Referral contest integration', () => {
  let fixture: ComponentFixture<ReferralContestPage>;
  let page: ReferralContestPage;
  let host: HTMLElement;
  let share: jasmine.Spy;
  let back: jasmine.Spy;
  let root: jasmine.Spy;
  let history: string[];
  let locationBack: jasmine.Spy;
  let replaceHistory: jasmine.Spy;
  let api: jasmine.Spy;

  beforeEach(async () => {
    share = jasmine.createSpy('share'); back = jasmine.createSpy('back');
    root = jasmine.createSpy('root');
    locationBack = jasmine.createSpy('locationBack');
    replaceHistory = jasmine.createSpy('replaceHistory');
    history = ['/authed/user-profile', '/authed/refer-friend', '/authed/refer-friend/contest'];
    api = jasmine.createSpy('api').and.returnValue(of({ referralCode: 'ACTUAL-API-CODE' }));
    await TestBed.configureTestingModule({
      imports: [ReferralContestPage, IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: { getUserData: () => ({ referralCode: 'CACHED' }), generateReferralCode: api } },
        { provide: ReferralShareService, useValue: { share } },
        { provide: NavController, useValue: { navigateBack: back, navigateRoot: root } },
        { provide: NavigationService, useValue: { getHistory: () => history, replaceHistory } },
        { provide: Location, useValue: { back: locationBack } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReferralContestPage);
    page = fixture.componentInstance; host = fixture.nativeElement;
    host.style.cssText = 'position:fixed;inset:0 auto auto 0;width:393px;height:852px;display:flex;flex-direction:column;';
    host.classList.add('ion-page');
    document.body.appendChild(host);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => { fixture.destroy(); host.remove(); });

  it('unlocks only at the bottom, stays unlocked, and shares the API code', async () => {
    const scroll = { scrollTop: 0, clientHeight: 500, scrollHeight: 1000 };
    spyOn((page as any).content, 'getScrollElement').and.resolveTo(scroll);
    page.inviteFriends(); expect(share).not.toHaveBeenCalled();
    await page.checkScrolledToBottom(); expect(page.ctaUnlocked()).toBeFalse();
    scroll.scrollTop = 492;
    await page.checkScrolledToBottom(); expect(page.ctaUnlocked()).toBeTrue();
    scroll.scrollTop = 0;
    await page.checkScrolledToBottom(); page.inviteFriends();
    expect(share).toHaveBeenCalledOnceWith('ACTUAL-API-CODE');
  });
  it('unlocks when content fits and returns to Referral', async () => {
    spyOn((page as any).content, 'getScrollElement').and.resolveTo({ scrollTop: 0, clientHeight: 1000, scrollHeight: 900 });
    await page.checkScrolledToBottom(); expect(page.ctaUnlocked()).toBeTrue();
    page.goBack();
    page.goBack();
    expect(locationBack).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    expect(root).not.toHaveBeenCalled();
  });
  it('returns to Refer Friend without a stale contest entry when opened directly', () => {
    history = ['/authed/refer-friend/contest'];
    page.goBack();
    expect(replaceHistory).toHaveBeenCalledOnceWith('/authed/refer-friend');
    expect(root).toHaveBeenCalledOnceWith('/authed/refer-friend', { animated: false });
  });
  it('retains cached code on failure and handles missing code/retry', () => {
    api.and.returnValue(throwError(() => new Error('offline')));
    page.loadReferralCode(); expect(page.referralCode()).toBe('ACTUAL-API-CODE');
    expect(page.shareError()).toBe('');
    page.referralCode.set(''); page.loadReferralCode();
    expect(page.shareError()).toContain('Unable to load');
    page.ctaUnlocked.set(true); page.inviteFriends(); expect(share).not.toHaveBeenCalled();
    api.and.returnValue(of({ referralCode: 'RETRIED' })); page.loadReferralCode();
    expect(page.referralCode()).toBe('RETRIED');
  });
  it('opens the existing legal URLs externally', () => {
    const open = spyOn(window, 'open');
    for (const url of [page.links.terms, page.links.faqs]) {
      page.openLegal(new Event('click', { cancelable: true }), url);
      expect(open).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
    }
  });
  it('loads all assets and fits 360/375/390/393/414px', async () => {
    await Promise.all(Array.from(host.querySelectorAll('img')).map(image => image.decode()));
    for (const width of [360, 375, 390, 393, 414]) {
      host.style.width = `${width}px`; fixture.detectChanges();
      // Give Stencil's shadow scroll container a frame to resize, as it does
      // inside the real router outlet on viewport changes.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const bounds = host.getBoundingClientRect();
      for (const el of Array.from(host.querySelectorAll<HTMLElement>('.header, .hero, .slot, .slot__device, .prize-card, .step, .legal, .cta'))) {
        const rect = el.getBoundingClientRect();
        expect(rect.left).withContext(`${width}: ${el.className}`).toBeGreaterThanOrEqual(bounds.left - 1);
        expect(rect.right).withContext(`${width}: ${el.className}`).toBeLessThanOrEqual(bounds.right + 1);
      }
      expect(host.querySelector('.cta')!.getBoundingClientRect().height).toBe(56);
    }
  });
});
