import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';
import { IonicModule } from '@ionic/angular';
import { LogoComponent } from '../core/components/logo/logo.component';
import { SupermeButtonComponent } from '../core/components/superme-button/superme-button.component';

// Import onboarding standalone components
import { LoginComponent } from '../core/pages/onboarding/login/login.component';
import { SignupComponent } from '../core/pages/onboarding/signup/signup.component';
import { ResetPasswordComponent } from '../core/pages/onboarding/reset-password/reset-password.component';
import { FamilyOnboardComponent } from '../core/pages/onboarding/family-onboard/family-onboard.component';

// Import additional modules
import { SupermeInputsModule } from '../core/components/superme-inputs/superme-inputs.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AuthRoutingModule,
    IonicModule,
    SupermeInputsModule,
    LogoComponent,
    SupermeButtonComponent,
    // Standalone components
    LoginComponent,
    SignupComponent,
    ResetPasswordComponent,
    FamilyOnboardComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AuthenticationModule { }