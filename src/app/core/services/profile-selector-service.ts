import {inject, Injectable} from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectorService {
  private childSubject = new BehaviorSubject<any>(null);
  public child$: Observable<any> = this.childSubject.asObservable();


  setChild(value: any): void {
    this.childSubject.next(value);
  }
}
