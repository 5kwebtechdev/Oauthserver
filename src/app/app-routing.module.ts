import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedModule } from "./authenticated/authenticated.module";
import { authGuard } from './core/authe-guard/authe-guard';
import { OurPoliciesComponent } from './core/components/user-profile/our-policies/our-policies.component';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'authed',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard]
  },
  {
    path: 'our-policies',
    component: OurPoliciesComponent
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
