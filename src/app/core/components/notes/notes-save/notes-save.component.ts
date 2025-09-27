import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, Optional } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
import { NotesApi } from '../../../api/notes.api';

@Component({
  selector: 'app-notes-save',
  standalone: true,
  imports: [CommonModule, MindfulPopupComponent],
  templateUrl: './notes-save.component.html',
  styleUrls: ['./notes-save.component.scss']
})
export class NotesSaveComponent implements OnChanges {
  // Display inputs
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() showDelete: boolean = true;
  @Input() showShare: boolean = true;

  // Actions
  @Output() back = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  // When opened inside an Ionic modal we may receive a close callback
  @Input() closeModalFn?: () => void;
  // optional id of the note (if opened from list/modal)
  @Input() noteId?: any;

  contentHtml: SafeHtml = '' as any;
  // legacy flag removed in favor of MindfulPopup
  // showConfirmDelete: boolean = false;
  // Use MindfulPopup for confirmation UI
  showMindfulPopup: boolean = false;

  constructor(private sanitizer: DomSanitizer, @Optional() private notesApi?: NotesApi) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.contentHtml = this.sanitizer.bypassSecurityTrustHtml(this.renderContentAsHtml(this.content || ''));
    }
  }

  onBack() {
    if (this.closeModalFn) {
      try { this.closeModalFn(); } catch (e) { /* ignore */ }
    } else {
      this.back.emit();
    }
  }

  onDelete() {
    // show confirmation popup (MindfulPopup)
    this.showMindfulPopup = true;
  }

  onShare() {
    this.share.emit();
  }

  private renderContentAsHtml(raw: string): string {
    // Convert plaintext note content into simple HTML.
    // Recognize lines starting with a bullet (• or -) and group into a list.
    const lines = raw.replace(/\r/g, '').split('\n');
    let html = '';
    let inList = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += '<p></p>';
        continue;
      }

      const isBullet = /^[•\-*]/.test(trimmed);
      if (isBullet) {
        const item = trimmed.replace(/^[•\-*]\s*/, '');
        if (!inList) {
          inList = true;
          html += '<ul class="note-list">';
        }
        html += `<li>${this.escapeHtml(item)}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p>${this.escapeHtml(trimmed)}</p>`;
      }
    }

    if (inList) html += '</ul>';
    return html;
  }

  private escapeHtml(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Confirmation dialog handlers
  confirmCancel() {
    this.showMindfulPopup = false;
  }

  confirmDelete() {
    // hide popup first
    this.showMindfulPopup = false;
    // If we have a noteId and NotesApi available, call backend delete first
    const id = this.noteId;
    if (id && this.notesApi?.deleteNote) {
      this.notesApi.deleteNote(id).subscribe({
        next: () => {
          if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
          this.delete.emit();
        },
        error: (err: any) => {
          // still emit delete so UI can update; optionally surface error in UI
          console.error('Failed to delete note via API', err);
          if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
          this.delete.emit();
        }
      });
    } else {
      // fallback: just emit delete so caller can remove locally
      if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
      this.delete.emit();
    }
  }
}
