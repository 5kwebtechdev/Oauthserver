import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'notes-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes-input.component.html',
  styleUrls: ['./notes-input.component.scss']
})
export class NotesInputComponent {
  @Input() modalTitle = '';
  @Input() modalContent = '';
  @Input() modalTag = '';
  @Input() availableTags: string[] = [];
  @Input() showTagInput = false;
  @Input() newTagName = '';
  @Input() isEditing = false;
  @Input() isViewing = false;
  @Input() selectedNote: any = null;

  @Output() modalTitleChange = new EventEmitter<string>();
  @Output() modalContentChange = new EventEmitter<string>();
  @Output() modalTagChange = new EventEmitter<string>();
  @Output() showTagInputChange = new EventEmitter<boolean>();
  @Output() newTagNameChange = new EventEmitter<string>();

  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() saveNoteEvent = new EventEmitter<void>();
  @Output() deleteNoteEvent = new EventEmitter<void>();
  @Output() shareNoteEvent = new EventEmitter<void>();
  @Output() editFromViewEvent = new EventEmitter<void>();
  @Output() selectTagEvent = new EventEmitter<string>();
  @Output() openTagInputEvent = new EventEmitter<void>();
  @Output() addNewTagEvent = new EventEmitter<void>();
  @Output() deleteTagEvent = new EventEmitter<string>();
  @Output() editTagEvent = new EventEmitter<{oldTag: string, newTag: string}>();

  editingTag: string | null = null;
  editingTagValue: string = '';

  onTitleChange(value: string) {
    this.modalTitleChange.emit(value);
  }

  onContentChange(value: string) {
    this.modalContentChange.emit(value);
  }

  onTagChange(value: string) {
    this.modalTagChange.emit(value);
  }

  onCloseModal() {
    this.closeModalEvent.emit();
  }

  onSaveNote() {
    this.saveNoteEvent.emit();
  }

  onDeleteNote() {
    this.deleteNoteEvent.emit();
  }

  onShareNote() {
    this.shareNoteEvent.emit();
  }

  onEditFromView() {
    this.editFromViewEvent.emit();
  }

  onSelectTag(tag: string) {
    // selecting a tag should close any open tag editor
    this.editingTag = null;
    this.editingTagValue = '';
    this.selectTagEvent.emit(tag);
  }

  onOpenTagInput() {
    this.openTagInputEvent.emit();
  }

  onAddNewTag() {
    this.addNewTagEvent.emit();
  }

  onNewTagNameChange(value: string) {
    this.newTagNameChange.emit(value);
  }

  onDoubleClickTag(tag: string) {
    // keep for backward compatibility (not used in template)
    this.editingTag = tag;
    this.editingTagValue = tag;
  }

  

  // Close editing when clicking outside the tag controls
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!this.editingTag || !target) return;

    // If click is inside .tag-controls keep editing (clicks on other tag buttons will be handled by onClickTag)
    if (target.closest('.tag-controls')) return;

    // Otherwise cancel edit
    this.onCancelEditTag();
  }

  onEditTagChange(value: string) {
    this.editingTagValue = value;
  }

  onSaveEditTag() {
    if (this.editingTag && this.editingTagValue.trim()) {
      this.editTagEvent.emit({
        oldTag: this.editingTag,
        newTag: this.editingTagValue.trim()
      });
      this.editingTag = null;
      this.editingTagValue = '';
    }
  }

  onCancelEditTag() {
    this.editingTag = null;
    this.editingTagValue = '';
  }

  onDeleteTag(tag: string) {
    this.deleteTagEvent.emit(tag);
    this.editingTag = null;
    this.editingTagValue = '';
  }
}
