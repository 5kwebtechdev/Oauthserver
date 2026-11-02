import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SupermeDatepickerComponent } from "./superme-datepicker/superme-datepicker.component";
import { SupermeTimepickerComponent } from "./superme-timepicker/superme-timepicker.component";
import { SupermeBirthdaypickerComponent } from "./superme-birthdaypicker/superme-birthdaypicker.component";
import { SupermeWeekComponent } from "./superme-week/superme-week.component";
import { SupermeButtonComponent } from "../superme-button/superme-button.component";
import { SupermeCompletionComponent } from "./superme-compeletion/superme-completion.component";
import { SupermeInputComponent } from './superme-input.component';

@NgModule({
  declarations: [
    SupermeWeekComponent,
    SupermeCompletionComponent
  ],
  imports: [
    CommonModule,
    DatePipe,
    SupermeDatepickerComponent,
    SupermeTimepickerComponent,
    SupermeBirthdaypickerComponent,
    SupermeInputComponent,
    SupermeButtonComponent
  ],
  exports: [
    SupermeDatepickerComponent,
    SupermeTimepickerComponent,
    SupermeBirthdaypickerComponent,
    SupermeWeekComponent,
    SupermeCompletionComponent,
    SupermeInputComponent
    ,SupermeButtonComponent
  ],
})
export class SupermeInputsModule { }
