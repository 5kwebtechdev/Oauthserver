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
    path: 'content',
    loadComponent: () => import('./core/components/content-card/content-main/content-main.component').then(m => m.ContentMainComponent)
  },
  {
    path: 'content/viewall',
    loadComponent: () => import('./core/components/content-card/content-viewall/content-viewall.component').then(m => m.ContentViewallComponent)
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
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'reel-section',
    loadComponent: () => import('./core/components/reel-section/reel-section.component').then(m => m.ReelSectionComponent)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
