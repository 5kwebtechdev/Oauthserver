import { Component, ViewChild } from '@angular/core';
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
  // Controls how many characters are allowed and how many to show in the header
  readonly MAX_TITLE = 48; // hard maximum allowed
  readonly DISPLAY_LEN = 16; // number of chars to show before ellipsis
  inputFocused = false;
  showLimitTooltip = false;
  text = '';
  tagsInput = '';
  selectedTagKeys: any[] = [];
  loading = false;
  error: string | null = null;
  // Use MindfulTags defaults; resolve labels via ViewChild at save time
  @ViewChild(MindfulTagsComponent) tagsComponent?: MindfulTagsComponent;

  constructor(private notesService: NotesService, private router: Router) { }

  get canSave(): boolean {
    const hasTitle = Boolean((this.title || '').trim());
    const hasText = Boolean((this.text || '').trim());
    const hasTag = Array.isArray(this.selectedTagKeys) && this.selectedTagKeys.length > 0;
    return hasTitle && hasText && hasTag && !this.loading;
  }

  onSelectedKeysChange(keys: any[]) {
    this.selectedTagKeys = keys;
  }

  get displayValue(): string {
    if (this.inputFocused) return this.title;
    if (!this.title) return '';
    return this.title.length <= this.DISPLAY_LEN ? this.title : this.title.slice(0, this.DISPLAY_LEN) + '...';
  }

  handleTitleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value || '';
    if (value.length > this.MAX_TITLE) {
      // Enforce hard maximum and notify user briefly
      this.title = value.slice(0, this.MAX_TITLE);
      input.value = this.title;
      this.showLimitTooltip = true;
      setTimeout(() => this.showLimitTooltip = false, 2000);
    } else {
      this.title = value;
    }
  }

  onTitleFocus() {
    this.inputFocused = true;
  }

  onTitleBlur() {
    this.inputFocused = false;
  }

  goBack() {
    this.router.navigate(['/authed/notes']);
  }

  save() {
    const options = this.tagsComponent?.options || [];
    const tags = this.selectedTagKeys.map(key => options.find(o => String(o.key) === String(key))?.value).filter(Boolean) as string[];
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
