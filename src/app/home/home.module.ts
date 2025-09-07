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
import {InstructionsForChildComponent} from "./instructions-for-child/instructions-for-child.component";
import {InstructionsForParentComponent} from "./instructions-for-parent/instructions-for-parent.component";
import {JoinFamilyComponent} from "./join-family/join-family.component";
import {JoinFamily2Component} from "./join-family2/join-family2.component";
import {ScanQrComponent} from "./scan-qr/scan-qr.component";
import {ResetPasswordComponent} from "./reset-password/reset-password.component";

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        HomePageRoutingModule,
        ReactiveFormsModule,
        MindfulSelectorsComponent,
        MindfulInputsModule,
        ScanQrComponent,
        ResetPasswordComponent
    ],
      declarations: [
        HomePage, 
        LoginComponent, 
        SignupComponent, 
        InstructionsForChildComponent, 
        InstructionsForParentComponent, 
        JoinFamilyComponent, 
        JoinFamily2Component
    ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class HomePageModule {}
