import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { LoginComponent } from "./login/login.component";
import { SupermeSelectorsComponent } from "../core/components/superme-selectors/superme-selectors.component";
import { SupermeNavigatorComponent } from "../core/components/superme-navigator/superme-navigator.component";
import { SupermeInputsModule } from "../core/components/superme-inputs/superme-inputs.module";
import { SupermeButtonComponent } from "../core/components/superme-button/superme-button.component";
import { SocialMediaComponent } from '../core/components/social-media/social-media.component';
import { ProfileFactsComponent } from '../core/components/user-profile/profile-facts/profile-facts.component';
import { FamilyOnboardComponent } from "./family-onboard/family-onboard.component";
import { ScanQrComponent } from "./scan-qr/scan-qr.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
import { AuthBackButtonComponent } from "../core/components/auth-back-button/auth-back-button.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
    FamilyOnboardComponent,
    SupermeNavigatorComponent,
    SupermeSelectorsComponent,
    SupermeInputsModule,
    SupermeButtonComponent,
    ProfileFactsComponent,
    ScanQrComponent,
    ResetPasswordComponent,
    SocialMediaComponent,
    AuthBackButtonComponent,
    LoginComponent,
    QRCodeComponent
  ],
  declarations: [
    HomePage
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class HomePageModule { }
