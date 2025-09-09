import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';

@Component({
  selector: 'notes',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulButtonComponent],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})
export class NotesComponent {
  // pages: 'empty' (default), 'home', 'input', 'save'
  public page: 'empty' | 'home' | 'input' | 'save' = 'empty';
  public noteText: string = '';

  constructor(private modalCtrl: ModalController, private router: Router) { }

  close() {
    this.modalCtrl.dismiss();
  }

  go(page: 'empty' | 'home' | 'input' | 'save') {
    if (page === 'home') {
      // navigate to notes home page
      this.modalCtrl.dismiss();
      this.router.navigate(['/notes/home']);
      return;
    }
    this.page = page;
  }

  save() {
    // simple local save simulation — in a real app you'd persist via a service
    this.noteText = this.noteText.trim();
    if (!this.noteText) return;
    // simulate save then show save page
    this.page = 'save';
  }
}
