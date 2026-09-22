import { Injectable } from '@angular/core';

/**
 * Shared service for habit/task button logic and timestamp utilities.
 * Used across activity-card, activity-detail, activity-calendar, and activity-page-content components.
 */
@Injectable({ providedIn: 'root' })
export class HabitButtonLogicService {
  private static readonly LETS_GO_WINDOW_MS = 5 * 60 * 1000;
  /**
   * Combine date string (YYYY-MM-DD) with time string (HH:MM:SS or HH:MM) to create timestamp
   */
  combineDateAndTime(dateStr: string, timeStr: string): number {
    if (!dateStr || !timeStr) return 0;
    const normalizedDate = dateStr.split('T')[0];
    const dateParts = normalizedDate.split('-').map(Number);
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;
    if (dateParts.length !== 3 || dateParts.some(part => !Number.isFinite(part))) return 0;

    // Construct in local time. Parsing YYYY-MM-DD directly uses UTC and can
    // shift an activity onto the wrong local day in some time zones.
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, seconds, 0).getTime();
  }

  /**
   * Calculate timestamps for an item (habit/task) from its date and time fields
   */
  calculateTimestamps(item: any): { startTimeStamp: number; endTimeStamp: number } {
    const startTimeStr = item.startTime || item.start_time || '00:00:00';
    const endTimeStr = item.endTime || item.end_time || '23:59:59';
    const today = new Date().toISOString().split('T')[0];
    const startDateStr = item.startDate ? (typeof item.startDate === 'string' ? item.startDate.split('T')[0] : new Date(item.startDate).toISOString().split('T')[0]) : today;
    const endDateStr = item.endDate ? (typeof item.endDate === 'string' ? item.endDate.split('T')[0] : new Date(item.endDate).toISOString().split('T')[0]) : startDateStr;

    return {
      startTimeStamp: (item.startTime && item.startDate) ? this.combineDateAndTime(startDateStr, startTimeStr) : (item.startTimeStamp || this.combineDateAndTime(startDateStr, startTimeStr)),
      endTimeStamp: (item.endTime && item.endDate) ? this.combineDateAndTime(endDateStr, endTimeStr) : (item.endTimeStamp || this.combineDateAndTime(endDateStr, endTimeStr))
    };
  }

  /** Check whether the current time is in the five-minute start window. */
  isWithinLetsGoWindow(startTimeStamp: number): boolean {
    if (!startTimeStamp) return false;
    const now = Date.now();
    return now >= startTimeStamp - HabitButtonLogicService.LETS_GO_WINDOW_MS
      && now <= startTimeStamp + HabitButtonLogicService.LETS_GO_WINDOW_MS;
  }

  /**
   * Check if current time is before start time
   */
  isBeforeStartTime(startTimeStamp: number): boolean {
    if (!startTimeStamp) return false;
    return Date.now() < startTimeStamp;
  }

  /**
   * Check if current time is after end time
   */
  isAfterEndTime(endTimeStamp: number): boolean {
    if (!endTimeStamp) return false;
    return Date.now() > endTimeStamp;
  }

  /**
   * Enable "Let's Go" only from five minutes before through five minutes
   * after the scheduled start time.
   */
  isLetsGoEnabled(habit: any, hasOtherOngoing: boolean = false): boolean {
    if (hasOtherOngoing) return false;
    const { startTimeStamp } = this.getTimestamps(habit);
    if (!startTimeStamp) return false;
    if (!this.isToday(startTimeStamp)) return false;
    return this.isWithinLetsGoWindow(startTimeStamp);
  }

  /**
   * Show "Let's Go" only during the five-minute start window.
   */
  isLetsGoVisible(habit: any): boolean {
    if (!habit) return false;
    const status = habit.status?.toLowerCase();
    if (status === 'ongoing' || status === 'completed' || status === 'skipped') return false;
    const { startTimeStamp } = this.getTimestamps(habit);
    if (!startTimeStamp) return false;
    if (!this.isToday(startTimeStamp)) return false;
    return this.isWithinLetsGoWindow(startTimeStamp);
  }

  /**
   * Check if "Abort" button should be visible
   */
  isAbortVisible(habit: any): boolean {
    if (!habit) return false;
    const { startTimeStamp } = this.getTimestamps(habit);
    // Only allow abort for ongoing activities happening today
    return habit.status?.toLowerCase() === 'ongoing' && this.isToday(startTimeStamp);
  }

  /**
   * Check if "Done" button should be enabled
   */
  isDoneEnabled(habit: any, hasOtherOngoing: boolean = false): boolean {
    if (!habit) return false;
    // Server marked this occurrence's window as expired; it can no longer be completed.
    if (habit.expired) return false;
    if (hasOtherOngoing) return false;
    const status = habit.status?.toLowerCase();
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    // No Done action for past/future dates
    if (!this.isToday(startTimeStamp)) return false;

    // For skipped status, always enable
    if (status === 'skipped') return true;

    // If ongoing, enable (but caller must ensure `hasOtherOngoing` is false)
    if (status === 'ongoing') return true;

    // For pending: Let’s Go has priority around start time. Once that
    // five-minute grace window closes, Done becomes the available action.
    if (status === 'pending') {
      if (!startTimeStamp) return false;
      return Date.now() > startTimeStamp + HabitButtonLogicService.LETS_GO_WINDOW_MS;
    }

    return false;
  }

  /**
   * Check if "Done" button should be visible (shows/hides button)
   * For today's items: always show (but it will be disabled until Let's Go window closes)
   */
  isDoneVisible(habit: any): boolean {
    if (!habit) return false;
    // Server marked this occurrence's window as expired; hide Done rather than showing it disabled.
    if (habit.expired) return false;
    const status = habit.status?.toLowerCase();
    // Terminal items cannot be completed again.
    if (status === 'completed' || status === 'skipped') return false;
    // For all statuses, only show Done when the activity is scheduled for today
    const { startTimeStamp } = this.getTimestamps(habit);
    if (!startTimeStamp) return false;
    return this.isToday(startTimeStamp);
  }

  /**
   * Check whether a timestamp falls on today's date (local timezone)
   */
  private isToday(timestamp: number): boolean {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  /**
   * Calculate progress percentage based on current time
   */
  calculateProgressPercentage(habit: any): number {
    if (!habit) return 0;
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    if (!startTimeStamp || !endTimeStamp) return 0;

    const now = Date.now();
    if (now < startTimeStamp) return 0;
    if (now > endTimeStamp) return 100;

    const totalTime = endTimeStamp - startTimeStamp;
    const elapsedTime = now - startTimeStamp;
    return Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100));
  }

  /**
   * Get timestamps from habit, calculating if needed
   */
  private getTimestamps(habit: any): { startTimeStamp: number; endTimeStamp: number } {
    if (!habit) return { startTimeStamp: 0, endTimeStamp: 0 };
    
    // Prefer API date/time fields so stale cached timestamps cannot enable a
    // button before the current schedule starts.
    return this.calculateTimestamps(habit);
  }

  /**
   * Normalize status to lowercase standard values
   */
  normalizeStatus(status: any): 'pending' | 'ongoing' | 'completed' | 'skipped' {
    if (!status) return 'pending';
    const s = status.toString().trim().toLowerCase();
    if (s === 'complete' || s === 'completed') return 'completed';
    if (s === 'ongoing' || s === 'inprogress' || s === 'in-progress' || s === 'in progress') return 'ongoing';
    if (s === 'skipped' || s === 'skip') return 'skipped';
    return 'pending';
  }

  /**
   * Format time string (HH:MM:SS) to display format (HH:MM)
   */
  formatTimeString(timeStr?: string | null): string {
    if (!timeStr) return '';
    const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : timeStr.slice(0, 5);
  }

  /**
   * Format timestamp to time display (HH:MM)
   */
  formatTimestamp(timestamp: number): string {
    if (!timestamp) return '00:00';
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Save ongoing state to localStorage
   */
  saveOngoingState(habit: any): void {
    if (!habit) return;
    const key = `ongoing_${habit.type || 'habits'}_${habit.id}`;
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    localStorage.setItem(key, JSON.stringify({
      startedAt: Date.now(),
      habitStartTime: startTimeStamp,
      habitEndTime: endTimeStamp
    }));
  }

  /**
   * Clear ongoing state from localStorage
   */
  clearOngoingState(habit: any): void {
    if (!habit) return;
    localStorage.removeItem(`ongoing_${habit.type || 'habits'}_${habit.id}`);
  }

  /**
   * Check if stored ongoing state is valid
   */
  isOngoingStateValid(habit: any): boolean {
    if (!habit) return false;
    const key = `ongoing_${habit.type || 'habits'}_${habit.id}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    try {
      const state = JSON.parse(stored);
      const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
      return state.habitStartTime === startTimeStamp && state.habitEndTime === endTimeStamp;
    } catch {
      return false;
    }
  }
}
