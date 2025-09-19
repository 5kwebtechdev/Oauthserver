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
    path: 'content/description',
    loadComponent: () => import('./core/components/content-card/content-description/content-description.component').then(m => m.ContentDescriptionComponent)
  },
  {
    path: 'quizzes',
    loadComponent: () => import('./core/components/content-card/content-quiz/content-quiz.component').then(m => m.ContentQuizComponent)
  },
  {
    path: 'articles',
    loadComponent: () => import('./core/components/content-card/Content-Articles/content-articles.component').then(m => m.ContentArticlesComponent)
  },
  {
    path: 'puzzles',
    loadComponent: () => import('./core/components/content-card/content-puzzle/content-puzzle.component').then(m => m.ContentPuzzleComponent)
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
    path: 'habit-page',
    loadComponent: () => import('./core/components/habit-section/habit-page/habit-page.component').then(m => m.HabitPageComponent)
  },
  {
    path: 'habit-input',
    loadComponent: () => import('./core/components/habit-section/habit-input/habit-input.component').then(m => m.HabitInputComponent)
  },
  {
    path: 'journal-input',
    loadComponent: () => import('./core/components/journals/journal-input/journal-input.component').then(m => m.JournalInputComponent)
  },
  {
    path: 'journal-output',
    loadComponent: () => import('./core/components/journals/journal-output/journal-output.component').then(m => m.JournalOutputComponent)
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
  ,
  {
    path: 'reel-expand',
    loadComponent: () => import('./core/components/reel-section/reel-expand/reels-expand.component').then(m => m.ReelsExpandComponent)
  }
  ,
  {
    path: 'tutors',
    loadComponent: () => import('./core/components/tutor-section/tutor-homepage/tutor-homepage.component').then(m => m.TutorHomepageComponent)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
