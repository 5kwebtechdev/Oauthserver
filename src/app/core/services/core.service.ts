import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  constructor() { }

  triggerToasrt(message: string){
    alert(message);
    // const toast = document.createElement('div');
    // toast.className = 'toast';
    // toast.innerText = message;
    // document.body.appendChild(toast);
    // setTimeout(() => {
    //   toast.remove();
    // }, 3000);
  }
}
