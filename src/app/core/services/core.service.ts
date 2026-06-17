import { Injectable } from '@angular/core';
import { CustomToastService, ToastType } from './custom-toast.service';

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  constructor(private toastService: CustomToastService) { }

  triggerToasrt(message: string | any, type: ToastType = 'error') {
    const text = typeof message === 'string' ? message : message?.message;
    if (!text) return;
    this.toastService.show(text, type, 3000);
  }
}
