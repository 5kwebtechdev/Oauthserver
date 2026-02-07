import { Injectable, OnDestroy } from '@angular/core';
import { HabitApi } from '../../api/habit.api';
import { TaskApi } from '../../api/task.api';
import { HabitService } from './habit.service';

interface AutoAbortEntry {
  id: string;
  type: 'habits' | 'tasks';
  endTimeStamp: number;
  abortAt: number;
}

@Injectable({ providedIn: 'root' })
export class AutoAbortService implements OnDestroy {
  private readonly FIVE_MINUTES = 5 * 60 * 1000;
  private readonly STORAGE_KEY = 'auto_abort_schedule';
  private timers = new Map<string, any>();

  constructor(
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private habitService: HabitService
  ) {
    this.restoreScheduledAborts();
  }

  scheduleAutoAbort(item: { id: string; type: string; endTimeStamp: number }): void {
    if (!item?.id || !item.endTimeStamp) return;

    const type = (item.type === 'tasks' ? 'tasks' : 'habits') as 'habits' | 'tasks';
    const abortAt = item.endTimeStamp + this.FIVE_MINUTES;

    this.cancelAutoAbort(item.id, type);

    const entry: AutoAbortEntry = {
      id: item.id,
      type,
      endTimeStamp: item.endTimeStamp,
      abortAt
    };

    this.saveEntry(entry);
    this.setTimer(entry);
  }

  cancelAutoAbort(id: string, type?: string): void {
    const types = type ? [type] : ['habits', 'tasks'];

    for (const t of types) {
      const entryKey = `${t}_${id}`;

      if (this.timers.has(entryKey)) {
        clearTimeout(this.timers.get(entryKey));
        this.timers.delete(entryKey);
      }

      this.removeEntry(entryKey);
    }
  }

  hasScheduled(id: string, type?: string): boolean {
    const types = type ? [type] : ['habits', 'tasks'];
    return types.some(t => this.timers.has(`${t}_${id}`));
  }

  private setTimer(entry: AutoAbortEntry): void {
    const entryKey = `${entry.type}_${entry.id}`;
    const now = Date.now();
    const delay = entry.abortAt - now;

    if (delay <= 0) {
      this.executeAbort(entry);
      return;
    }

    const timerId = setTimeout(() => {
      this.executeAbort(entry);
    }, delay);

    this.timers.set(entryKey, timerId);
  }

  private executeAbort(entry: AutoAbortEntry): void {
    const entryKey = `${entry.type}_${entry.id}`;

    const cleanup = () => {
      this.removeEntry(entryKey);
      this.timers.delete(entryKey);
    };

    if (entry.type === 'tasks') {
      this.taskApi.abortTask(entry.id).subscribe({
        next: () => {
          cleanup();
          this.habitService.notifyTaskUpdated();
        },
        error: () => {
          cleanup();
        }
      });
    } else {
      this.habitApi.abortHabit(entry.id).subscribe({
        next: () => {
          this.habitService.abortHabit(entry.id);
          cleanup();
        },
        error: () => {
          cleanup();
        }
      });
    }
  }

  private restoreScheduledAborts(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const entries: AutoAbortEntry[] = JSON.parse(stored);
      if (!Array.isArray(entries)) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      const validEntries = entries.filter(e => e.endTimeStamp >= todayStartMs);

      if (validEntries.length !== entries.length) {
        if (validEntries.length > 0) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validEntries));
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }

      for (const entry of validEntries) {
        this.setTimer(entry);
      }
    } catch (e) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveEntry(entry: AutoAbortEntry): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const entries: AutoAbortEntry[] = stored ? JSON.parse(stored) : [];
      const entryKey = `${entry.type}_${entry.id}`;

      const filtered = entries.filter(e => `${e.type}_${e.id}` !== entryKey);
      filtered.push(entry);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
    }
  }

  private removeEntry(entryKey: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const entries: AutoAbortEntry[] = JSON.parse(stored);
      const filtered = entries.filter(e => `${e.type}_${e.id}` !== entryKey);

      if (filtered.length > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (e) {
    }
  }

  ngOnDestroy(): void {
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();
  }
}
