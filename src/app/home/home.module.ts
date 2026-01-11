import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { LoginComponent } from "./login/login.component";
import { SignupComponent } from "./signup/signup.component";
import { MindfulSelectorsComponent } from "../core/components/mindful-selectors/mindful-selectors.component";
import { MindfulNavigatorComponent } from "../core/components/mindful-navigator/mindful-navigator.component";
import { MindfulInputsModule } from "../core/components/mindful-inputs/mindful-inputs.module";
import { MindfulButtonComponent } from "../core/components/mindful-button/mindful-button.component";
import { SocialMediaComponent } from '../core/components/social-media/social-media.component';
import { ProfileFactsComponent } from '../core/components/user-profile/profile-facts/profile-facts.component';
import { FamilyOnboardComponent } from "./family-onboard/family-onboard.component";
import { ScanQrComponent } from "./scan-qr/scan-qr.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
    FamilyOnboardComponent,
    MindfulSelectorsComponent,
    MindfulNavigatorComponent,
    MindfulInputsModule,
    MindfulButtonComponent,
    ProfileFactsComponent,
    ScanQrComponent,
    ResetPasswordComponent,
    SocialMediaComponent,
    QRCodeComponent
  ],
  declarations: [
    HomePage,
    LoginComponent,
    SignupComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class HomePageModule { }
