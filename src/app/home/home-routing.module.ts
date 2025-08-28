import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';
import {LoginComponent} from "./login/login.component";
import {SignupComponent} from "./signup/signup.component";
import {InstructionsComponent} from "./instructions/instructions.component";

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },{
    path : 'login',
    component: LoginComponent
  },{
    path : 'sign-up',
    component:SignupComponent
  },{
    path: 'instructions',
    component: InstructionsComponent
  },{
    path : 'auth',
    // Rpoute to authenticated module
    loadChildren: () => import('../authenticated/authenticated.module').then(m => m.AuthenticatedModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
