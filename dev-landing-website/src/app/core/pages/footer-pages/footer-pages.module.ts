import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterPagesRoutingModule } from './footer-pages.routing.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FooterPagesRoutingModule
  ]
})
export class FooterPagesModule { }