import { APP_INITIALIZER, NgModule } from '@angular/core';
import { OAuthModule } from 'angular-oauth2-oidc';
import { PkceAuthService } from './core/services/pkce-auth.service';
import { PkceInterceptor } from './core/interceptors/pkce.interceptor';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { DailyEntryComponent } from './core/components/daily-entry/daily-entry.component';
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
import { BadgeArtComponent } from './core/components/badge-section/badge-art.component';

@NgModule({
  declarations: [
    AppComponent,
  ],

  imports: [OAuthModule.forRoot(), BrowserModule, CommonModule, IonicModule.forRoot(), AppRoutingModule, BrowserAnimationsModule, HttpClientModule, SupermeLoadingComponent, NetworkIssueComponent, SupermeButtonComponent, SupermePopupComponent, BadgeArtComponent, DailyEntryComponent],
  providers: [
    { provide: APP_INITIALIZER, multi: true, useFactory: (auth: PkceAuthService) => () => auth.init(), deps: [PkceAuthService] },
    { provide: HTTP_INTERCEPTORS, useClass: PkceInterceptor, multi: true },
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
