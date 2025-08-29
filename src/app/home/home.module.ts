import {CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import {LoginComponent} from "./login/login.component";
import {SignupComponent} from "./signup/signup.component";
import {MindfulSelectorsComponent} from "../core/components/mindful-selectors/mindful-selectors.component";
import {MindfulInputsModule} from "../core/components/mindful-inputs/mindful-inputs.module";
import {InstructionsComponent} from "./instructions/instructions.component";
import {JoinFamilyComponent} from "./join-family/join-family.component";
import {ScanQrComponent} from "./scan-qr/scan-qr.component";

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        HomePageRoutingModule,
        ReactiveFormsModule,
        MindfulSelectorsComponent,
        MindfulInputsModule,
        ScanQrComponent
    ],
      declarations: [HomePage, LoginComponent, SignupComponent, InstructionsComponent, JoinFamilyComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class HomePageModule {}
