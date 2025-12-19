import { Injectable } from '@angular/core';

/**
 * Shared service for habit/task button logic and timestamp utilities.
 * Used across habit-card, habit-detail, calendar-main, and habit-page-content components.
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
   * Check if within "Let's Go" window (5 min before start to end time)
   */
  isWithinLetsGoWindow(startTimeStamp: number, endTimeStamp: number): boolean {
    if (!startTimeStamp || !endTimeStamp) return false;
    const now = Date.now();
    return (now >= (startTimeStamp - this.FIVE_MINUTES)) && (now <= endTimeStamp);
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
   * Check if "Let's Go" button should be enabled
   */
  isLetsGoEnabled(habit: any, hasOtherOngoing: boolean = false): boolean {
    if (hasOtherOngoing) return false;
    const { startTimeStamp, endTimeStamp } = this.getTimestamps(habit);
    return this.isWithinLetsGoWindow(startTimeStamp, endTimeStamp);
  }

  /**
   * Check if "Let's Go" button should be visible
   */
  isLetsGoVisible(habit: any): boolean {
    if (!habit) return false;
    const status = habit.status?.toLowerCase();
    return status !== 'ongoing' && status !== 'completed' && status !== 'skipped';
  }

  /**
   * Check if "Abort" button should be visible
   */
  isAbortVisible(habit: any): boolean {
    if (!habit) return false;
    return habit.status?.toLowerCase() === 'ongoing';
  }

  /**
   * Check if "Done" button should be enabled
   */
  isDoneEnabled(habit: any): boolean {
    if (!habit) return false;
    const status = habit.status?.toLowerCase();
    const { startTimeStamp } = this.getTimestamps(habit);
    
    // For skipped status, always enable
    if (status === 'skipped') return true;
    // Cannot click Done before start time
    if (this.isBeforeStartTime(startTimeStamp)) return false;
    // If ongoing, enable
    if (status === 'ongoing') return true;
    // For pending, disable
    return false;
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
