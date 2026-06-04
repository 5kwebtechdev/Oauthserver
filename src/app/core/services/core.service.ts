import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  constructor() { }

  triggerToasrt(message: string | any) {
    // This method is kept for backward compatibility but does nothing.
    // Error messages are now displayed inline on the component templates only.
  }
}
