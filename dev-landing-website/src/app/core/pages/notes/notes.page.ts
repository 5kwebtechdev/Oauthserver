import { Component, OnInit, OnDestroy } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FooterComponent } from '../../components/footer/footer.component';
import { SupermeButtonComponent } from '../../components/superme-button/superme-button.component';
import { SupermeEmptyStateComponent } from '../../components/superme-empty-state/superme-empty-state.component';
import { NotesCardComponent } from './notes-card/notes-card.component';
import { NotesInputComponent } from './notes-input/notes-input.component';
import { NotesService, NoteModel } from '../../services/notes.service';

interface NoteDisplay {
  id: any;
  excerpt: string;
  title: string;
  date: string;
  updatedAt: string;
  tag: string;
}

type SortOption = 'date' | 'modified' | 'az' | 'za';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FooterComponent, PublicNavbarComponent, SupermeButtonComponent, SupermeEmptyStateComponent, NotesCardComponent, NotesInputComponent],
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss']
})
export class NotesPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  notes: NoteDisplay[] = [];
  filteredNotes: NoteDisplay[] = [];
  loading = false;
  loadError: string | null = null;

  sortBy: SortOption = 'date';
  sortDropdownOpen = false;
  sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date', label: 'Date Created' },
    { value: 'modified', label: 'Date Modified' },
    { value: 'az', label: 'A-Z' },
    { value: 'za', label: 'Z-A' },
  ];
  searchQuery = '';

  availableTags: string[] = ['personal', 'work', 'ideas', 'health', 'finance'];
  showTagInput = false;
  newTagName = '';

  // modal state
  showAddModal = false;
  modalTitle = '';
  modalContent = '';
  modalTag = '';
  isEditing = false;
  isViewing = false;
  editingNoteId: any = null;
  selectedNote: NoteDisplay | null = null;

  private readonly onDocClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.sort-dropdown-wrapper')) {
      this.sortDropdownOpen = false;
    }
  };

  constructor(private notesService: NotesService) { }

  ngOnInit(): void {
    // restore any session-cached notes first to provide instant UI
    this.notesService.initFromSession();

    this.notesService.notes$.pipe(takeUntil(this.destroy$)).subscribe((list) => {
      this.notes = this.mapNotesToDisplay(list);
      this.filterNotes();
    });

    this.notesService.loading$.pipe(takeUntil(this.destroy$)).subscribe((l) => (this.loading = l));
    this.notesService.error$.pipe(takeUntil(this.destroy$)).subscribe((e) => (this.loadError = e));

    this.loadFromServer();
    document.addEventListener('click', this.onDocClick);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocClick);
  }

  toggleSortDropdown(): void {
    this.sortDropdownOpen = !this.sortDropdownOpen;
  }

  get selectedSortLabel(): string {
    return this.sortOptions.find((o) => o.value === this.sortBy)?.label ?? 'Sort';
  }

  loadFromServer(): void {
    this.notesService.fetchAll().subscribe({
      next: () => this.applySort(),
      error: () => { }
    });
  }

  private mapNotesToDisplay(notes: NoteModel[]): NoteDisplay[] {
    return notes.map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      excerpt: n.text || '',
      date: this.formatDate(n.createdAt),
      updatedAt: this.formatDate(n.updatedAt || n.createdAt),
      tag: n.tags?.[0] || 'Note'
    }));
  }

  private formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  addNote(): void {
    this.modalTitle = '';
    this.modalContent = '';
    this.modalTag = 'Note';
    this.isEditing = false;
    this.editingNoteId = null;
    this.showAddModal = true;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  editNote(note: NoteDisplay): void {
    this.modalTitle = note.title;
    this.modalContent = note.excerpt;
    this.modalTag = note.tag;
    this.isEditing = true;
    this.isViewing = false;
    this.editingNoteId = note.id;
    this.selectedNote = note;
    this.showAddModal = true;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  viewNote(note: NoteDisplay): void {
    this.editNote(note);
  }

  editFromView(): void {
    if (this.selectedNote) {
      this.isViewing = false;
      this.editNote(this.selectedNote);
    }
  }

  deleteNote(): void {
    if (!this.editingNoteId) return;

    const id = this.editingNoteId;
    this.notesService.deleteNote(id).subscribe({
      next: () => this.closeModal(),
      error: () => {
        this.notes = this.notes.filter((n) => n.id !== id);
        this.filterNotes();
        this.closeModal();
      }
    });
  }

  shareNote(): void {
    if (navigator.share && this.selectedNote) {
      navigator.share({
        title: this.selectedNote.title,
        text: this.selectedNote.excerpt
      }).catch(() => { });
    } else {
      alert('Share functionality not available');
    }
  }

  removeNote(id: any): void {
    this.notesService.deleteNote(id).subscribe({
      next: () => { },
      error: () => {
        this.notes = this.notes.filter((n) => n.id !== id);
        this.filterNotes();
      }
    });
  }

  closeModal(): void {
    this.showAddModal = false;
    this.isEditing = false;
    this.isViewing = false;
    this.editingNoteId = null;
    this.selectedNote = null;
    this.modalTitle = '';
    this.modalContent = '';
    this.modalTag = '';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  setSort(key: SortOption): void {
    this.sortBy = key;
    this.sortDropdownOpen = false;
    this.applySort();
  }

  private applySort(): void {
    if (!this.filteredNotes?.length) return;
    const copy = [...this.filteredNotes];

    switch (this.sortBy) {
      case 'date':
        copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'modified':
        copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'az':
        copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'za':
        copy.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
    }
    this.filteredNotes = copy;
  }

  onSearchChange(): void {
    this.filterNotes();
  }

  filterNotes(): void {
    let filtered = [...this.notes];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.excerpt.toLowerCase().includes(query) ||
          note.tag.toLowerCase().includes(query)
      );
    }

    this.filteredNotes = filtered;
    this.applySort();
  }

  selectTag(tag: string): void {
    this.modalTag = tag;
  }

  openTagInput(): void {
    this.showTagInput = true;
    this.newTagName = '';
    setTimeout(() => {
      const input = document.querySelector('.tag-input') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  addNewTag(): void {
    const tagName = this.newTagName.trim();
    if (tagName && !this.availableTags.includes(tagName)) {
      this.availableTags.push(tagName);
    }
    if (tagName) this.modalTag = tagName;
    this.newTagName = '';
    this.showTagInput = false;
  }

  deleteTag(tag: string): void {
    this.availableTags = this.availableTags.filter((t) => t !== tag);
    if (this.modalTag === tag) this.modalTag = '';
  }

  editTag(event: { oldTag: string; newTag: string }): void {
    const index = this.availableTags.indexOf(event.oldTag);
    if (index !== -1) {
      this.availableTags[index] = event.newTag;
      if (this.modalTag === event.oldTag) this.modalTag = event.newTag;
    }
  }

  saveModalNote(): void {
    const title = this.modalTitle?.trim() || `Note ${this.notes.length + 1}`;
    const content = (this.modalContent || '').trim();
    const tag = this.modalTag || 'Note';

    if (!content) {
      this.loadError = 'Note content cannot be empty';
      return;
    }

    const payload = { title, content, tags: [tag] };

    if (this.isEditing && this.editingNoteId) {
      this.notesService.updateOptimistic(this.editingNoteId, payload).subscribe({
        next: () => this.closeModal(),
        error: (err) => {
          this.loadError = err?.message || 'Failed to update note';
          const idx = this.notes.findIndex((n) => n.id === this.editingNoteId);
          if (idx !== -1) {
            this.notes[idx] = { ...this.notes[idx], title, excerpt: content, tag };
          }
          this.filterNotes();
          this.closeModal();
        }
      });
    } else {
      this.notesService.addOptimistic(payload).subscribe({
        next: () => this.closeModal(),
        error: (err) => {
          this.loadError = err?.message || 'Failed to save note';
          // fallback: show locally so user doesn't lose content
          const id = this.notes.length ? Math.max(...this.notes.map((n) => n.id || 0)) + 1 : 1;
          const nowDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          this.notes.unshift({
            id,
            excerpt: content,
            title,
            date: nowDate,
            updatedAt: nowDate,
            tag
          });
          this.filterNotes();
          this.closeModal();
        }
      });
    }
  }
}
