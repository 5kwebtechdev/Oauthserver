import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {AuthenticatedComponent} from "./authenticated.component";
import {TestComponent} from "./test/test.component";
import {ProfileComponent} from "./profile/profile.component";
import {TimelineComponent} from "./timeline/timeline.component";
import {AddCalendarComponent} from "./add-calendar/add-calendar.component";


const routes: Routes = [
  {
    path: 'home',
    component: TestComponent
  },{
    path: 'profile/:section',
    component: ProfileComponent
  },{
    path: 'timeline',
    component: TimelineComponent
  },{
    path: 'add-calendar',
    component: AddCalendarComponent
  },{
    path: '',
    component: AuthenticatedComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AuthenticatedRoutingModule { }
