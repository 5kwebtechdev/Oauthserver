import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { CallbackComponent } from './pages/callback/callback.component';
import { ContinueWithEmailComponent } from './pages/continue-with-email/continue-with-email.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { NotesComponent } from './pages/notes/notes.component';
import { RegisterComponent } from './pages/register/register.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  // No Angular-rendered login page: auth-server's own /login (username/password,
  // Google, continue-with-email, forgot-password - all of it) is the one real login UI.
  // This route exists only so routerLink="/login" elsewhere keeps working - it resolves
  // instantly, before anything renders, straight into the dashboard route's authGuard,
  // which immediately full-page-redirects an unauthenticated visitor into the real PKCE
  // flow (landing on auth-server's /login). An already-authenticated visitor just lands
  // on the dashboard, which is correct too - there's nothing a login page should show them.
  { path: 'login', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'continue-with-email', component: ContinueWithEmailComponent },
  // Email registration, driven entirely by the SuperMeBE-compatible /v1 API - the same five calls
  // the real SuperMeApp frontend makes, in the same order (ARCHITECTURE.md section 20).
  { path: 'register', component: RegisterComponent },
  { path: 'callback', component: CallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [authGuard] },
];
