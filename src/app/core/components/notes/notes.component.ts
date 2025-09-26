import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { MindfulBadgeComponent } from '../mindful-badge/mindful-badge.component';
import { MindfulTagsComponent } from '../mindful-selectors/mindful-tags/mindful-tags.component';
import { MindfulCardHeaderComponent } from '../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { NotesService, NoteModel } from './notes.service';

@Component({
  selector: 'notes',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, RouterModule, MindfulButtonComponent, MindfulBadgeComponent, MindfulTagsComponent, MindfulCardHeaderComponent],
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
  // tag action UI
  public activeTagIndex: number | null = null;
  public editIndex: number | null = null;
  public editName: string = '';

  constructor(private modalCtrl: ModalController, private router: Router, private notesService: NotesService) {
    this.notes = this.notesService.getAll();
    // subscribe to updates so the list refreshes when new notes are added
    this.notesService.notes$.subscribe((list) => {
      this.notes = list;
    });
  }

  close() {
    this.modalCtrl.dismiss();
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

  goToNewNote() {
    this.router.navigate(['/authed/notes/new']);
  }
}
