import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';
import { LoginComponent } from "./login/login.component";
import { SignupComponent } from "./signup/signup.component";
import { InstructionsForChildComponent } from "./instructions-for-child/instructions-for-child.component";
import { InstructionsForParentComponent } from "./instructions-for-parent/instructions-for-parent.component";
import { JoinFamilyComponent } from "./join-family/join-family.component";
import { JoinFamily2Component } from "./join-family2/join-family2.component";
import { ScanQrComponent } from './scan-qr/scan-qr.component';
import { ResetPasswordComponent } from "./reset-password/reset-password.component";

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  }, {
    path: 'login',
    component: LoginComponent
  }, {
    path: 'sign-up',
    component: SignupComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent, // Add this route
  },
  {
    path: 'instructions-for-child',
    component: InstructionsForChildComponent
  }, {
    path: 'instructions-for-parent',
    component: InstructionsForParentComponent
  }, {
    path: 'join-family',
    component: JoinFamilyComponent
  }, {
    path: 'join-family2',
    component: JoinFamily2Component
  }, {
    path: 'scan-qr',
    component: ScanQrComponent
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
