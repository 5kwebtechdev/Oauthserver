import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';
import { TutorApi } from '../api/tutor.api';

@Injectable({ providedIn: 'root' })
export class TeachingDisplayService {
  readonly categories$;
  constructor(api: TutorApi) {
    this.categories$ = api.getTutorCategories().pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }
}
