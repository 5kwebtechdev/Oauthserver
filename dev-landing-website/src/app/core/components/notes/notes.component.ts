import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotesService, NoteModel } from '../../services/notes.service';

@Component({
    selector: 'app-notes',
    standalone: true,
    template: `<p>Notes placeholder</p>`
})
export class NotesComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    notes: NoteModel[] = [];
    loading = false;
    loadError: string | null = null;

    constructor(private notesService: NotesService) { }

    ngOnInit(): void {
        this.notesService.initFromSession();
        this.notesService.notes$.pipe(takeUntil(this.destroy$)).subscribe(list => {
            this.notes = list;
        });
        this.notesService.loading$.pipe(takeUntil(this.destroy$)).subscribe(l => this.loading = l);
        this.notesService.error$.pipe(takeUntil(this.destroy$)).subscribe(e => this.loadError = e);
        if (!this.notes || this.notes.length === 0) {
            this.loadFromServer();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadFromServer() {
        this.loading = true;
        this.loadError = null;
        this.notesService.fetchAll().subscribe({
            next: () => this.loading = false,
            error: (err) => { this.loadError = err?.message || 'Failed to load notes'; this.loading = false; }
        });
    }
}
