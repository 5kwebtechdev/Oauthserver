import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '../core/pages/onboarding/login/login.component';
import { SignupComponent } from '../core/pages/onboarding/signup/signup.component';
import { ResetPasswordComponent } from '../core/pages/onboarding/reset-password/reset-password.component';
import { FamilyOnboardComponent } from '../core/pages/onboarding/family-onboard/family-onboard.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'signup',
    component: SignupComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: 'join-family',
    component: FamilyOnboardComponent
  },
  {
    path: 'join-family2',
    component: FamilyOnboardComponent
  },
  {
    path: 'instructions-for-child',
    component: FamilyOnboardComponent
  },
  {
    path: 'instructions-for-parent',
    component: FamilyOnboardComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }