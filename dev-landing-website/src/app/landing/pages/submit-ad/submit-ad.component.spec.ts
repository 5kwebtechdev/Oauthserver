import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SubmitAdPageComponent } from './submit-ad.component';
import { environment } from '../../../../environments/environment';

describe('Advertise on SuperMeApp submission', () => {
  let page: SubmitAdPageComponent;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    page = new SubmitAdPageComponent(
      { markForCheck: () => {} } as ChangeDetectorRef,
      { snapshot: { routeConfig: { path: 'advertise-with-us' } } } as ActivatedRoute,
    );
    Object.assign(page.form, {
      name: 'Test User', email: 'test@example.com', phone: '8053645999',
      adDescription: 'Advertisement details for a new learning campaign and its audience.',
      website: 'https://example.com', socialMedia: 'https://instagram.com/example'
    });
    fetchSpy = spyOn(window, 'fetch').and.resolveTo({ ok: true } as Response);
    spyOn(window, 'scrollTo');
  });

  it('posts the real banner and mapped fields as multipart data', async () => {
    const image = new File(['image bytes'], 'banner.png', { type: 'image/png' });
    page.selectedFile = image;

    await page.onSubmit();

    expect(fetchSpy).toHaveBeenCalledOnceWith(
      `${environment.apiUrl}/public/request-ad-register`,
      jasmine.objectContaining({ method: 'POST', headers: { Accept: 'application/json' } })
    );
    const options = fetchSpy.calls.mostRecent().args[1] as RequestInit;
    expect(options.body instanceof FormData).toBeTrue();
    const payload = options.body as FormData;
    expect(payload.get('name')).toBe('Test User');
    expect(payload.get('email')).toBe('test@example.com');
    expect(payload.get('phone')).toBe('8053645999');
    expect(payload.get('adDescription')).toBe(page.form.adDescription);
    expect(payload.get('website')).toBe('https://example.com');
    expect(payload.get('socialMedia')).toBe('https://instagram.com/example');
    expect(payload.get('ad_banner')).toEqual(image);
    expect(page.submitted).toBeTrue();
  });

  it('omits optional website, social media, and banner when empty', async () => {
    page.form.website = '';
    page.form.socialMedia = '';
    await page.onSubmit();
    const payload = fetchSpy.calls.mostRecent().args[1].body as FormData;
    expect(payload.has('website')).toBeFalse();
    expect(payload.has('socialMedia')).toBeFalse();
    expect(payload.has('ad_banner')).toBeFalse();
    expect(page.submitted).toBeTrue();
  });

  it('does not submit invalid email or phone', async () => {
    page.form.email = 'invalid';
    await page.onSubmit();
    page.form.email = 'test@example.com';
    page.form.phone = '123';
    await page.onSubmit();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the form and shows the existing error on an API failure', async () => {
    fetchSpy.and.resolveTo({ ok: false } as Response);
    await page.onSubmit();
    expect(page.submitted).toBeFalse();
    expect(page.sendError).toBe('Something went wrong. Please try again.');
    expect(page.sending).toBeFalse();
  });

  it('prevents duplicate submissions while a request is in flight', async () => {
    let finish!: (response: Response) => void;
    fetchSpy.and.returnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const first = page.onSubmit();
    const second = page.onSubmit();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    finish({ ok: true } as Response);
    await Promise.all([first, second]);
    expect(page.submitted).toBeTrue();
  });
});
