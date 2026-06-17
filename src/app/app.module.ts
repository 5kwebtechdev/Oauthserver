import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { SupermeLoadingComponent } from './core/components/superme-loading/superme-loading.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import {ProfileSelectorInterceptor} from "./core/interceptors/profile-selector.interceptor";
import { NetworkInterceptor } from './core/interceptors/network.interceptor';
import { AppCheckInterceptor } from './core/interceptors/app-check.interceptor';
import { NetworkIssueComponent } from './core/components/network-issue/network-issue.component';
import { SupermeButtonComponent } from './core/components/superme-button/superme-button.component';
import { SupermePopupComponent } from './core/components/superme-popup/superme-popup.component';

@NgModule({
  declarations: [
    AppComponent,
  ],

  imports: [BrowserModule, CommonModule, IonicModule.forRoot(), AppRoutingModule, BrowserAnimationsModule, HttpClientModule, SupermeLoadingComponent, NetworkIssueComponent, SupermeButtonComponent, SupermePopupComponent],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AppCheckInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ProfileSelectorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: NetworkInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
