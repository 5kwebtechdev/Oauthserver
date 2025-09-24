import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulPopupComponent } from './mindful-popup.component';

@NgModule({
  declarations: [
    MindfulPopupComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    MindfulPopupComponent
  ]
})
export class MindfulPopupModule { }