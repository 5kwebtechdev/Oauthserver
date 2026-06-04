import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulToggleComponent } from '../../mindful-selectors/mindful-toggle/mindful-toggle.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { UserService } from '../../../services/user.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MindfulNavigatorComponent, MindfulToggleComponent, MindfulInputsModule, MindfulButtonComponent],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  quietStart: string = '';
  quietEnd: string = '';
  // role: 'child' | 'parent' — can be set from a parent component later
  @Input() role: 'child' | 'parent' = 'child';
  private destroy$ = new Subject<void>();

  // Notification item type

  // role-specific notification lists (child vs parent)
  childNotifications: { id: string; title: string; desc: string; enabled: boolean }[] = [
    {
      id: 'habit_reminders',
      title: 'Habit Reminders',
      desc: 'Get nudges for habits (e.g., study, exercise). Your panda will cheer you on!',
      enabled: true
    },
    {
      id: 'milestone_progress',
      title: 'Milestone Progress',
      desc: "Get alerts when you're close to unlocking badges",
      enabled: true
    },
    {
      id: 'new_content',
      title: 'New Content & Features',
      desc: 'Discover new courses, quizzes, puzzles and ways to level up your skills.',
      enabled: true
    },
    {
      id: 'coin_rewards',
      title: 'Coin & Reward Alerts',
      desc: 'Get notified when you earn coins, unlock rewards, or can redeem something special.',
      enabled: true
    }
  ];

  parentNotifications: { id: string; title: string; desc: string; enabled: boolean }[] = [
    {
      id: 'child_activity_alerts',
      title: 'Child Activity Alerts',
      desc: 'Receive updates when your child completes activities',
      enabled: true
    },
    {
      id: 'learning_report_weekly',
      title: 'Learning Report Weekly Summary',
      desc: "Receive a weekly summary of your child's learning streaks, quiz scores etc",
      enabled: true
    },
    {
      id: 'app_updates',
      title: 'App Updates',
      desc: 'Stay in the loop about new features, pets, and accessories.',
      enabled: true
    },
    {
      id: 'security_privacy',
      title: 'Security & Privacy Alerts',
      desc: 'Get instant notifications for unusual app activity by your child',
      enabled: true
    }
  ];

  // returns the active list based on role
  get displayedNotifications(): { id: string; title: string; desc: string; enabled: boolean }[] {
    return this.role === 'parent' ? this.parentNotifications : this.childNotifications;
  }

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    // subscribe to user profile and set role automatically when available
    this.userService.getUserProfile$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        if (!profile) return;
        const rel = (profile.relationship || '').toString().toLowerCase();
        if (rel === 'parent') this.role = 'parent';
        else if (rel === 'child') this.role = 'child';
        else this.role = 'child';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveProfile(): void {
    // Persist settings (hook into real service later)
    const notifications = this.displayedNotifications.map((n: { id: string; enabled: boolean }) => ({ id: n.id, enabled: !!n.enabled }));

    const payload = {
      quietHours: {
        start: this.formatTo24(this.quietStart) || null,
        end: this.formatTo24(this.quietEnd) || null
      },
      notifications
    };
    console.log('saveProfile payload', payload);
  }
  trackById(index: number, item: { id: string }) {
    return item.id;
  }

  /**
   * Convert a time string like "12:30 AM" or "07:05 PM" to 24-hour "HH:mm".
   * If input is empty or invalid, returns an empty string.
   */
  formatTo24(time: string): string {
    if (!time || typeof time !== 'string') return '';
    const parts = time.trim().split(' ');
    if (parts.length < 2) {
      // maybe already in HH:mm
      return time.length ? time.split(' ')[0] : '';
    }
    const [t, ampm] = parts;
    const [hStr, mStr] = t.split(':');
    if (!hStr || !mStr) return '';
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    if (isNaN(h)) return '';
    const upper = (ampm || '').toUpperCase();
    if (upper === 'AM') {
      if (h === 12) h = 0;
    } else if (upper === 'PM') {
      if (h !== 12) h = h + 12;
    }
    const hh = h.toString().padStart(2, '0');
    return `${hh}:${m}`;
  }
}
