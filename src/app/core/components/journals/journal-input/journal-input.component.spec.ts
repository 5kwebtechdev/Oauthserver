import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, of } from 'rxjs';
import { JournalInputComponent } from './journal-input.component';
import { DailyMoodRecordsService, dailyMoodRecord, moodDateKey } from '../../../services/daily-mood-records.service';
import { AuthApi } from '../../../api/auth.api';
import { AuthService } from '../../../services/auth.service';
import { RefreshService } from '../../../services/refresh.service';

describe('Journal read-only daily mood', () => {
  let fixture: ComponentFixture<JournalInputComponent>;
  let records: BehaviorSubject<any>;
  let http: any;
  let bodyStyle: string;
  beforeEach(async () => {
    bodyStyle = document.body.style.cssText;
    records = new BehaviorSubject({ [moodDateKey()]: dailyMoodRecord('HAPPY') });
    http = { post: jasmine.createSpy().and.returnValue(of({})) };
    await TestBed.configureTestingModule({
      imports: [JournalInputComponent],
      providers: [
        { provide: DailyMoodRecordsService, useValue: { watch: () => records } },
        { provide: HttpClient, useValue: http },
        { provide: Router, useValue: { navigate: jasmine.createSpy().and.resolveTo(true) } },
        { provide: AuthApi, useValue: { getToken: () => null } },
        { provide: AuthService, useValue: { getCurrentUserAge: () => 12 } },
        { provide: RefreshService, useValue: { notifyJournalAdded: () => {} } },
        { provide: ToastController, useValue: {} },
        { provide: Location, useValue: { back: () => {} } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(JournalInputComponent);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    document.body.style.cssText = bodyStyle;
  });

  it('shows a display-only mood and the specified information text', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.journal-vibe__value')?.textContent).toContain('Happy');
    expect(el.querySelectorAll('[data-section="emotions"] .journal-option').length).toBe(0);
    (el.querySelector('.journal-vibe__info') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'This mood comes from your home screen and updates automatically even after you save your journal.');
    records.next({ [moodDateKey()]: dailyMoodRecord('NEUTRAL') });
    fixture.detectChanges();
    expect(el.querySelector('.journal-vibe__value')?.textContent).toContain('Calm');
  });

  it('shows loading feedback while the shared mood request is pending', () => {
    records.next({});
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.journal-vibe__value')?.textContent)
      .toContain('Loading today’s mood');
    records.next({ [moodDateKey()]: dailyMoodRecord('NEUTRAL') });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.journal-vibe__value')?.textContent)
      .toContain('Calm');
  });

  it('preserves other journal fields and only copies the shared mood for API compatibility', async () => {
    const component = fixture.componentInstance;
    component.text = 'A good day';
    component.selectOption('sleep', 0);
    component.selectOption('emotions', 3);
    expect(component.selected['emotions']).toBeUndefined();
    await component.submit();
    const body = http.post.calls.mostRecent().args[1] as FormData;
    expect(body.get('notes')).toBe('A good day');
    expect(body.get('sleep')).toBe('deep');
    expect(body.get('emotions')).toBe('happy');
  });

  it('accepts a 1 MB image and rejects an image one byte larger', async () => {
    const component = fixture.componentInstance;
    const select = async (file: File) => {
      const input = { files: [file], value: 'selected' } as unknown as HTMLInputElement;
      await component.onFileSelected({ target: input } as unknown as Event);
      expect(input.value).toBe('');
    };

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Max 1 MB per image');
    await select(new File([new Uint8Array(1024 * 1024)], 'allowed.png', { type: 'image/png' }));
    expect(component.uploadedImages.length).toBe(1);
    expect(component.imageUploadError).toBeNull();

    await select(new File([new Uint8Array(1024 * 1024 + 1)], 'too-large.png', { type: 'image/png' }));
    expect(component.uploadedImages.length).toBe(1);
    expect(component.imageUploadError).toBe('Each image must be 1 MB or less.');
  });

  [360, 375, 390, 414].forEach(width => it(`keeps the selected-vibe card and tooltip within ${width}px`, () => {
    const host = fixture.nativeElement as HTMLElement;
    // Karma hides its context body; make it measurable for this layout test.
    document.body.style.setProperty('display', 'block', 'important');
    host.style.cssText = `display:block; width:${width}px; height:900px; position:relative`;
    document.body.appendChild(host);
    // Measure the actual compose shell independently of Ionic's unhydrated
    // test wrapper, which has no layout without a running router outlet.
    host.appendChild(host.querySelector('.journal-compose__shell')!);
    fixture.componentInstance.moodInfoOpen = true;
    fixture.detectChanges();
    const card = host.querySelector('.journal-vibe') as HTMLElement;
    const tooltip = host.querySelector('.journal-vibe__tooltip') as HTMLElement;
    expect(card.clientWidth).toBeGreaterThan(280);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
    expect(tooltip.getBoundingClientRect().right).toBeLessThanOrEqual(card.getBoundingClientRect().right);
    expect(tooltip.getBoundingClientRect().left).toBeGreaterThanOrEqual(card.getBoundingClientRect().left);
  }));
});
