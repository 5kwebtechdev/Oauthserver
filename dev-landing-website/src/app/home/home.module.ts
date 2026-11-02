import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import { HomeRoutingModule } from './home-routing.module';
import { CoreModule } from '../core/core.module';

@NgModule({
    declarations: [
        // HomePage is standalone, so it's not declared here
    ],
    imports: [
        CommonModule,
        RouterModule,
        HomeRoutingModule,
        CoreModule
    ]
})
export class HomeModule { }