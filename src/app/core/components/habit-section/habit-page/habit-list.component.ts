import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Habit } from '../habit.types';
import { RouterModule } from '@angular/router';

@Component({
    standalone: true,
    selector: 'habit-list',
    templateUrl: './habit-list.component.html',
    styleUrls: ['./habit-list.component.scss'],
    imports: [CommonModule, RouterModule]
})
export class HabitListComponent {
    @Input() habits: Habit[] = [];
    @Input() emptyTitle = "Your day's a blank slate!";
    @Input() emptyDescription = "Add tasks, habits, and your timetable to earn coins and level up your day. Don't miss out!";

    @Output() open = new EventEmitter<Habit>();
    @Output() done = new EventEmitter<Habit>();

    onOpen(h: Habit) {
        this.open.emit(h);
    }

    onDone(h: Habit) {
        this.done.emit(h);
    }

    // Return a CSS width string (e.g. '45%') for the progress bar; clamps 0..100
    getProgressWidth(h: Habit): string {
        if (!h || !h.startTimeStamp || !h.endTimeStamp) return '0%';
        const start = Number(h.startTimeStamp);
        const end = Number(h.endTimeStamp);
        if (!start || !end || end <= start) return '0%';
        const now = Date.now();
        const raw = Math.floor(((now - start) / (end - start)) * 100);
        const pct = Math.max(0, Math.min(100, raw));
        return `${pct}%`;
    }

    // Habit type doesn't include streak/coins; provide safe accessors
    getStreak(h: Habit): number {
        const anyH = h as any;
        return anyH?.streak ?? 14;
    }

    getCoins(h: Habit): number {
        const anyH = h as any;
        return anyH?.coins ?? 200;
    }
}
