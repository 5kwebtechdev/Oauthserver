import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Note, NotesService } from '../../core/notes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <h1>Notes</h1>
      <a routerLink="/dashboard">Back to dashboard</a>

      <form (ngSubmit)="create()">
        <input [(ngModel)]="title" name="title" placeholder="Title" required />
        <input [(ngModel)]="content" name="content" placeholder="Content" />
        <button type="submit">Add note</button>
      </form>
      <p *ngIf="error" class="error">{{ error }}</p>

      <h2>My notes</h2>
      <ul>
        <li *ngFor="let note of myNotes">{{ note.title }} - {{ note.content }}</li>
      </ul>

      <ng-container *ngIf="isAdmin">
        <h2>All notes (admin)</h2>
        <ul>
          <li *ngFor="let note of allNotes">{{ note.ownerUsername }}: {{ note.title }} - {{ note.content }}</li>
        </ul>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 600px; margin: 2rem auto; font-family: sans-serif; }
    .error { color: #b00020; }
    form { display: flex; gap: 0.5rem; margin: 1rem 0; }
  `],
})
export class NotesComponent implements OnInit {
  myNotes: Note[] = [];
  allNotes: Note[] = [];
  isAdmin = false;
  title = '';
  content = '';
  error: string | null = null;

  constructor(private readonly notes: NotesService) {}

  ngOnInit(): void {
    this.loadMyNotes();
    this.notes.me().subscribe((me) => {
      this.isAdmin = me.roles.includes('ROLE_ADMIN');
      if (this.isAdmin) {
        this.notes.allNotes().subscribe((all) => (this.allNotes = all));
      }
    });
  }

  loadMyNotes(): void {
    this.notes.myNotes().subscribe({
      next: (notes) => (this.myNotes = notes),
      error: () => (this.error = 'Could not load notes.'),
    });
  }

  create(): void {
    if (!this.title.trim()) {
      return;
    }
    this.notes.createNote(this.title, this.content).subscribe({
      next: () => {
        this.title = '';
        this.content = '';
        this.loadMyNotes();
      },
      error: () => (this.error = 'Could not create note.'),
    });
  }
}
