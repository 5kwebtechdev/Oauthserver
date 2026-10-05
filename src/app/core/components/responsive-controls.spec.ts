import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupermeButtonComponent } from './superme-button/superme-button.component';
import { SupermeInputComponent } from './superme-inputs/superme-input.component';
import { ProfileEditInputComponent } from './user-profile/profile-edit-input/profile-edit-input.component';
import { StreakMilestoneComponent } from './streak-milestone/streak-milestone.component';
import { SupermePopupComponent } from './superme-popup/superme-popup.component';

// Real Angular templates + encapsulated styles, in independent viewport frames.
// Root enlargement is a browser simulation, NOT proof of Android font scaling.
describe('Responsive shared controls', () => {
  let frame: HTMLIFrameElement;
  let fixtures: ComponentFixture<any>[];
  let originalBodyDisplay: string;
  beforeEach(async () => {
    originalBodyDisplay = document.body.style.display;
    // Ionic hides an unbootstrapped body; Karma has no app-root hydration.
    document.body.style.display = 'block';
    fixtures = [];
    await TestBed.configureTestingModule({ imports: [SupermeButtonComponent,
      SupermeInputComponent, ProfileEditInputComponent, StreakMilestoneComponent, SupermePopupComponent] }).compileComponents();
  });
  afterEach(() => {
    fixtures.forEach(f => f.destroy());
    frame?.remove();
    document.body.style.display = originalBodyDisplay;
  });

  for (const width of [320, 360, 390, 412, 600, 768]) {
    for (const scale of [1, 2]) {
      for (const height of [800, 320]) {
        it(`fits ${width}x${height} with ${scale * 100}% text`, async () => {
          const button = TestBed.createComponent(SupermeButtonComponent);
          button.componentRef.setInput('type', 'orange');
          button.componentRef.setInput('size', 'full');
          button.componentRef.setInput('text', 'Save changes and continue to the next step');
          const input = TestBed.createComponent(SupermeInputComponent);
          input.componentRef.setInput('value', 'Alexandria Very Long Family Name');
          const profile = TestBed.createComponent(ProfileEditInputComponent);
          profile.componentRef.setInput('title', 'Your full display name');
          profile.componentRef.setInput('description', 'Required for this account');
          profile.componentRef.setInput('value', 'Alexandria Very Long Family Name');
          profile.componentRef.setInput('showError', true);
          profile.componentRef.setInput('errorMessage', 'Please enter a different name. This very long validation message must wrap without hiding any information.');
          const reward = TestBed.createComponent(StreakMilestoneComponent);
          reward.componentRef.setInput('days', 365);
          const popup = TestBed.createComponent(SupermePopupComponent);
          popup.componentRef.setInput('config', {
            heading: 'Please confirm your changes before continuing',
            subtitle: 'A long explanation should remain readable even on the smallest phone with enlarged text. '.repeat(5),
            primaryCTA: { text: 'Save changes and continue' },
            secondaryCTA: { text: 'Go back and review' }
          });
          fixtures = [button, input, profile, reward, popup];
          fixtures.forEach(f => f.detectChanges());

          frame = document.createElement('iframe');
          frame.style.cssText = `width:${width}px;height:${height}px;border:0;position:absolute;top:0;left:0;`;
          frame.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
          const loaded = new Promise<void>(resolve => frame.onload = () => resolve());
          document.body.append(frame);
          await loaded;
          const doc = frame.contentDocument!;
          const win = frame.contentWindow!;
          const loads: Promise<void>[] = [];
          document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
            const clone = node.cloneNode(true) as HTMLElement;
            if (clone instanceof HTMLLinkElement) {
              clone.href = (node as HTMLLinkElement).href;
              loads.push(new Promise(resolve => { clone.onload = () => resolve(); clone.onerror = () => resolve(); }));
            }
            doc.head.append(clone);
          });
          const style = doc.createElement('style');
          style.textContent = `html {font-size:${16 * scale}px!important;overflow:auto!important;}
            body {display:block!important;position:static!important;height:auto!important;overflow:auto!important;margin:0;padding:16px;box-sizing:border-box;}
            body > * {display:block;margin-bottom:16px;max-width:100%;}
            * {animation:none!important;transition:none!important;}`;
          doc.head.append(style);
          // Ionic pages scroll in ion-content rather than the document. Give
          // the controls an equivalent bounded scroll surface in this fixture.
          const surface = doc.createElement('main');
          surface.style.cssText = 'height:calc(100vh - 32px);overflow:auto;min-width:0;';
          doc.body.append(surface);
          fixtures.forEach(f => surface.append(f.nativeElement));
          await Promise.all(loads);
          await new Promise<void>(resolve => win.requestAnimationFrame(() => resolve()));
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width + 1);
          for (const selector of ['.button p', '.title-head', '.error', '.milestone-heading h3']) {
            const el = doc.querySelector<HTMLElement>(selector)!;
            expect(el.clientWidth).withContext(selector).toBeGreaterThan(0);
            expect(el.scrollWidth).withContext(selector).toBeLessThanOrEqual(el.clientWidth + 1);
            expect(el.scrollHeight).withContext(selector).toBeLessThanOrEqual(el.clientHeight + 1);
          }
          for (const el of Array.from(doc.querySelectorAll('input'))) {
            const css = win.getComputedStyle(el);
            expect(parseFloat(css.fontSize)).toBeGreaterThanOrEqual(16 * scale);
            expect(el.clientHeight).toBeGreaterThanOrEqual(parseFloat(css.lineHeight));
            expect(el.getBoundingClientRect().right).toBeLessThanOrEqual(width);
          }
          // Content is reachable in a short viewport, rather than clipped.
          if (height === 320) {
            expect(surface.scrollHeight).toBeGreaterThan(surface.clientHeight);
            surface.scrollTop = surface.scrollHeight;
            expect(surface.scrollTop).toBeGreaterThan(0);
          }
          popup.componentRef.setInput('isVisible', true);
          popup.detectChanges();
          const panel = doc.querySelector<HTMLElement>('.superme-popup-container')!;
          expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
          expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
          expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
          panel.scrollTop = panel.scrollHeight;
          const actions = doc.querySelector<HTMLElement>('.superme-popup-actions')!;
          expect(actions.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 1);
        });
      }
    }
  }
});
