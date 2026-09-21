import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ViewWillEnter } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { NotesService, NoteModel } from './notes.service';
import { NotesSaveComponent } from './notes-save/notes-save.component';
import { AuthService } from '../../services/auth.service';
import { RefreshService } from '../../services/refresh.service';

@Component({
  selector: 'notes',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, SupermeButtonComponent, SupermeNavigatorComponent],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})
export class NotesComponent implements OnInit, OnDestroy, ViewWillEnter {
  // pages: 'empty' (default), 'home', 'input', 'save'
  public page: 'empty' | 'home' | 'input' | 'save' = 'empty';
  public noteText: string = '';
  public noteTitle: string = '';
  public showTagInput: boolean = false;
  public newTagName: string = '';
  public tags: { key: any; value: string }[] = [];
  public titleCollapsed: boolean = false;
  public notes: NoteModel[] = [];
  public drafts: Array<{ id: number; title: string; text: string; tags?: string[]; tagId?: any }> = [];
  // tag action UI
  public activeTagIndex: number | null = null;
  public editIndex: number | null = null;
  public editName: string = '';

  // ── Swipe-to-delete state ──────────────────────────────────────────────────
  public swipedNoteId: any = null;
  public removingIds = new Set<any>();
  private swipeTouchStartX = 0;
  private swipeTouchStartY = 0;
  private swipeIsH = false;
  private readonly SWIPE_REVEAL_PX = 80;

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
    private notesService: NotesService,
    private authService: AuthService,
    private refreshService: RefreshService,
    private ngZone: NgZone
  ) {
    // restore session cache if present; otherwise fetch from server once
    this.notesService.initFromSession();
    this.notes = this.notesService.getAll();
    // load drafts array from sessionStorage if present
    try {
      const raw = sessionStorage.getItem('notes-drafts');
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        this.drafts = Array.isArray(parsed) ? parsed.map(d => ({ id: d.id || Date.now(), title: d.title || '', text: d.text || '', tags: Array.isArray(d.tags) ? d.tags : [], tagId: d.tagId })) : [];
      }
    } catch (e) {
      // ignore storage errors
    }
    // subscribe to updates so the list refreshes when new notes are added
    this.notesService.sessionReset$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.notes = [];
      this.drafts = [];
      this.noteText = '';
      this.noteTitle = '';
      this.tags = [];
      this.newTagName = '';
      this.swipedNoteId = null;
      this.removingIds.clear();
      this.loadError = null;
      this.loading = false;
    });
    this.notesService.notes$.pipe(takeUntilDestroyed()).subscribe((list) => {
      this.notes = list;
    });
    // refresh drafts when navigation returns to this page
    this.router.events.pipe(takeUntilDestroyed()).subscribe(() => {
      try {
        const raw = sessionStorage.getItem('notes-drafts');
        if (raw) {
          const parsed = JSON.parse(raw) as any[];
          this.drafts = Array.isArray(parsed) ? parsed.map(d => ({ id: d.id || Date.now(), title: d.title || '', text: d.text || '', tags: Array.isArray(d.tags) ? d.tags : [], tagId: d.tagId })) : [];
        } else {
          this.drafts = [];
        }
      } catch (e) { /* ignore */ }
    });
    // only fetch from server if we don't have any cached notes
    if (!this.notes || this.notes.length === 0) {
      this.loadFromServer();
    } else {
      // cached data is available; no initial fetch needed
      this.loading = false;
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
          tags: note.tags,
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

  openDraft(draftId: number) {
    try {
      sessionStorage.setItem('notes-draft-id', String(draftId));
    } catch (e) { /* ignore */ }
    this.router.navigate(['/authed/notes/new']);
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
  public loading: boolean = true;
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

  ngOnInit(): void {
    this.refreshService.registerRefreshHandler('Notes', () => this.onGlobalRefresh());
  }

  ionViewWillEnter(): void {
    this.loadFromServerAsync();
  }

  ngOnDestroy(): void {
    this.refreshService.unregisterRefreshHandler('Notes');
  }

  /**
   * Called by the global RefreshService when the user pulls to refresh.
   * Session validation is already handled by the authenticated shell.
   */
  private async onGlobalRefresh(): Promise<void> {
    console.log('[Notes] Global refresh triggered');
    await this.loadFromServerAsync();
  }

  /**
   * Async wrapper for loading notes from server
   */
  private loadFromServerAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loading = true;
      this.loadError = null;
      this.notesService.fetchAll().subscribe({
        next: (list) => {
          this.notes = list || [];
          this.applySort();
          this.loading = false;
          resolve();
        },
        error: (err) => {
          console.error('Failed to load notes', err);
          this.loadError = 'Failed to load notes';
          this.loading = false;
          reject(err);
        }
      });
    });
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
        this.router.navigate(['/home']);
      }
    }).catch(() => {
      this.router.navigate(['/home']);
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
    // Clear stored draft only if it matches the content we just saved.
    try {
      let removed = false;
      // If a specific draft-id was selected, remove that draft
      const did = sessionStorage.getItem('notes-draft-id');
      const arrRaw = sessionStorage.getItem('notes-drafts');
      const arr = arrRaw ? (JSON.parse(arrRaw) as any[]) : [];
      if (did) {
        const id = Number(did);
        const idx = arr.findIndex(a => Number(a.id) === id);
        if (idx > -1) {
          arr.splice(idx, 1);
          this.drafts = arr;
          try { sessionStorage.removeItem('notes-draft-id'); } catch (e) { /* ignore */ }
          try { sessionStorage.setItem('notes-drafts', JSON.stringify(arr)); } catch (e) { /* ignore */ }
          removed = true;
        }
      } else if (arr && arr.length) {
        const idx = arr.findIndex(a => {
          const sameTitle = String((a.title || '')).trim() === String(title).trim();
          const sameText = String((a.text || '')).trim() === String(text).trim();
          const aTags = Array.isArray(a.tags) ? a.tags : [];
          const sameTags = Array.isArray(note.tags) && aTags.length === note.tags.length && aTags.every((t: any, i: number) => String(t) === String(note.tags[i]));
          return sameTitle && sameText && sameTags;
        });
        if (idx > -1) {
          arr.splice(idx, 1);
          this.drafts = arr;
          try { sessionStorage.setItem('notes-drafts', JSON.stringify(arr)); } catch (e) { /* ignore */ }
          removed = true;
        }
      }
      // if nothing matched, keep drafts as-is
    } catch (e) { /* ignore */ }
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

  // Handlers for SupermeTagsComponent events
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

  // Provide options in the { key, value } shape expected by SupermeTagsComponent
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
    // When user explicitly clicks the "Add New" action, open a fresh
    // new-note view. We pass a query param so the new-note component
    // will ignore any stored draft but we do NOT delete the draft from
    // sessionStorage so it remains available if the user returns later.
    try { sessionStorage.removeItem('notes-edit'); } catch (e) { /* ignore */ }
    this.router.navigate(['/authed/notes/new'], { queryParams: { fresh: '1' } });
  }


  // ── Swipe gesture handlers ────────────────────────────────────────────────

  onSwipeStart(event: TouchEvent, note: NoteModel): void {
    this.swipeTouchStartX = event.touches[0].clientX;
    this.swipeTouchStartY = event.touches[0].clientY;
    this.swipeIsH = false;
  }

  onSwipeMove(event: TouchEvent, note: NoteModel): void {
    const dx = event.touches[0].clientX - this.swipeTouchStartX;
    const dy = Math.abs(event.touches[0].clientY - this.swipeTouchStartY);

    if (!this.swipeIsH) {
      if (Math.abs(dx) < 6) return;
      if (dy > Math.abs(dx) * 0.9) return; // more vertical — let scroll happen
      this.swipeIsH = true;
      if (this.swipedNoteId !== null && this.swipedNoteId !== note.id) {
        this.closeSwipeById(this.swipedNoteId);
      }
    }

    // Right-to-left swipe: negative dx reveals delete on the right
    const id = note.id;
    const base = this.swipedNoteId === id ? this.SWIPE_REVEAL_PX : 0;
    const clamped = Math.min(this.SWIPE_REVEAL_PX, Math.max(0, base - dx));

    this.ngZone.runOutsideAngular(() => {
      const el = this.getSwipeCardEl(id);
      if (el) { el.style.transition = 'none'; el.style.transform = `translateX(-${clamped}px)`; }
    });
  }

  onSwipeEnd(event: TouchEvent, note: NoteModel): void {
    if (!this.swipeIsH) return;

    const dx = event.changedTouches[0].clientX - this.swipeTouchStartX;
    const id = note.id;
    const wasOpen = this.swipedNoteId === id;
    const finalOffset = (wasOpen ? this.SWIPE_REVEAL_PX : 0) - dx;
    // snap open when swiped far enough to the left
    const snapOpen = finalOffset > (wasOpen ? 20 : 40);

    const el = this.getSwipeCardEl(id);
    if (el) el.style.transition = 'transform 0.25s ease-out';

    if (snapOpen) {
      this.swipedNoteId = id;
      if (el) el.style.transform = `translateX(-${this.SWIPE_REVEAL_PX}px)`;
    } else {
      this.swipedNoteId = null;
      if (el) el.style.transform = 'translateX(0)';
    }

    this.swipeIsH = false;
  }

  private closeSwipeById(id: any): void {
    if (!id || this.removingIds.has(id)) return;
    const el = this.getSwipeCardEl(id);
    if (el) { el.style.transition = 'transform 0.25s ease-out'; el.style.transform = 'translateX(0)'; }
    this.swipedNoteId = null;
  }

  private getSwipeCardEl(id: any): HTMLElement | null {
    return document.querySelector(`[data-swipe-id="${id}"]`) as HTMLElement | null;
  }

  onNoteCardClick(note: NoteModel, event?: Event): void {
    if (this.swipedNoteId !== null) {
      this.closeSwipeById(this.swipedNoteId);
      return;
    }
    this.openNote(note);
  }

  deleteNoteItem(note: NoteModel, event: Event): void {
    event.stopPropagation();
    const id = note.id;
    if (!id || this.removingIds.has(id)) return;

    this.removingIds.add(id);
    this.swipedNoteId = null;

    // Reset card transform — collapse animation handles visual removal
    const el = this.getSwipeCardEl(id);
    if (el) { el.style.transition = 'transform 0.2s ease-out'; el.style.transform = 'translateX(0)'; }

    // After collapse animation, call the service (which removes from the list)
    setTimeout(() => {
      this.ngZone.run(() => {
        this.notesService.deleteNote(id).subscribe({
          next: () => { this.removingIds.delete(id); },
          error: () => { this.removingIds.delete(id); }
        });
      });
    }, 360);
  }

  isNoteRemoving(note: NoteModel): boolean {
    return this.removingIds.has(note.id);
  }

  /**
   * Navigate to the new-note screen in edit mode for the given note.
   * Store the note temporarily in sessionStorage so `NotesNewComponent` can prefill.
   */
  editNote(note: any) {
    try {
      sessionStorage.setItem('notes-edit', JSON.stringify(note || {}));
    } catch (e) { /* ignore storage errors */ }
    this.router.navigate(['/authed/notes/new']);
  }
}
