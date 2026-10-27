import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController, ToastController, NavController } from '@ionic/angular';
import { of } from 'rxjs';
import { ReferFriendComponent } from './refer-friend.component';
import { AuthService } from '../../../services/auth.service';
import { NavigationService } from '../../../services/navigation.service';

describe('ReferFriendComponent mobile layout', () => {
  let fixture: ComponentFixture<ReferFriendComponent>;
  let page: HTMLElement;
  let bodyDisplay: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferFriendComponent, IonicModule.forRoot()],
      providers: [
        { provide: NavController, useValue: { navigateForward: jasmine.createSpy('navigateForward') } },
        { provide: AuthService, useValue: {
          userData$: of({}),
          getUserData: () => ({ referralCode: 'NARADEHY' }),
          generateReferralCode: () => of({ referralCode: 'NARADEHY' })
        } },
        { provide: ToastController, useValue: {} },
        { provide: ModalController, useValue: { getTop: async () => null } },
        { provide: NavigationService, useValue: { back: () => {} } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReferFriendComponent);
    bodyDisplay = document.body.style.display;
    document.body.style.display = 'block';
    fixture.detectChanges();
    page = fixture.nativeElement.querySelector('.rf-page');
    // Ionic hides an un-navigated ion-content in TestBed; mount its real page
    // content for layout measurements without changing the production screen.
    document.body.appendChild(page);
  });

  afterEach(() => { page.remove(); fixture.destroy(); document.body.style.display = bodyDisplay; });

  it('opens the contest from the banner with dynamic referral data preserved', () => {
    page.querySelector<HTMLButtonElement>('.contest-banner')!.click();
    expect(TestBed.inject(NavController).navigateForward).toHaveBeenCalledWith('/authed/refer-friend/contest');
    expect(fixture.componentInstance.referralCode).toBe('NARADEHY');
  });

  it('keeps the code, copy action, divider and Figma share icon inside the card on mobile', () => {
    for (const width of [320, 375, 393, 430]) {
      page.style.width = `${width}px`;
      fixture.detectChanges();
      const card: HTMLElement = page.querySelector('.rf-code-card')!;
      const row: HTMLElement = page.querySelector('.rf-code-card__row')!;
      const code: HTMLElement = page.querySelector('.rf-code-card__code-wrap')!;
      const copy: HTMLElement = page.querySelector('.rf-code-card__copy')!;
      const divider: HTMLElement = page.querySelector('.rf-code-card__divider')!;
      const share: HTMLElement = page.querySelector('.rf-code-card__share')!;
      const leftRays: HTMLElement = page.querySelector('.rf-code-card__rays--left')!;
      const rightRays: HTMLElement = page.querySelector('.rf-code-card__rays--right')!;
      const bounds = card.getBoundingClientRect();
      const pageBounds = page.getBoundingClientRect();

      expect(bounds.width).toBeGreaterThan(0);

      expect(row.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
      for (const item of [code, copy, divider, share]) {
        const rect = item.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
        expect(rect.right).toBeLessThanOrEqual(bounds.right);
      }
      expect(share.getBoundingClientRect().left).toBeGreaterThan(divider.getBoundingClientRect().right);
      expect(leftRays.getBoundingClientRect().right).toBeLessThanOrEqual(code.getBoundingClientRect().left);
      expect(rightRays.getBoundingClientRect().left).toBeGreaterThanOrEqual(share.getBoundingClientRect().right);
      for (const element of Array.from(page.querySelectorAll<HTMLElement>(
        '.rf-hero, .rf-hero__gift, .rf-code-card, .rf-steps, .rf-step, .rf-step__icon, .rf-step__copy'
      ))) {
        const rect = element.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(pageBounds.left);
        expect(rect.right).toBeLessThanOrEqual(pageBounds.right);
      }
    }
  });

  it('loads the exact local Figma icon assets', async () => {
    const icons: HTMLImageElement[] = Array.from(page.querySelectorAll(
      '.rf-code-card__copy img, .rf-code-card__share img, .rf-code-card__rays, .rf-step__icon img'
    ));
    await Promise.all(icons.map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    })));
    expect(icons.length).toBe(7);
    for (const icon of icons) expect(icon.naturalWidth).toBeGreaterThan(0);
    expect(page.querySelector('.rf-code-card__copy img')!.getBoundingClientRect().width).toBe(18);
    expect(page.querySelector('.rf-code-card__share img')!.getBoundingClientRect().width).toBe(40);
    for (const icon of Array.from(page.querySelectorAll<HTMLElement>('.rf-step__icon img'))) {
      expect(icon.getBoundingClientRect().width).toBe(icon.closest('.rf-step__icon--coin') ? 32 : 24);
    }
  });
});
