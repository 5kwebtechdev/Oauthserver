import { Injectable } from '@angular/core';
import { App, AppInfo } from '@capacitor/app';

@Injectable({ providedIn: 'root' })
export class InstalledAppInfoService {
  getInfo(): Promise<AppInfo> {
    return App.getInfo();
  }
}
