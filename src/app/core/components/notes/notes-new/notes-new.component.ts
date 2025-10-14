import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotesService, NoteModel } from '../notes.service';
import { MindfulTagsComponent } from '../../mindful-selectors/mindful-tags/mindful-tags.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

@Component({
  selector: 'notes-new',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulTagsComponent, MindfulButtonComponent],
  templateUrl: './notes-new.component.html',
  styleUrls: ['./notes-new.component.scss']
})
export class NotesNewComponent {
  title = '';
  text = '';
  tagsInput = '';
  selectedTagKeys: any[] = [];
  loading = false;
  error: string | null = null;
  tagOptions: { key: any; value: string }[] = [
    { key: 1, value: 'personal' },
    { key: 2, value: 'work' },
    { key: 3, value: 'ideas' },
    { key: 4, value: 'health' },
    { key: 5, value: 'finance' }
  ];

  constructor(private notesService: NotesService, private router: Router) { }

  onSelectedKeysChange(keys: any[]) {
    this.selectedTagKeys = keys;
  }

  goBack() {
    this.router.navigate(['/authed/notes']);
  }

  save() {
    const tags = this.selectedTagKeys.map(key => this.tagOptions.find(o => o.key === key)?.value).filter(Boolean) as string[];
    const payload = {
      title: this.title || 'Untitled',
      content: this.text || '',
      tags
    };

    this.loading = true;
    this.error = null;
    this.notesService.addNote(payload).subscribe({
      next: () => {
        this.loading = false;
        // navigate back to notes home
        this.router.navigate(['/authed/notes']);
      },
      error: (err) => {
        this.loading = false;
        this.error = (err && err.message) ? err.message : 'Failed to save note';
        // still add locally as fallback
        const note: NoteModel = {
          title: payload.title,
          text: payload.content,
          tags: payload.tags,
          createdAt: new Date().toISOString()
        };
        this.notesService.addLocal(note);
        // navigate back to notes so user sees their note
        this.router.navigate(['/authed/notes']);
      }
    });
  }
}
