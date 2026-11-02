import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TermsUseComponent } from './terms-use/terms-use.component';

const routes: Routes = [
  {
    path: 'terms-use',
    component: TermsUseComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FooterPagesRoutingModule { }