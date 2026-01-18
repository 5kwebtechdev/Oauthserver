import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
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
export class NotesNewComponent implements OnInit, AfterViewInit {
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
  private _draftTags: string[] = [];
  public isDraft: boolean = false;

  constructor(private notesService: NotesService, private router: Router) { }

  ngOnInit(): void {
    // load draft if present and populate title/text; tag keys mapped after view init
    try {
      const raw = sessionStorage.getItem('notes-draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.title = parsed.title || '';
        this.text = parsed.text || '';
        this._draftTags = Array.isArray(parsed.tags) ? parsed.tags : [];
        this.isDraft = Boolean((this.title && this.title.length) || (this.text && this.text.length) || (this._draftTags && this._draftTags.length));
      }
    } catch (e) {
      // ignore
    }
  }

  ngAfterViewInit(): void {
    // Map draft tag labels back to tag keys so the child component shows selected tags
    try {
      if (this._draftTags && this._draftTags.length && this.tagsComponent) {
        const options = this.tagsComponent.options || [];
        const keys: any[] = [];
        for (const label of this._draftTags) {
          const opt = options.find(o => String(o.value) === String(label));
          if (opt) keys.push(opt.key);
        }
        if (keys.length) {
          this.selectedTagKeys = keys;
          // also set the child component's internal selectedKeys so it reflects selection
          this.tagsComponent.selectedKeys = keys;
          // notify parent handlers if necessary
          this.tagsComponent.selectedKeysChange.emit(keys);
        }
      }
    } catch (e) { /* ignore mapping errors */ }
  }

  get canSave(): boolean {
    const hasTitle = Boolean((this.title || '').trim());
    const hasText = Boolean((this.text || '').trim());
    const hasTag = Array.isArray(this.selectedTagKeys) && this.selectedTagKeys.length > 0;
    return hasTitle && hasText && hasTag && !this.loading;
  }

  onSelectedKeysChange(keys: any[]) {
    this.selectedTagKeys = keys;
    this.saveDraft();
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
    // Auto-save draft to sessionStorage whenever title changes
    this.saveDraft();
  }

  public saveDraft() {
    try {
      // Only persist if there's meaningful content: title/text (non-whitespace) or selected tags
      const hasTitle = Boolean((this.title || '').trim().length);
      const hasText = Boolean((this.text || '').trim().length);
      const hasTags = Array.isArray(this.selectedTagKeys) && this.selectedTagKeys.length > 0;
      if (!hasTitle && !hasText && !hasTags) {
        // nothing meaningful to persist — remove any existing draft
        try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
        this.isDraft = false;
        return;
      }

      // resolve selected tag labels if possible
      const options = this.tagsComponent?.options || [];
      const tags = Array.isArray(this.selectedTagKeys) ? this.selectedTagKeys.map(key => options.find(o => String(o.key) === String(key))?.value).filter(Boolean) as string[] : [];
      const draft = { title: this.title || '', text: this.text || '', tags };
      sessionStorage.setItem('notes-draft', JSON.stringify(draft));
      this.isDraft = true;
    } catch (e) {
      // ignore sessionStorage errors
    }
  }

  onTitleFocus() {
    this.inputFocused = true;
  }

  onTitleBlur() {
    this.inputFocused = false;
  }

  goBack() {
    // save draft before leaving
    this.saveDraft();
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

    // Optimistic save: show the new note immediately from local cache
    this.loading = true;
    this.error = null;
    // add locally and call backend in background; navigate back immediately so user sees the note
    this.notesService.addOptimistic(payload).subscribe({
      next: () => {
        // backend succeeded; nothing more to do (service replaced temp note)
      },
      error: (err) => {
        // surface error but user already sees optimistic result removed by service
        this.error = (err && err.message) ? err.message : 'Failed to save note';
      }
    });
    this.loading = false;
    // clear draft after successful save
    try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
    this.isDraft = false;
    this.router.navigate(['/authed/notes']);
  }

  deleteDraft() {
    try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
    this.title = '';
    this.text = '';
    this.selectedTagKeys = [];
    this.isDraft = false;
    // navigate back to notes list after deletion
    this.router.navigate(['/authed/notes']);
  }
}
