import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedModule } from "./authenticated/authenticated.module";
import { authGuard, guestGuard } from './core/authe-guard/authe-guard';
import { DashboardRedirectGuard } from './core/guards/dashboard-redirect.guard';
import { OurPoliciesComponent } from './core/components/user-profile/our-policies/our-policies.component';

const routes: Routes = [
  // Stable, readable logged-in URLs from the approved URL-structure sheet.
  { path: 'quiz', loadComponent: () => import('./core/components/learning-section/learning-main/learning-main.component').then(m => m.LearningMainComponent), canActivate: [authGuard], data: { category: 'quizzes' } },
  { path: 'puzzle', loadComponent: () => import('./core/components/learning-section/learning-main/learning-main.component').then(m => m.LearningMainComponent), canActivate: [authGuard], data: { category: 'puzzles' } },
  { path: 'article', loadComponent: () => import('./core/components/learning-section/learning-main/learning-main.component').then(m => m.LearningMainComponent), canActivate: [authGuard], data: { category: 'articles' } },
  { path: 'master-class', loadComponent: () => import('./core/components/learning-section/learning-main/learning-main.component').then(m => m.LearningMainComponent), canActivate: [authGuard], data: { category: 'masterclass' } },
  { path: 'reels', redirectTo: 'authed/reels', pathMatch: 'full' },
  { path: 'journal', redirectTo: 'authed/journal-output', pathMatch: 'full' },
  { path: 'notes', redirectTo: 'authed/notes', pathMatch: 'full' },
  { path: 'productivity-calendar', redirectTo: 'authed/activity-calendar', pathMatch: 'full' },
  { path: 'find-a-tutor', redirectTo: 'authed/tutors', pathMatch: 'full' },
  { path: 'academy', redirectTo: 'authed/academies', pathMatch: 'full' },
  { path: 'sationery-shop', redirectTo: 'authed/education/shops', pathMatch: 'full' },
  { path: 'stationery-shop', redirectTo: 'authed/education/shops', pathMatch: 'full' },
  { path: 'book-store', redirectTo: 'authed/education/shops', pathMatch: 'full' },
  { path: 'second-hand-books', redirectTo: 'authed/second-hand-books', pathMatch: 'full' },
  { path: 'sports-shop', redirectTo: 'authed/education/shops', pathMatch: 'full' },
  { path: 'counselor', redirectTo: 'authed/counselors', pathMatch: 'full' },
  { path: 'event', redirectTo: 'authed/education/events', pathMatch: 'full' },
  // Stable public entry points used by the separate SuperMe marketing site.
  // Keep these redirects at the root so the website does not need to know the
  // Ionic app's internal `/home/*` route structure.
  {
    path: 'login',
    loadComponent: () =>
      import('./home/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./home/signup/signup.component').then((m) => m.SignupComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'sign-up',
    redirectTo: 'signup',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./home/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  // Canonical authenticated landing page. `pathMatch: full` leaves the
  // existing /home/* onboarding compatibility routes available below.
  {
    path: 'home',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard, DashboardRedirectGuard],
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
    redirectTo: 'login',
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
