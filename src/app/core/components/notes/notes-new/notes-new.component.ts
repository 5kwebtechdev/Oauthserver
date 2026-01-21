import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NotesService, NoteModel } from '../notes.service';
import { MindfulTagsComponent } from '../../mindful-selectors/mindful-tags/mindful-tags.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';

@Component({
  selector: 'notes-new',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulTagsComponent, MindfulButtonComponent, MindfulNavigatorComponent, MindfulPopupComponent],
  templateUrl: './notes-new.component.html',
  styleUrls: ['./notes-new.component.scss']
})
export class NotesNewComponent implements OnInit, AfterViewInit {
  title = '';
  // Controls how many characters are allowed and how many to show in the header
  readonly MAX_TITLE = 24; // hard maximum allowed
  readonly DISPLAY_LEN = 24; // number of chars to show before ellipsis
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
  private currentDraftId: number | null = null;
  // Edit mode state
  public editing: boolean = false;
  private editId: any = null;
  // Snapshot of the original note when editing; used to avoid marking as draft if nothing changed
  private originalSnapshot: { title: string; text: string; tags: string[] } | null = null;
  // Confirmation popup state for delete action when editing a saved note
  public showMindfulPopup: boolean = false;

  constructor(private notesService: NotesService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    // load draft if present and populate title/text; tag keys mapped after view init
    try {
      // If route includes ?fresh=1 we intentionally ignore any stored draft
      const fresh = this.route.snapshot.queryParamMap.get('fresh');
      if (fresh !== '1') {
        // If a specific draft id was selected, load that draft from array
        const draftIdRaw = sessionStorage.getItem('notes-draft-id');
        if (draftIdRaw) {
          const id = Number(draftIdRaw);
          const arrRaw = sessionStorage.getItem('notes-drafts');
          if (arrRaw) {
            const arr = JSON.parse(arrRaw) as any[];
            const found = Array.isArray(arr) ? arr.find(a => Number(a.id) === id) : null;
            if (found) {
              this.currentDraftId = id;
              this.title = found.title || '';
              this.text = found.text || '';
              this._draftTags = Array.isArray(found.tags) ? found.tags : [];
              this.isDraft = true;
            }
          }
        } else {
          // No specific draft chosen; do not auto-load a single global draft anymore
        }
      }
    } catch (e) {
      // ignore
    }

    // check for edit payload (set by notes list when user clicks edit)
    try {
      const rawEdit = sessionStorage.getItem('notes-edit');
      if (rawEdit) {
        const parsed = JSON.parse(rawEdit) || {};
        // populate fields from note object
        this.title = parsed.title || this.title || '';
        this.text = parsed.text || this.text || '';
        this._draftTags = Array.isArray(parsed.tags) ? parsed.tags : this._draftTags;
        this.editing = true;
        this.editId = parsed.id || parsed.noteId || parsed._id || null;
        // Capture original content so we can detect real edits later. Do not treat the original note as a draft.
        this.originalSnapshot = { title: String(this.title || ''), text: String(this.text || ''), tags: Array.isArray(this._draftTags) ? [...this._draftTags] : [] };
        this.isDraft = false;
        // clear the session-stored edit marker so normal navigation isn't affected later
        try { sessionStorage.removeItem('notes-edit'); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  ngAfterViewInit(): void {
    // Map draft tag labels back to tag keys so the child component shows selected tags
    try {
      if (this._draftTags && this._draftTags.length && this.tagsComponent) {
        // Ensure the tags exist in the child component (adds missing custom tags if required)
        const keys = this.tagsComponent.ensureOptionsForLabels(this._draftTags.map(t => String(t)));
        if (keys && keys.length) {
          this.selectedTagKeys = keys;
          this.tagsComponent.selectedKeys = keys;
          this.tagsComponent.selectedKeysChange.emit(keys);
        }
      }
    } catch (e) { /* ignore mapping errors */ }
  }

  private loadDraftsArray(): Array<any> {
    try {
      const raw = sessionStorage.getItem('notes-drafts');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  private saveDraftsArray(arr: Array<any>) {
    try { sessionStorage.setItem('notes-drafts', JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  private removeDraftById(id: number): boolean {
    try {
      const arr = this.loadDraftsArray();
      const filtered = arr.filter(a => Number(a.id) !== Number(id));
      if (filtered.length === arr.length) return false;
      this.saveDraftsArray(filtered);
      // clear selection marker
      try { sessionStorage.removeItem('notes-draft-id'); } catch (e) { /* ignore */ }
      return true;
    } catch (e) { return false; }
  }

  get canSave(): boolean {
    const hasTitle = Boolean((this.title || '').trim());
    const hasText = Boolean((this.text || '').trim());
    const hasTag = Array.isArray(this.selectedTagKeys) && this.selectedTagKeys.length > 0;
    // When editing, require that the user actually made changes before allowing save
    if (this.editing) {
      return hasTitle && hasText && hasTag && !this.loading && this.hasChanges();
    }
    return hasTitle && hasText && hasTag && !this.loading;
  }

  /**
   * Return true if current inputs differ from the original snapshot captured when edit began.
   */
  private hasChanges(): boolean {
    if (!this.editing || !this.originalSnapshot) return true;
    const curTitle = String((this.title || '').trim());
    const curText = String((this.text || '').trim());

    // Resolve current selected tag labels using the child component options
    const options = this.tagsComponent?.options || [];
    const curTags = Array.isArray(this.selectedTagKeys) ? this.selectedTagKeys.map(key => options.find(o => String(o.key) === String(key))?.value).filter(Boolean) as string[] : [];

    const origTitle = String((this.originalSnapshot.title || '').trim());
    const origText = String((this.originalSnapshot.text || '').trim());
    const origTags = Array.isArray(this.originalSnapshot.tags) ? this.originalSnapshot.tags : [];

    const sameTitle = curTitle === origTitle;
    const sameText = curText === origText;
    const sameTags = origTags.length === curTags.length && origTags.every((t, i) => String(t) === String(curTags[i]));

    return !(sameTitle && sameText && sameTags);
  }

  onSelectedKeysChange(keys: any[]) {
    this.selectedTagKeys = keys;
    this.saveDraft();
  }

  onDelete() {
    // If editing an existing saved note, show confirmation popup and delete via API.
    if (this.editing && this.editId) {
      this.showMindfulPopup = true;
      return;
    }
    // Otherwise treat as draft deletion
    this.deleteDraft();
  }

  confirmCancel() {
    this.showMindfulPopup = false;
  }

  confirmDelete() {
    this.showMindfulPopup = false;
    const id = this.editId;
    if (id && this.notesService && this.notesService.deleteNote) {
      this.notesService.deleteNote(id).subscribe({
        next: () => {
          // Remove any related draft and navigate back
          try { if (this.currentDraftId) { this.removeDraftById(this.currentDraftId); this.currentDraftId = null; } } catch (e) { /* ignore */ }
          this.editing = false;
          this.editId = null;
          this.router.navigate(['/authed/notes']);
        },
        error: (err) => {
          console.error('Failed to delete note via API', err);
          // still navigate back and let list refresh handle state
          this.router.navigate(['/authed/notes']);
        }
      });
    } else {
      // fallback: just navigate back
      this.router.navigate(['/authed/notes']);
    }
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
      this.title = value.slice(0, this.MAX_TITLE);
      input.value = this.title;
      this.showLimitTooltip = true;
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
        // nothing meaningful to persist — remove any existing draft entry
        if (this.currentDraftId) {
          this.removeDraftById(this.currentDraftId);
          this.currentDraftId = null;
        } else {
          try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
        }
        this.isDraft = false;
        return;
      }

      // resolve selected tag labels if possible
      const options = this.tagsComponent?.options || [];
      const tags = Array.isArray(this.selectedTagKeys) ? this.selectedTagKeys.map(key => options.find(o => String(o.key) === String(key))?.value).filter(Boolean) as string[] : [];

      // If we're editing and nothing has changed compared to the original snapshot, don't save a draft.
      if (this.editing && this.originalSnapshot) {
        const sameTitle = String((this.title || '').trim()) === String((this.originalSnapshot.title || '').trim());
        const sameText = String((this.text || '').trim()) === String((this.originalSnapshot.text || '').trim());
        const origTags = Array.isArray(this.originalSnapshot.tags) ? this.originalSnapshot.tags : [];
        const sameTags = origTags.length === tags.length && origTags.every((t, i) => String(t) === String(tags[i]));
        if (sameTitle && sameText && sameTags) {
          // No meaningful change — remove any existing draft entry and mark as not draft
          if (this.currentDraftId) {
            try { this.removeDraftById(this.currentDraftId); } catch (e) { /* ignore */ }
            this.currentDraftId = null;
          } else {
            try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
          }
          this.isDraft = false;
          return;
        }
      }

      // Persist into the drafts array (create or update entry)
      try {
        const arr = this.loadDraftsArray();
        if (this.currentDraftId) {
          const idx = arr.findIndex(a => Number(a.id) === Number(this.currentDraftId));
          if (idx > -1) {
            arr[idx] = { id: this.currentDraftId, title: this.title || '', text: this.text || '', tags };
          } else {
            arr.push({ id: this.currentDraftId, title: this.title || '', text: this.text || '', tags });
          }
        } else {
          const id = Date.now();
          arr.push({ id, title: this.title || '', text: this.text || '', tags });
          this.currentDraftId = id;
          try { sessionStorage.setItem('notes-draft-id', String(id)); } catch (e) { /* ignore */ }
        }
        this.saveDraftsArray(arr);
        this.isDraft = true;
      } catch (e) {
        // fallback: keep behavior if storage fails
        const draft = { title: this.title || '', text: this.text || '', tags };
        try { sessionStorage.setItem('notes-draft', JSON.stringify(draft)); } catch (er) { /* ignore */ }
        this.isDraft = true;
      }
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
    // If we're editing an existing note, do NOT persist a draft when the
    // user navigates back via the header/back button. Require an explicit
    // save to update the original note. For non-edit flows, save draft as
    // before so users don't lose in-progress content.
    if (this.editing) {
      // When editing an existing saved note, do not persist a draft here.
      this.router.navigate(['/authed/notes']);
      return;
    }

    // save draft before leaving when not editing
    this.saveDraft();
    this.router.navigate(['/authed/notes']);
  }

  save() {
    // Prevent save when UI indicates disabled
    if (!this.canSave) return;
    const options = this.tagsComponent?.options || [];
    const tags = this.selectedTagKeys.map(key => options.find(o => String(o.key) === String(key))?.value).filter(Boolean) as string[];
    const payload = {
      title: this.title || 'Untitled',
      content: this.text || '',
      tags
    };
    this.loading = true;
    this.error = null;

    if (this.editing && this.editId) {
      // Optimistic update: apply locally and navigate immediately
      this.notesService.updateOptimistic(this.editId, payload).subscribe({
        next: () => {
          // immediately navigate back so user sees updated note
          // Remove matching draft entry if present
            try {
              let removed = false;
              if (this.currentDraftId) {
                removed = this.removeDraftById(this.currentDraftId);
                this.currentDraftId = null;
              } else {
                const arr = this.loadDraftsArray();
                const idx = arr.findIndex(a => {
                  const sameTitle = String((a.title || '')).trim() === String(payload.title || '').trim();
                  const sameText = String((a.text || '')).trim() === String(payload.content || '').trim();
                  const aTags = Array.isArray(a.tags) ? a.tags : [];
                  const sameTags = Array.isArray(payload.tags) && aTags.length === payload.tags.length && aTags.every((t: any, i: number) => String(t) === String(payload.tags[i]));
                  return sameTitle && sameText && sameTags;
                });
                if (idx > -1) {
                  arr.splice(idx, 1);
                  this.saveDraftsArray(arr);
                  removed = true;
                }
              }
              if (removed) this.isDraft = false;
            } catch (e) { /* ignore */ }
          this.editing = false;
          this.editId = null;
          this.loading = false;
          this.router.navigate(['/authed/notes']);
        },
        error: (err) => {
          this.loading = false;
          this.error = (err && err.message) ? err.message : 'Failed to update note';
        }
      });
    } else {
      // Optimistic add: show the new note immediately from local cache
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
      // Remove matching draft entry if present
      try {
        let removed = false;
        if (this.currentDraftId) {
          removed = this.removeDraftById(this.currentDraftId);
          this.currentDraftId = null;
        } else {
          const arr = this.loadDraftsArray();
          const idx = arr.findIndex(a => {
            const sameTitle = String((a.title || '')).trim() === String(payload.title || '').trim();
            const sameText = String((a.text || '')).trim() === String(payload.content || '').trim();
            const aTags = Array.isArray(a.tags) ? a.tags : [];
            const sameTags = Array.isArray(payload.tags) && aTags.length === payload.tags.length && aTags.every((t: any, i: number) => String(t) === String(payload.tags[i]));
            return sameTitle && sameText && sameTags;
          });
          if (idx > -1) {
            arr.splice(idx, 1);
            this.saveDraftsArray(arr);
            removed = true;
          }
        }
        if (removed) this.isDraft = false;
      } catch (e) { /* ignore */ }
      this.router.navigate(['/authed/notes']);
    }
  }

  deleteDraft() {
    try {
      if (this.currentDraftId) {
        this.removeDraftById(this.currentDraftId);
        this.currentDraftId = null;
      } else {
        try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    this.title = '';
    this.text = '';
    this.selectedTagKeys = [];
    this.isDraft = false;
    // navigate back to notes list after deletion
    this.router.navigate(['/authed/notes']);
  }
}
