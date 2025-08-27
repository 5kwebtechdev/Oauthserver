import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MindfulDatepickerComponent} from "./mindful-datepicker/mindful-datepicker.component";
import {MindfulTimepickerComponent} from "./mindful-timepicker/mindful-timepicker.component";
import {MindfulBirthdaypickerComponent} from "./mindful-birthdaypicker/mindful-birthdaypicker.component";
import {MindfulWeekComponent} from "./mindful-week/mindful-week.component";
import {MindfulCompletionComponent} from "./mindful-completion/mindful-completion.component";

@NgModule({
  declarations: [
    MindfulDatepickerComponent,
    MindfulTimepickerComponent,
    MindfulBirthdaypickerComponent,
    MindfulWeekComponent,
    MindfulCompletionComponent
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    MindfulDatepickerComponent,
    MindfulTimepickerComponent,
    MindfulBirthdaypickerComponent,
    MindfulWeekComponent,
    MindfulCompletionComponent
  ],
})
export class MindfulInputsModule { }
