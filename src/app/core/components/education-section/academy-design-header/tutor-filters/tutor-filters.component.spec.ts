import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TutorFiltersComponent } from './tutor-filters.component';

describe('Tutor and Academy filters', () => {
  it('opens an opaque sheet with styled controls outside the header', () => {
    TestBed.configureTestingModule({
      imports: [TutorFiltersComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(TutorFiltersComponent);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    const trigger = host.querySelector<HTMLButtonElement>('.tf-chip')!;
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!;
    try {
      trigger.click();
      fixture.detectChanges();

      expect(dialog.open).toBeTrue();
      expect(getComputedStyle(dialog).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(trigger).borderTopStyle).toBe('solid');
      expect(getComputedStyle(trigger).fontSize).toBe('13px');
    } finally {
      dialog.close();
      fixture.destroy();
    }
  });
});
