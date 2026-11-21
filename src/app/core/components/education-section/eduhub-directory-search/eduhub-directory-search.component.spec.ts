import { ElementRef } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { EduHubDirectorySearchComponent } from './eduhub-directory-search.component';

describe('EduHub directory search navigation', () => {
  it('releases the modal before the cached directory receives an input update', () => {
    const events = new Subject<NavigationStart>();
    const back = new Subscription();
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    const component = new EduHubDirectorySearchComponent(
      new ElementRef(dialog),
      { backButton: { subscribeWithPriority: () => back } } as unknown as Platform,
      { events } as unknown as Router
    );
    component.sheet = new ElementRef(dialog);

    try {
      component.open = true;
      component.ngAfterViewInit();
      expect(dialog.matches(':modal')).toBeTrue();
      component.dismissed.subscribe(() => {
        expect(dialog.matches(':modal')).toBeFalse();
        expect(back.closed).toBeTrue();
      });

      events.next(new NavigationStart(1, '/tutors/42'));

      expect(component.open).toBeTrue();
      expect(dialog.open).toBeFalse();
    } finally {
      component.ngOnDestroy();
      dialog.remove();
    }
  });
});
