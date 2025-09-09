import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'notes-home',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './notes-home.component.html',
  styleUrls: ['./notes-home.component.scss']
})
export class NotesHomeComponent {}
