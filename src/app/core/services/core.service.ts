import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  constructor() { }

  triggerToasrt(message: string | any) {
    // Ensure we always display a proper string message
    let displayMessage: string;

    if (typeof message === 'string') {
      displayMessage = message;
    } else if (message instanceof ProgressEvent) {
      // Handle network errors on Android
      displayMessage = 'Network error. Please check your internet connection and try again.';
    } else if (message?.message) {
      displayMessage = message.message;
    } else if (message?.error?.message) {
      displayMessage = message.error.message;
    } else {
      displayMessage = 'An error occurred. Please try again.';
    }

    alert(displayMessage);
    // const toast = document.createElement('div');
    // toast.className = 'toast';
    // toast.innerText = message;
    // document.body.appendChild(toast);
    // setTimeout(() => {
    //   toast.remove();
    // }, 3000);
  }
}
