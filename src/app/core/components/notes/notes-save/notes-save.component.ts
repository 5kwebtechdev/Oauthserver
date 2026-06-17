import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, Optional } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { SupermePopupComponent } from '../../superme-popup/superme-popup.component';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { NotesApi } from '../../../api/notes.api';
import { NotesService } from '../notes.service';
import { Share } from '@capacitor/share';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-notes-save',
  standalone: true,
  imports: [CommonModule, SupermePopupComponent, SupermeNavigatorComponent, IonicModule],
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
  // legacy flag removed in favor of SupermePopup
  // showConfirmDelete: boolean = false;
  // Use SupermePopup for confirmation UI
  showSupermePopup: boolean = false;

  constructor(private sanitizer: DomSanitizer, @Optional() private notesApi?: NotesApi, private notesService?: NotesService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      const raw = this.content || '';
      console.debug('[NotesSave] incoming content length=', (raw || '').length, 'preview=', (raw || '').slice(0,200));
      // If incoming content appears to contain HTML tags, treat as HTML
      if (/<[a-z][\s\S]*>/i.test(raw)) {
        const safeHtml = this.sanitizeHtmlForRendering(raw);
        this.contentHtml = this.sanitizer.bypassSecurityTrustHtml(safeHtml);
      } else {
        this.contentHtml = this.sanitizer.bypassSecurityTrustHtml(this.renderContentAsHtml(raw));
      }
    }
  }

  /**
   * Lightweight sanitization to remove dangerous tags and attributes
   * before trusting HTML from the editor. This is intentionally
   * conservative but not a full HTML sanitizer - consider using
   * a library like DOMPurify for production hardening.
   */
  private sanitizeHtmlForRendering(raw: string): string {
    let s = raw || '';
    // remove script/style/iframe/object/embed tags and their contents
    s = s.replace(/<(script|style|iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
    // remove on* event handler attributes (onclick, onerror, etc.)
    s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // neutralize javascript: URIs in href/src
    s = s.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1=$2#$3');
    s = s.replace(/(href|src)\s*=\s*javascript:[^\s>]+/gi, '');
    // Convert newlines to <br> so they display as visible line breaks
    s = s.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>');
    return s;
  }

  /**
   * Render plain text content as HTML.
   * - Converts newlines to line breaks
   * - Recognizes bullet lists (•, -, *)
   * - Recognizes numbered lists (1., 2., etc.)
   * - Preserves emojis and special characters
   */
  private renderContentAsHtml(raw: string): string {
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      // Empty line - close any open list and add spacing
      if (trimmed === '') {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
        html += '<br>';
        continue;
      }

      // Check for bullet list item (•, -, *, ▪, ▸)
      const bulletMatch = trimmed.match(/^([•\-*▪▸])\s*(.*)/);
      if (bulletMatch) {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (!inUl) { inUl = true; html += '<ul class="note-list">'; }
        html += `<li>${this.escapeHtml(bulletMatch[2])}</li>`;
        continue;
      }

      // Check for numbered list item (1., 2., a., b., etc.)
      const numberedMatch = trimmed.match(/^(\d+|[a-zA-Z])[.)]\s*(.*)/);
      if (numberedMatch) {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (!inOl) { inOl = true; html += '<ol class="note-list">'; }
        html += `<li>${this.escapeHtml(numberedMatch[2])}</li>`;
        continue;
      }

      // Regular text line - close any open lists
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<p>${this.escapeHtml(trimmed)}</p>`;
    }

    // Close any remaining open lists
    if (inUl) html += '</ul>';
    if (inOl) html += '</ol>';
    return html;
  }

  onBack() {
    if (this.closeModalFn) {
      try { this.closeModalFn(); } catch (e) { /* ignore */ }
    } else {
      this.back.emit();
    }
  }

  onDelete() {
    // show confirmation popup (SupermePopup)
    this.showSupermePopup = true;
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

    // Try Capacitor Share first (native mobile). If it fails, silently log and do nothing.
    try {
      await Share.share({
        title: title || undefined,
        text: shareText,
        dialogTitle: title ? `Share "${title}"` : 'Share note'
      });
    } catch (e) {
      // Do not fallback to clipboard or show alerts — user requested native-only behavior.
      console.warn('Capacitor Share failed or unavailable', e);
    }
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
    this.showSupermePopup = false;
  }

  confirmDelete() {
    // hide popup first
    this.showSupermePopup = false;
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
