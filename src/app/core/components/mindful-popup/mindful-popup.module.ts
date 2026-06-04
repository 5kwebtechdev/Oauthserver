import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulPopupComponent } from './mindful-popup.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    MindfulPopupComponent
  ],
  exports: [
    MindfulPopupComponent
  ]
})
export class MindfulPopupModule { }