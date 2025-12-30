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
import { MindfulInputsModule } from "../core/components/mindful-inputs/mindful-inputs.module";
import { MindfulButtonComponent } from "../core/components/mindful-button/mindful-button.component";
import { SocialMediaComponent } from '../core/components/social-media/social-media.component';
import { ProfileFactsComponent } from '../core/components/user-profile/profile-facts/profile-facts.component';
import { InstructionsForChildComponent } from "./instructions-for-child/instructions-for-child.component";
import { InstructionsForParentComponent } from "./instructions-for-parent/instructions-for-parent.component";
import { JoinFamilyComponent } from "./join-family/join-family.component";
import { JoinFamily2Component } from "./join-family2/join-family2.component";
import { ScanQrComponent } from "./scan-qr/scan-qr.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
    MindfulSelectorsComponent,
    MindfulInputsModule,
    MindfulButtonComponent,
    ProfileFactsComponent,
    ScanQrComponent,
    ResetPasswordComponent,
    SocialMediaComponent,
    InstructionsForChildComponent,
    QRCodeComponent
  ],
  declarations: [
    HomePage,
    LoginComponent,
    SignupComponent,
    InstructionsForParentComponent,
    JoinFamilyComponent,
    JoinFamily2Component
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class HomePageModule { }
