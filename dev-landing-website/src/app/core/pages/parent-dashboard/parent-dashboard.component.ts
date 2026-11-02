import { Component, OnInit, OnDestroy } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CoinParentPageComponent } from './coin-parent-page/coin-parent-page.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { SupermeInputsModule } from '../../components/superme-inputs/superme-inputs.module';
import { MoodService } from '../../services/mood.service';
import { AuthService } from '../../services/auth.service';
import { ParentDataService } from '../../services/parent-data.service';
import { FamilyService, FamilyMember } from '../../services/family.service';
import { MOOD_EMOJI_MAP } from '../../models/mood.model';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { AdSliderComponent } from '../../components/ad-slider/ad-slider.component';

interface CalendarItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  tag: string;
  status: 'pending' | 'ongoing' | 'completed';
  priority: 'high' | 'medium' | 'low';
  routine: 'morning' | 'evening' | 'night';
  streaks: number;
  coins: number;
  type: 'habit' | 'task' | 'timetable';
  showApprove?: boolean;
  showActions?: boolean;
  showHover?: boolean;
}

@Component({
  selector: 'parent-dashboard',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent, SupermeInputsModule, CoinParentPageComponent, AdSliderComponent],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss'],
})
export class ParentDashboardComponent implements OnInit, OnDestroy {
  private metricsSub?: Subscription;
  private childSub?: Subscription;
  private calendarSub?: Subscription;

  metrics = { completionRate: 0, consistencyRate: 0, improvementRate: 0, appScore: 0 };
  currentMood = 'NEUTRAL';
  currentDescription = 'Add tasks & habits to view their progress!';
  moodEmojiSrc = MOOD_EMOJI_MAP['Happy'];
  selectedDate: Date = new Date();
  isLoadingCalendar = false;

  habits: CalendarItem[] = [];
  tasks: CalendarItem[] = [];
  timetable: CalendarItem[] = [];

  activeTab: 'habits' | 'tasks' = 'habits';
  habitsStatusFilter: 'pending' | 'ongoing' | 'completed' = 'pending';
  habitsPriorityFilter: 'high' | 'medium' | 'low' = 'high';
  habitsRoutineFilter: 'morning' | 'evening' | 'night' = 'morning';
  tasksStatusFilter: 'pending' | 'ongoing' | 'completed' = 'pending';
  tasksPriorityFilter: 'high' | 'medium' | 'low' = 'high';
  tasksRoutineFilter: 'morning' | 'evening' | 'night' = 'morning';

  showParentCoins = false;
  childAge: number | null = null;
  private familyMembersByUserId = new Map<number, FamilyMember>();

  constructor(
    private moodService: MoodService,
    private authService: AuthService,
    private parentDataService: ParentDataService,
    private familyService: FamilyService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.moodService.getParentVibesDisplay().subscribe({
      next: (vibes) => { if (vibes?.length) this.parentDataService.setChildren(vibes); },
      error: () => {}
    });

    this.familyService.getFamilyDetails().subscribe({
      next: (res) => {
        const members = res?.family?.members ?? [];
        this.familyMembersByUserId = new Map(members.map(m => [m.userId, m]));
        this.childAge = this.resolveChildAge(this.parentDataService.selectedChild?.assignedTo);
      },
      error: () => {}
    });

    this.metricsSub = this.parentDataService.selectedChild$.subscribe(child => {
      if (child) {
        this.metrics = {
          completionRate: child.completionRate ?? 0,
          consistencyRate: child.consistencyRate ?? 0,
          improvementRate: child.improvementRate ?? 0,
          appScore: child.appScore ?? 0,
        };
        this.currentMood = child.mood ?? 'NEUTRAL';
        this.currentDescription = child.description ?? child.emptyStateDescription ?? 'Add tasks & habits to view their progress!';
        this.moodEmojiSrc = this.getMoodEmoji(this.currentMood);
        this.childAge = this.resolveChildAge(child.assignedTo);
        this.loadCalendar(child.assignedTo, this.selectedDate);
      } else {
        this.metrics = { completionRate: 0, consistencyRate: 0, improvementRate: 0, appScore: 0 };
        this.habits = []; this.tasks = []; this.timetable = [];
        this.childAge = null;
      }
    });
  }

  private resolveChildAge(userId: number | undefined): number | null {
    if (!userId) return null;
    return this.familyMembersByUserId.get(userId)?.age ?? null;
  }

  ngOnDestroy() {
    this.metricsSub?.unsubscribe();
    this.childSub?.unsubscribe();
    this.calendarSub?.unsubscribe();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private loadCalendar(userId: number, date: Date) {
    if (!userId) return;
    this.isLoadingCalendar = true;
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    const url = `${environment.apiUrl}/calendar/user-calendar`;
    const params = { date: this.formatDate(date), viewType: 'day', forUserId: String(userId) };

    this.calendarSub?.unsubscribe();
    this.calendarSub = this.http.get<any>(url, { headers, params }).subscribe({
      next: (res) => {
        const data = res?.data ?? res ?? {};
        this.habits    = this.mapItems(data.habits    ?? [], 'habit');
        this.tasks     = this.mapItems(data.tasks     ?? [], 'task');
        this.timetable = this.mapItems(data.timetable ?? [], 'timetable');
        this.isLoadingCalendar = false;
      },
      error: () => { this.isLoadingCalendar = false; }
    });
  }

  private mapStatus(raw: string): 'pending' | 'ongoing' | 'completed' {
    const s = (raw ?? '').toUpperCase();
    if (s === 'COMPLETED' || s === 'DONE') return 'completed';
    if (s === 'IN_PROGRESS' || s === 'ONGOING' || s === 'INPROGRESS') return 'ongoing';
    return 'pending'; // PENDING, SKIPPED, or anything else
  }

  private mapItems(items: any[], type: 'habit' | 'task' | 'timetable'): CalendarItem[] {
    return items.map((i: any) => ({
      id: String(i.id ?? ''),
      title: i.title ?? i.name ?? '',
      startTime: i.startTime ?? '',
      endTime: i.endTime ?? '',
      tag: i.tag ?? i.tags?.[0] ?? '',
      status: this.mapStatus(i.status),
      priority: ((i.priority ?? 'medium') as string).toLowerCase() as any,
      routine: ((i.routine ?? i.period ?? 'morning') as string).toLowerCase() as any,
      streaks: i.currentHabitStreak ?? i.streaks ?? i.streak ?? 0,
      coins: i.rewardCoins ?? i.coins ?? i.coinReward ?? 0,
      type,
      showApprove: (i.status ?? '').toUpperCase() === 'COMPLETED',
      showActions: false,
      showHover: false,
    }));
  }

  setTab(tab: 'habits' | 'tasks') { this.activeTab = tab; }
  setHabitsStatusFilter(f: 'pending' | 'ongoing' | 'completed') { this.habitsStatusFilter = f; }
  setHabitsPriorityFilter(f: 'high' | 'medium' | 'low') { this.habitsPriorityFilter = f; }
  setHabitsRoutineFilter(f: 'morning' | 'evening' | 'night') { this.habitsRoutineFilter = f; }
  setTasksStatusFilter(f: 'pending' | 'ongoing' | 'completed') { this.tasksStatusFilter = f; }
  setTasksPriorityFilter(f: 'high' | 'medium' | 'low') { this.tasksPriorityFilter = f; }
  setTasksRoutineFilter(f: 'morning' | 'evening' | 'night') { this.tasksRoutineFilter = f; }

  get filteredHabits() { return this.habits.filter(h => h.status === this.habitsStatusFilter); }
  get filteredHabitsByPriority() { return this.habits.filter(h => h.priority === this.habitsPriorityFilter); }
  get filteredHabitsByRoutine() { return this.habits.filter(h => h.routine === this.habitsRoutineFilter); }
  get filteredTasks() { return this.tasks.filter(t => t.status === this.tasksStatusFilter); }
  get filteredTasksByPriority() { return this.tasks.filter(t => t.priority === this.tasksPriorityFilter); }
  get filteredTasksByRoutine() { return this.tasks.filter(t => t.routine === this.tasksRoutineFilter); }

  get priorityCounts() {
    return { high: this.habits.filter(h => h.priority === 'high').length, medium: this.habits.filter(h => h.priority === 'medium').length, low: this.habits.filter(h => h.priority === 'low').length };
  }
  get taskPriorityCounts() {
    return { high: this.tasks.filter(t => t.priority === 'high').length, medium: this.tasks.filter(t => t.priority === 'medium').length, low: this.tasks.filter(t => t.priority === 'low').length };
  }

  toggleHabitActions(habit: CalendarItem) { habit.showActions = !habit.showActions; }
  toggleTaskActions(task: CalendarItem) { task.showActions = !task.showActions; }
  approveHabit(id: string) {}
  abortHabit(id: string) {}
  markHabitDone(id: string) {}
  approveTask(id: string) {}
  abortTask(id: string) {}
  markTaskDone(id: string) {}




  getMoodEmoji(mood: string): string {
    const map: Record<string, string> = {
      'HAPPY': MOOD_EMOJI_MAP['Happy'],
      'VERY HAPPY': MOOD_EMOJI_MAP['Very Happy'],
      'EXCITED': MOOD_EMOJI_MAP['Excited'],
      'SAD': MOOD_EMOJI_MAP['Sad'],
      'UPSET': MOOD_EMOJI_MAP['Upset'],
      'NERVOUS': MOOD_EMOJI_MAP['Nervous'],
      'NEUTRAL': MOOD_EMOJI_MAP['Happy'],
    };
    return map[(mood ?? '').toUpperCase()] ?? MOOD_EMOJI_MAP['Happy'];
  }

  goToCoins() { this.showParentCoins = true; }
  closeParentCoins() { this.showParentCoins = false; }

  onDateSelected(ev: any) {
    this.selectedDate = ev ? new Date(ev) : new Date();
    const child = this.parentDataService.selectedChild;
    if (child) this.loadCalendar(child.assignedTo, this.selectedDate);
  }
}
