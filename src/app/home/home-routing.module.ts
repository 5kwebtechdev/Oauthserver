import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from "./login/login.component";
import { SignupComponent } from "./signup/signup.component";
import { FamilyOnboardComponent } from "./family-onboard/family-onboard.component";
import { ScanQrComponent } from './scan-qr/scan-qr.component';
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
import { guestGuard, retiredChildInstructionsGuard, retiredHomeGuard } from "../core/authe-guard/authe-guard";

const routes: Routes = [
  {
    path: '',
    canActivate: [retiredHomeGuard],
    children: [{ path: '', redirectTo: '/login', pathMatch: 'full' }]
  }, {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  }, {
    path: 'sign-up',
    component: SignupComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  },
  {
    path: 'instructions-for-child',
    component: FamilyOnboardComponent,
    canActivate: [retiredChildInstructionsGuard]
  }, {
    path: 'instructions-for-parent',
    component: FamilyOnboardComponent
  }, {
    path: 'join-family',
    component: FamilyOnboardComponent
  }, {
    path: 'join-family2',
    component: FamilyOnboardComponent
  }, {
    path: 'scan-qr',
    component: ScanQrComponent
  }, {
    path: 'our-policies',
    loadComponent: () => import('../core/components/user-profile/our-policies/our-policies.component').then(m => m.OurPoliciesComponent)
  }, {
    path: 'auth',
    // Rpoute to authenticated module
    loadChildren: () => import('../authenticated/authenticated.module').then(m => m.AuthenticatedModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule { }
