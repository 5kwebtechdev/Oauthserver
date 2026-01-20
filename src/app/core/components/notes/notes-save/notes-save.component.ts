import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, Optional } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { NotesApi } from '../../../api/notes.api';
import { NotesService } from '../notes.service';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-notes-save',
  standalone: true,
  imports: [CommonModule, MindfulPopupComponent, MindfulNavigatorComponent, IonicModule],
  templateUrl: './notes-save.component.html',
  styleUrls: ['./notes-save.component.scss']
})
export class NotesSaveComponent implements OnChanges {
  // Display inputs
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() showDelete: boolean = true;
  @Input() showShare: boolean = true;
  // Optional tags associated with the note. Can be a single string or an array of strings.
  @Input() tags: string | string[] | undefined;

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

  constructor(private sanitizer: DomSanitizer, @Optional() private notesApi?: NotesApi, private notesService?: NotesService) { }

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

  async onShare() {
    // Emit event for parent listeners
    this.share.emit();

    // Build a clean, plain-text share message in a friendly format:
    // Title
    // Tag: tag1, tag2
    //
    // Note text
    const title = (this.title || '').trim();
    const content = (this.content || '').trim();
    let tagsText = '';
    if (this.tags) {
      if (Array.isArray(this.tags)) tagsText = this.tags.filter(t => !!t).join(', ');
      else tagsText = String(this.tags).trim();
    }

    let parts: string[] = [];
    if (title) parts.push(title);
    if (tagsText) parts.push(`Tag: ${tagsText}`);
    if (content) parts.push(content);

    const shareText = parts.join('\n\n') || ' '; // share API expects non-empty text on some platforms

    // Try Capacitor Share first (native mobile). Fallback to Web Share API, then clipboard.
    try {
      await Share.share({
        title: title || undefined,
        text: shareText,
        dialogTitle: title ? `Share "${title}"` : 'Share note'
      });
      return;
    } catch (e) {
      // If native Share isn't available or failed, fall through to web fallback
      console.warn('Capacitor Share failed or unavailable', e);
    }

    // Web Share API fallback
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: title || undefined,
          text: shareText
        });
        return;
      }
    } catch (e) {
      console.warn('Navigator.share failed', e);
    }

    // Last-resort: copy to clipboard and notify user that text was copied.
    try {
      await Clipboard.write({ string: shareText });
      // Use a simple alert as we don't want to add new UI dependencies here.
      alert('Note text copied to clipboard. You can paste it into any app.');
    } catch (e) {
      console.error('Failed to copy note to clipboard for sharing', e);
      alert('Unable to open share options on this device.');
    }
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
    const id = this.noteId;
    // Prefer NotesService (handles local cache + optimistic delete). Fallback to NotesApi if service isn't available.
    if (id && this.notesService && this.notesService.deleteNote) {
      this.notesService.deleteNote(id).subscribe({
        next: () => {
          if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
          this.delete.emit();
        },
        error: (err: any) => {
          // still emit delete so UI can update; service already reverted if needed
          console.error('Failed to delete note via API', err);
          if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
          this.delete.emit();
        }
      });
    } else if (id && this.notesApi?.deleteNote) {
      this.notesApi.deleteNote(id).subscribe({
        next: () => {
          if (this.closeModalFn) { try { this.closeModalFn(); } catch (e) { /* ignore */ } }
          this.delete.emit();
        },
        error: (err: any) => {
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

  onNavigatorAction(event: { index: number, action: any }) {
    // index 0 = delete, index 1 = share
    if (event.index === 0) {
      this.onDelete();
    } else if (event.index === 1) {
      this.onShare();
    }
  }
}
