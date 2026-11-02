import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { VibesDisplayResponse } from '../models/mood.model';

@Injectable({ providedIn: 'root' })
export class ParentDataService {
  private childrenSubject = new BehaviorSubject<VibesDisplayResponse[]>([]);
  private selectedChildSubject = new BehaviorSubject<VibesDisplayResponse | null>(null);

  children$ = this.childrenSubject.asObservable();
  selectedChild$ = this.selectedChildSubject.asObservable();

  get children(): VibesDisplayResponse[] { return this.childrenSubject.value; }
  get selectedChild(): VibesDisplayResponse | null { return this.selectedChildSubject.value; }

  setChildren(children: VibesDisplayResponse[]) {
    this.childrenSubject.next(children);
    // Always reset to first child when fresh data arrives (handles new login)
    this.selectedChildSubject.next(children.length ? children[0] : null);
  }

  selectChild(child: VibesDisplayResponse) {
    this.selectedChildSubject.next(child);
  }

  clear() {
    this.childrenSubject.next([]);
    this.selectedChildSubject.next(null);
  }
}
