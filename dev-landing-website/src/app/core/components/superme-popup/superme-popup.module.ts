import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermePopupComponent } from './superme-popup.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SupermePopupComponent
  ],
  exports: [
    SupermePopupComponent
  ]
})
export class SupermePopupModule { }