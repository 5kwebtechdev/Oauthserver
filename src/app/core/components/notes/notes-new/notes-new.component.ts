import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotesService, NoteModel } from '../notes.service';

@Component({
  selector: 'notes-new',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './notes-new.component.html',
  styleUrls: ['./notes-new.component.scss']
})
export class NotesNewComponent {
  title = '';
  text = '';
  tagsInput = '';

  constructor(private notesService: NotesService, private router: Router) {}

  goBack() {
    this.router.navigate(['/notes/home']);
  }

  save() {
    const tags = this.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const note: NoteModel = {
      title: this.title || 'Untitled',
      text: this.text || '',
      tags,
      createdAt: new Date().toISOString()
    };

    this.notesService.add(note);
    // navigate back to notes home
    this.router.navigate(['/notes/home']);
  }
}
