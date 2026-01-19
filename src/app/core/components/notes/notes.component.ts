import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { NotesService, NoteModel } from './notes.service';
import { NotesSaveComponent } from './notes-save/notes-save.component';

@Component({
  selector: 'notes',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, MindfulButtonComponent, MindfulNavigatorComponent],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})
export class NotesComponent {
  // pages: 'empty' (default), 'home', 'input', 'save'
  public page: 'empty' | 'home' | 'input' | 'save' = 'empty';
  public noteText: string = '';
  public noteTitle: string = '';
  public showTagInput: boolean = false;
  public newTagName: string = '';
  public tags: { key: any; value: string }[] = [];
  public titleCollapsed: boolean = false;
  public notes: NoteModel[] = [];
  public draft: { title: string; text: string; tags?: string[] } | null = null;
  // tag action UI
  public activeTagIndex: number | null = null;
  public editIndex: number | null = null;
  public editName: string = '';

  constructor(private modalCtrl: ModalController, private router: Router, private notesService: NotesService) {
    // restore session cache if present; otherwise fetch from server once
    this.notesService.initFromSession();
    this.notes = this.notesService.getAll();
    // load draft from sessionStorage if present
    try {
      const raw = sessionStorage.getItem('notes-draft');
      if (raw) {
        const parsed = JSON.parse(raw);
        // ensure tags is an array if present
        if (parsed && parsed.tags && !Array.isArray(parsed.tags)) parsed.tags = [];
        this.draft = parsed;
      }
    } catch (e) {
      // ignore storage errors
    }
    // subscribe to updates so the list refreshes when new notes are added
    this.notesService.notes$.subscribe((list) => {
      this.notes = list;
    });
    // only fetch from server if we don't have any cached notes
    if (!this.notes || this.notes.length === 0) {
      this.loadFromServer();
    }
  }

  /**
   * Open a note in the save/view modal. Uses Ionic Modal to present the NotesSaveComponent
   * and passes the note data via componentProps. The modal can be dismissed by the save
   * component via the injected close callback or by ModalController.dismiss().
   */
  async openNote(note: NoteModel) {
    try {
      const modal = await this.modalCtrl.create({
        component: NotesSaveComponent,
        componentProps: {
          title: note.title,
          content: note.text,
          showDelete: true,
          showShare: true,
          noteId: (note as any).id || null,
          // provide a small helper so the save component can close the modal without needing ModalController itself
          closeModalFn: () => modal.dismiss()
        }
      });
      await modal.present();
    } catch (e) {
      console.error('Failed to open note modal', e);
      // fallback: navigate to a dedicated route if modal creation fails
      this.router.navigate(['/authed/notes']);
    }
  }

  // sorting state: 'created' | 'modified' | 'az' | 'za'
  public sortKey: 'created' | 'modified' | 'az' | 'za' = 'created';
  // typed options for the sort dropdown to satisfy Angular template type checking
  public sortOptions: { k: 'created' | 'modified' | 'az' | 'za'; l: string }[] = [
    { k: 'created', l: 'Date Created' },
    { k: 'modified', l: 'Date Modified' },
    { k: 'az', l: 'A - Z' },
    { k: 'za', l: 'Z - A' }
  ];
  public loading: boolean = false;
  public loadError: string | null = null;

  public loadFromServer() {
    this.loading = true;
    this.loadError = null;
    this.notesService.fetchAll().subscribe({
      next: (list) => {
        this.notes = list || [];
        // apply current sort
        this.applySort();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load notes', err);
        this.loadError = 'Failed to load notes';
        this.loading = false;
      }
    });
  }

  /**
   * Called when user picks a sort option.
   */
  public setSort(key: 'created' | 'modified' | 'az' | 'za') {
    this.sortKey = key;
    this.applySort();
    // close any open details automatically (if used) — template uses native <details>
    try {
      const details = document.querySelector('.sort-dropdown') as HTMLDetailsElement | null;
      if (details && details.open) details.open = false;
    } catch (e) { /* ignore DOM errors in SSR or test env */ }
  }

  private applySort() {
    if (!this.notes || !this.notes.length) return;
    const notesCopy = [...this.notes];
    if (this.sortKey === 'created') {
      notesCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.sortKey === 'modified') {
      notesCopy.sort((a, b) => {
        const at = a.updatedAt || a.createdAt;
        const bt = b.updatedAt || b.createdAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      });
    } else if (this.sortKey === 'az') {
      notesCopy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (this.sortKey === 'za') {
      notesCopy.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    }
    this.notes = notesCopy;
  }
  close() {
    this.modalCtrl.getTop().then(modal => {
      if (modal) {
        this.modalCtrl.dismiss();
      } else {
        this.router.navigate(['/authed/user-dashboard']);
      }
    }).catch(() => {
      this.router.navigate(['/authed/user-dashboard']);
    });
  }

  go(page: 'empty' | 'home' | 'input' | 'save') {
    if (page === 'home') {
      // navigate to notes home page
      this.modalCtrl.dismiss();
      this.router.navigate(['/authed/notes']);
      return;
    }
    this.page = page;
  }

  save() {
    // keep old behavior for compatibility
    this.saveNote();
  }

  saveNote() {
    // simple local save simulation — persist a note object into `notes`
    const text = (this.noteText || '').trim();
    if (!text) return;
    const title = (this.noteTitle || '').trim() || 'Untitled';
    const note: NoteModel = {
      title,
      text,
      tags: this.tags.map(t => t.value),
      createdAt: new Date().toISOString()
    };
    this.notesService.add(note);
    this.notes = this.notesService.getAll();
    // clear draft since note was saved
    try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
    this.draft = null;
    // clear current editing state
    this.noteText = '';
    this.noteTitle = '';
    this.tags = [];
    this.titleCollapsed = false;
    this.showNotes();
  }

  showNotes() {
    // refresh cached notes from service
    this.notes = this.notesService.getAll();
    this.page = this.notes.length ? 'home' : 'empty';
  }

  /**
   * Reload notes from service into local list.
   */
  reload() {
    this.notes = this.notesService.getAll();
  }

  addTag() {
    // show inline tag input overlay
    this.showTagInput = true;
    // when shown, newTagName will be bound to the input; focus handled in template if needed
  }

  confirmTag() {
    const name = (this.newTagName || '').trim();
    if (name) {
      const key = Date.now();
      this.tags.push({ key, value: name });
    }
    this.newTagName = '';
    this.showTagInput = false;
    // after adding a tag, collapse the title to show truncated form
    this.updateTitleCollapsed();
  }

  toggleTagActions(index: number) {
    if (this.activeTagIndex === index) {
      this.activeTagIndex = null;
    } else {
      this.activeTagIndex = index;
    }
  }

  startEditTag(index: number) {
    this.editIndex = index;
    this.editName = this.tags[index] ? this.tags[index].value : '';
    this.activeTagIndex = null;
  }

  saveEditedTag(index: number) {
    const v = (this.editName || '').trim();
    if (!v) return;
    if (this.tags[index]) this.tags[index].value = v;
    this.editIndex = null;
    this.editName = '';
  }

  deleteTag(index: number) {
    this.tags.splice(index, 1);
    this.activeTagIndex = null;
    if (this.editIndex === index) {
      this.editIndex = null;
      this.editName = '';
    }
  }

  onNotesClick() {
    // when user taps the notes area, collapse the title
    this.updateTitleCollapsed();
  }

  updateTitleCollapsed() {
    // collapse title to first three words followed by ellipsis when title exists
    if (this.noteTitle && this.noteTitle.trim().length > 0) {
      const words = this.noteTitle.trim().split(/\s+/);
      this.titleCollapsed = words.length > 3 || this.noteTitle.length > 20;
    } else {
      this.titleCollapsed = false;
    }
  }

  // Handlers for MindfulTagsComponent events
  onTagEdit(event: { key: any; value: string }) {
    const key = event && event.key;
    const idx = this.tags.findIndex(t => t.key === key);
    if (idx > -1) {
      this.tags[idx].value = event.value;
    }
  }

  onTagDelete(key: any) {
    const idx = this.tags.findIndex(t => t.key === key);
    if (idx > -1) {
      this.tags.splice(idx, 1);
    }
  }

  onTagAdd(event: { key: any; value: string }) {
    const val = (event && event.value) ? String(event.value) : '';
    const key = event && event.key ? event.key : Date.now();
    if (val) {
      this.tags.push({ key, value: val });
    }
  }

  onSelectedKeysChange(keys: any[]) {
    // if external selection is needed, map selected keys to internal indices
    // currently not used, but kept for future compatibility
    // e.g., this.selectedTagIndices = keys;
  }

  // Provide options in the { key, value } shape expected by MindfulTagsComponent
  get tagOptions(): { key: any; value: string }[] {
    return this.tags.map(t => ({ key: t.key, value: t.value }));
  }

  get truncatedTitle(): string {
    if (!this.noteTitle) return '';
    const words = this.noteTitle.trim().split(/\s+/);
    if (words.length <= 3 && this.noteTitle.length <= 20) return this.noteTitle;
    return words.slice(0, 3).join(' ') + '...';
  }

  // Methods for the notes list template
  trackByIndex(index: number, item: any): any {
    return index;
  }

  isList(text: string | string[]): boolean {
    if (typeof text === 'string') {
      return text.trim().startsWith('- ') || text.includes('\n- ');
    }
    return false;
  }

  getList(note: NoteModel): string[] {
    if (typeof note.text === 'string') {
      return note.text.split('\n').filter((line: string) => line.trim().startsWith('- ')).map((line: string) => line.trim().substring(2));
    }
    return [];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  primaryTag(note: NoteModel): string {
    return note.tags && note.tags.length > 0 ? note.tags[0] : 'No Tag';
  }

  primaryTagClass(note: NoteModel): string {
    // Return a class based on the tag, e.g., for styling
    const tag = this.primaryTag(note);
    if (tag === 'Work') return 'work-tag';
    if (tag === 'Personal') return 'personal-tag';
    return 'default-tag';
  }

  // Helper to derive tag class when only tags array is available (e.g., draft)
  primaryTagClassFromTags(tags?: string[]): string {
    const tag = (tags && tags.length > 0) ? tags[0] : 'No Tag';
    if (tag === 'Work') return 'work-tag';
    if (tag === 'Personal') return 'personal-tag';
    return 'default-tag';
  }

  goToNewNote() {
    this.router.navigate(['/authed/notes/new']);
  }
}
