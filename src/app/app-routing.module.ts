import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedModule } from "./authenticated/authenticated.module";
import { authGuard } from './core/authe-guard/authe-guard';
import { OurPoliciesComponent } from './core/components/user-profile/our-policies/our-policies.component';

const routes: Routes = [
  // Stable public entry points used by the separate SuperMe marketing site.
  // Keep these redirects at the root so the website does not need to know the
  // Ionic app's internal `/home/*` route structure.
  {
    path: 'login',
    redirectTo: 'home/login',
    pathMatch: 'full'
  },
  {
    path: 'signup',
    redirectTo: 'home/sign-up',
    pathMatch: 'full'
  },
  {
    path: 'sign-up',
    redirectTo: 'home/sign-up',
    pathMatch: 'full'
  },
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
    path: 'learning-description',
    redirectTo: 'authed/content',
    pathMatch: 'full'
  },
  {
    path: 'result-page',
    loadComponent: () => import('./core/components/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent)
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
