import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {AuthenticatedModule} from "./authenticated/authenticated.module";
import { NotesComponent } from './core/components/notes/notes.component';
import { NotesHomeComponent } from './core/components/notes/notes-home.component';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'notes',
    component: NotesComponent
  },
  {
    path: 'notes/home',
    component: NotesHomeComponent
  },
  {
    path: 'authed',
    loadChildren: () => import('./authenticated/authenticated.module').then( m => m.AuthenticatedModule)
  },
  {
    path: 'habit-page',
    loadComponent: () => import('./core/components/habit-section/habit-page/habit-page.component').then(m => m.HabitPageComponent)
  },
  {
    path: 'habit-input',
    loadComponent: () => import('./core/components/habit-section/habit-input/habit-input.component').then(m => m.HabitInputComponent)
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
