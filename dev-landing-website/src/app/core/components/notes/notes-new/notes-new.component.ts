import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NotesService } from '../../../services/notes.service';

@Component({
    selector: 'app-notes-new',
    standalone: true,
    template: `<p>Notes New placeholder</p>`
})
export class NotesNewComponent implements OnInit {
    title = '';
    text = '';
    selectedTag = '';
    loading = false;
    error: string | null = null;
    editing = false;
    editId: any = null;
    private currentDraftId: number | null = null;

    constructor(private notesService: NotesService, private router: Router, private route: ActivatedRoute) { }

    ngOnInit(): void {
        // load draft if provided via session
        try {
            const draftId = sessionStorage.getItem('notes-draft-id');
            if (draftId) {
                const raw = sessionStorage.getItem('notes-drafts');
                if (raw) {
                    const arr = JSON.parse(raw) as any[];
                    const found = Array.isArray(arr) ? arr.find(a => Number(a.id) === Number(draftId)) : null;
                    if (found) {
                        this.currentDraftId = Number(draftId);
                        this.title = found.title || '';
                        this.text = found.text || '';
                        this.selectedTag = (found.tags && found.tags[0]) || '';
                    }
                }
            }
        } catch (e) { /* ignore */ }

        // check for edit payload
        try {
            const rawEdit = sessionStorage.getItem('notes-edit');
            if (rawEdit) {
                const parsed = JSON.parse(rawEdit) || {};
                this.title = parsed.title || this.title || '';
                this.text = parsed.text || this.text || '';
                this.selectedTag = Array.isArray(parsed.tags) ? parsed.tags[0] || '' : this.selectedTag;
                this.editing = true;
                this.editId = parsed.id || parsed.noteId || parsed._id || null;
                try { sessionStorage.removeItem('notes-edit'); } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    get canSave(): boolean {
        const hasTitle = Boolean((this.title || '').trim());
        const hasText = Boolean((this.text || '').trim());
        const hasTag = Boolean((this.selectedTag || '').trim());
        if (this.editing) {
            return hasTitle && hasText && hasTag && !this.loading;
        }
        return hasTitle && hasText && hasTag && !this.loading;
    }

    saveDraft() {
        try {
            const hasTitle = Boolean((this.title || '').trim());
            const hasText = Boolean((this.text || '').trim());
            const hasTag = Boolean((this.selectedTag || '').trim());
            if (!hasTitle && !hasText && !hasTag) {
                if (this.currentDraftId) {
                    this.removeDraftById(this.currentDraftId);
                    this.currentDraftId = null;
                } else {
                    try { sessionStorage.removeItem('notes-draft'); } catch (e) { /* ignore */ }
                }
                return;
            }

            const tags = this.selectedTag ? [this.selectedTag] : [];
            try {
                const raw = sessionStorage.getItem('notes-drafts');
                const arr = raw ? (JSON.parse(raw) as any[]) : [];
                if (this.currentDraftId) {
                    const idx = arr.findIndex(a => Number(a.id) === Number(this.currentDraftId));
                    if (idx > -1) arr[idx] = { id: this.currentDraftId, title: this.title || '', text: this.text || '', tags };
                    else arr.push({ id: this.currentDraftId, title: this.title || '', text: this.text || '', tags });
                } else {
                    const id = Date.now();
                    arr.push({ id, title: this.title || '', text: this.text || '', tags });
                    this.currentDraftId = id;
                    try { sessionStorage.setItem('notes-draft-id', String(id)); } catch (e) { /* ignore */ }
                }
                sessionStorage.setItem('notes-drafts', JSON.stringify(arr));
            } catch (e) {
                try { sessionStorage.setItem('notes-draft', JSON.stringify({ title: this.title || '', text: this.text || '', tags })); } catch (er) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    private removeDraftById(id: number) {
        try {
            const raw = sessionStorage.getItem('notes-drafts');
            if (!raw) return false;
            const arr = JSON.parse(raw) as any[];
            const filtered = arr.filter(a => Number(a.id) !== Number(id));
            sessionStorage.setItem('notes-drafts', JSON.stringify(filtered));
            try { sessionStorage.removeItem('notes-draft-id'); } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    save() {
        if (!this.canSave) return;
        const payload = { title: this.title || 'Untitled', content: this.text || '', tags: this.selectedTag ? [this.selectedTag] : [] };
        this.loading = true;
        this.error = null;

        if (this.editing && this.editId) {
            this.notesService.updateOptimistic(this.editId, payload).subscribe({
                next: () => {
                    this.loading = false;
                    this.editing = false;
                    this.editId = null;
                    try { if (this.currentDraftId) { this.removeDraftById(this.currentDraftId); this.currentDraftId = null; } } catch (e) { }
                    this.router.navigate(['/authed/notes']);
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err?.message || 'Failed to update note';
                }
            });
        } else {
            this.notesService.addOptimistic(payload).subscribe({
                next: () => {
                    this.loading = false;
                    try { if (this.currentDraftId) { this.removeDraftById(this.currentDraftId); this.currentDraftId = null; } } catch (e) { }
                    this.router.navigate(['/authed/notes']);
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err?.message || 'Failed to save note';
                }
            });
        }
    }
}
