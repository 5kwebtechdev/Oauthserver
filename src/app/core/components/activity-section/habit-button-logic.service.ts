import { Injectable } from '@angular/core';

/**
 * Shared service for habit/task button logic and timestamp utilities.
 * Used across activity-card, activity-detail, activity-calendar, and activity-page-content components.
 */
@Injectable({ providedIn: 'root' })
export class HabitButtonLogicService {
  private readonly FIVE_MINUTES = 5 * 60 * 1000;

  /**
   * Combine date string (YYYY-MM-DD) with time string (HH:MM:SS or HH:MM) to create timestamp
   */
  combineDateAndTime(dateStr: string, timeStr: string): number {
    if (!dateStr || !timeStr) return 0;
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;

    const date = new Date(dateStr);
    date.setHours(hours, minutes, seconds, 0);
    return date.getTime();
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

  /**
   * Check if within "Let's Go" window (5 minutes before start to 5 minutes after start)
   */
  isWithinLetsGoWindow(startTimeStamp: number, endTimeStamp: number): boolean {
    if (!startTimeStamp || !endTimeStamp) return false;
    const now = Date.now();
    // Window: [start - 5min, start + 5min]
    return (now >= (startTimeStamp - this.FIVE_MINUTES)) && (now <= (startTimeStamp + this.FIVE_MINUTES));
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
   * Check if "Let's Go" button should be enabled.
   * Enabled once the activity start time has been reached and until the end time.
   */
  isLetsGoEnabled(habit: any, hasOtherOngoing: boolean = false): boolean {
    if (hasOtherOngoing) return false;
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    if (!startTimeStamp || !endTimeStamp) return false;
    if (!this.isToday(startTimeStamp)) return false;
    const now = Date.now();
    return now >= startTimeStamp && now <= endTimeStamp;
  }

  /**
   * Check if "Let's Go" button should be visible
   */
  isLetsGoVisible(habit: any): boolean {
    if (!habit) return false;
    const status = habit.status?.toLowerCase();
    // Not visible for ongoing/completed/skipped, and not visible after activity end
    if (status === 'ongoing' || status === 'completed' || status === 'skipped') return false;
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    // Only show Let's Go for items scheduled for today
    if (!this.isToday(startTimeStamp)) return false;
    if (endTimeStamp && Date.now() > endTimeStamp) return false;
    return true;
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
    if (hasOtherOngoing) return false;
    const status = habit.status?.toLowerCase();
    const { startTimeStamp } = this.getTimestamps(habit);
    // No Done action for past/future dates
    if (!this.isToday(startTimeStamp)) return false;

    // For skipped status, always enable
    if (status === 'skipped') return true;

    // If ongoing, enable (but caller must ensure `hasOtherOngoing` is false)
    if (status === 'ongoing') return true;

    // For pending: enable Done once start time has been reached
    if (status === 'pending') {
      if (!startTimeStamp) return false;
      if (!this.isToday(startTimeStamp)) return false;
      return Date.now() >= startTimeStamp;
    }

    return false;
  }

  /**
   * Check if "Done" button should be visible (shows/hides button)
   * For today's items: always show (but it will be disabled until Let's Go window closes)
   */
  isDoneVisible(habit: any): boolean {
    if (!habit) return false;
    const status = habit.status?.toLowerCase();
    // Completed items should not show Done
    if (status === 'completed') return false;
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
    
    // Use existing timestamps if valid
    if (habit.startTimeStamp && habit.endTimeStamp) {
      return { startTimeStamp: habit.startTimeStamp, endTimeStamp: habit.endTimeStamp };
    }
    
    // Calculate from date + time
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
