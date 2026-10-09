import { TestBed } from '@angular/core/testing';
import { AvatarService } from '../../services/avatar.service';
import { ReferralTestPopupComponent } from './referral-test-popup.component';

describe('Temporary referral popup', () => {
  function create(avatar: any = null) {
    const fixture = TestBed.createComponent(ReferralTestPopupComponent);
    fixture.componentInstance.event = {
      message: '', overlayType: 'REFERRAL_RECEIVED', eventId: 'test', amount: 75, bothRewarded: true,
      relatedUser: { id: 2, name: 'Actual Name', username: 'handle', relationship: 'SELF', avatar }
    };
    fixture.detectChanges();
    return fixture;
  }
  beforeEach(() => TestBed.configureTestingModule({ imports: [ReferralTestPopupComponent] }));
  it('uses the selected app avatar before a remote image', () => {
    const f = create({ avatarImageName: '14-15-male-1.webp', url: 'https://example.com/photo.jpg' });
    expect(f.componentInstance.avatarUrl).toBe(TestBed.inject(AvatarService).getAvatarAsset('14-15-male-1.webp')!.value);
  });
  it('uses a remote image only without a saved avatar and falls back on image failure', () => {
    const f = create({ avatarImageName: null, url: 'https://example.com/photo.jpg' });
    expect(f.componentInstance.avatarUrl).toBe('https://example.com/photo.jpg');
    f.nativeElement.querySelector('.avatar').dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(f.componentInstance.avatarUrl).toContain('assets/figma/avatars/');
  });
  it('preserves an explicitly saved avatar even for a parent profile', () => {
    const f = create({ avatarImageName: '14-15-male-1.webp' });
    f.componentInstance.event.relatedUser!.relationship = 'PARENT';
    expect(f.componentInstance.avatarUrl).toBe(TestBed.inject(AvatarService).getAvatarAsset('14-15-male-1.webp')!.value);
  });
  it('handles a null avatar using the shared fallback', () => {
    const f = create();
    expect(f.componentInstance.avatarUrl).toBe(TestBed.inject(AvatarService).getAvatarForUser(f.componentInstance.event.relatedUser).value);
  });
  it('renders real names, both directions and the server amount without claiming unconfirmed rewards', () => {
    const f = create();
    expect(f.nativeElement.textContent).toContain('Actual Name');
    expect(f.nativeElement.textContent).toContain('brought you here!');
    expect(f.nativeElement.textContent).toContain('both earned');
    expect(f.nativeElement.textContent).toContain('75 coins');
    f.componentInstance.event = { ...f.componentInstance.event, overlayType: 'REFERRAL_JOINED', bothRewarded: false };
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('just joined because of you!');
    expect(f.nativeElement.textContent).not.toContain('both earned');
    expect(f.nativeElement.textContent).not.toContain('100');
  });
  it('does not invent a reward amount or streak claim when missing', () => {
    const f = create();
    f.componentInstance.event.amount = null;
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('coins.');
    expect(f.nativeElement.textContent).not.toContain('streak');
  });
  it('uses the supplied 500-coin visual for both referral popup directions', () => {
    const f = create();
    f.componentInstance.event.amount = 500;
    f.detectChanges();
    expect(f.nativeElement.querySelector('.reward img').getAttribute('src')).toContain('reward-500.png');
    expect(f.nativeElement.querySelector('.dynamic-amount')).toBeNull();

    f.componentInstance.event = { ...f.componentInstance.event, overlayType: 'REFERRAL_JOINED' };
    f.detectChanges();
    expect(f.nativeElement.querySelector('.reward img').getAttribute('src')).toContain('reward-500.png');
  });
  it('keeps the supplied visual and overlays the actual reward for other amounts', () => {
    const f = create();
    expect(f.nativeElement.querySelector('.reward img').getAttribute('src')).toContain('reward-500.png');
    expect(f.nativeElement.querySelector('.dynamic-amount').textContent).toContain('+75');
    f.componentInstance.event = { ...f.componentInstance.event, overlayType: 'REFERRAL_JOINED', amount: 100 };
    f.detectChanges();
    expect(f.nativeElement.querySelector('.reward img').getAttribute('src')).toContain('reward-500.png');
    expect(f.nativeElement.querySelector('.dynamic-amount').textContent).toContain('+100');
  });
});
