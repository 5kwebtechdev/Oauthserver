import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeDatepickerComponent } from "./superme-datepicker/superme-datepicker.component";
import { SupermeCalendarComponent } from "./superme-calendar/superme-calendar.component";
import { SupermeTimepickerComponent } from "./superme-timepicker/superme-timepicker.component";
import { SupermeBirthdaypickerComponent } from "./superme-birthdaypicker/superme-birthdaypicker.component";
import { SupermeWeekComponent } from "./superme-week/superme-week.component";
import { SupermeCompletionComponent } from "./superme-completion/superme-completion.component";
import { SupermeInputComponent } from './superme-input.component';

@NgModule({
  declarations: [
    SupermeDatepickerComponent,
    SupermeTimepickerComponent,
    SupermeBirthdaypickerComponent,
    SupermeWeekComponent,
    SupermeCompletionComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    SupermeCalendarComponent,
  ],
  exports: [
    SupermeDatepickerComponent,
    SupermeCalendarComponent,
    SupermeTimepickerComponent,
    SupermeBirthdaypickerComponent,
    SupermeWeekComponent,
    SupermeCompletionComponent
  ],
})
export class SupermeInputsModule { }
