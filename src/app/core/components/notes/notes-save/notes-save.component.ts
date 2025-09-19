import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-notes-save',
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

  contentHtml: SafeHtml = '' as any;
  showConfirmDelete: boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.contentHtml = this.sanitizer.bypassSecurityTrustHtml(this.renderContentAsHtml(this.content || ''));
    }
  }

  onBack() {
    this.back.emit();
  }

  onDelete() {
    // open confirmation by default
    this.showConfirmDelete = true;
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
    this.showConfirmDelete = false;
  }

  confirmDelete() {
    this.showConfirmDelete = false;
    this.delete.emit();
  }
}
