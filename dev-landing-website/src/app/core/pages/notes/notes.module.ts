import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotesRoutingModule } from './notes-routing.module';
import { CoreModule } from '../../core.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, NotesRoutingModule, CoreModule]
})
export class NotesModule {}
