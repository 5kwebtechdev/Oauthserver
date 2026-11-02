import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { AuthenticatedRoutingModule } from "./authenticated.routing.module";
import { IonicModule } from "@ionic/angular";
import { SupermeButtonComponent } from "../core/components/superme-button/superme-button.component";
import { SupermeBadgeComponent } from "../core/components/superme-badge/superme-badge.component";
import { SupermeInputsModule } from "../core/components/superme-inputs/superme-inputs.module";

@NgModule({
  declarations: [
    AuthenticatedComponent
  ],
  exports: [
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([]),
    AuthenticatedRoutingModule,
    IonicModule,
    SupermeButtonComponent,
    SupermeBadgeComponent,
    SupermeInputsModule
  ]
})
export class AuthenticatedModule { }