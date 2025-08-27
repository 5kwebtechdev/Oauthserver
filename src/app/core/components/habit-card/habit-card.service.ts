import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class HabitCardService {

  private lastToggledSubject = new BehaviorSubject<{time: number, action: boolean} | null>(null);
  public lastToggled$ = this.lastToggledSubject.asObservable();

  private closedList: number[] = [];

  constructor() { }

  updatelast(object: any){
    this.lastToggledSubject.next(object);
  }
}
