import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FooterComponent } from '../../../components/footer/footer.component';
import { ActivityCardComponent } from '../activity-card/activity-card.component';
import { HabitApi } from '../../../api/habit.api';
import { TaskApi } from '../../../api/task.api';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';

interface DayCell {
    date: Date;
    label: string;
    dayNum: number;
    iso: string;
}

type JourneyFilter = 'pending' | 'ongoing' | 'completed';
type PriorityFilter = 'high' | 'medium' | 'low';
type RoutineFilter = 'morning' | 'evening' | 'night';

@Component({
    selector: 'app-activity-universe',
    standalone: true,
    imports: [CommonModule, RouterModule, PublicNavbarComponent, FooterComponent, ActivityCardComponent, AdSliderComponent],
    templateUrl: './activity-universe.component.html',
    styleUrls: ['./activity-universe.component.scss']
})
export class ActivityUniverseComponent implements OnInit {
    private static readonly DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    activeTab: 'habits' | 'tasks' = 'habits';
    selectedDate: Date = new Date();
    weekDays: DayCell[] = [];

    habits: any[] = [];
    tasks: any[] = [];
    isLoading = false;

    journeyFilter: JourneyFilter = 'pending';
    priorityFilter: PriorityFilter = 'high';
    routineFilter: RoutineFilter = 'morning';

    currentBannerIndex = 0;
    banners: Array<{ title: string; description: string; ctaText: string; image: string; alt: string }> = [
        {
            title: 'Become a Young Scientist!',
            description: 'Explore fun experiments and STEM kits curated for curious minds. Build, discover, and learn while having a blast.',
            ctaText: 'Get yours today!',
            image: 'assets/images/Ad Banner.png',
            alt: 'Become a Young Scientist'
        }
    ];

    get adScreen(): 'COLINS' | 'LEARNING' {
        return this.activeTab === 'habits' ? 'COLINS' : 'LEARNING';
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private habitApi: HabitApi,
        private taskApi: TaskApi,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const tab = this.route.snapshot.data?.['tab'];
        if (tab === 'tasks') this.activeTab = 'tasks';
        this.buildWeek(this.selectedDate);
        this.loadDay();
    }

    private buildWeek(ref: Date): void {
        const start = new Date(ref);
        start.setDate(ref.getDate() - ref.getDay());
        this.weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return {
                date: d,
                label: ActivityUniverseComponent.DAY_LABELS[i],
                dayNum: d.getDate(),
                iso: this.toIso(d)
            };
        });
    }

    private toIso(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    prevWeek(): void {
        const d = new Date(this.selectedDate);
        d.setDate(d.getDate() - 7);
        this.selectedDate = d;
        this.buildWeek(d);
        this.loadDay();
    }

    nextWeek(): void {
        const d = new Date(this.selectedDate);
        d.setDate(d.getDate() + 7);
        this.selectedDate = d;
        this.buildWeek(d);
        this.loadDay();
    }

    selectDate(cell: DayCell): void {
        this.selectedDate = cell.date;
        this.loadDay();
    }

    isSelected(cell: DayCell): boolean {
        return cell.iso === this.toIso(this.selectedDate);
    }

    switchTab(tab: 'habits' | 'tasks'): void {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.loadDay();
    }

    setJourneyFilter(f: JourneyFilter): void { this.journeyFilter = f; }
    setPriorityFilter(f: PriorityFilter): void { this.priorityFilter = f; }
    setRoutineFilter(f: RoutineFilter): void { this.routineFilter = f; }

    private loadDay(): void {
        this.isLoading = true;
        const dateStr = this.toIso(this.selectedDate);

        if (this.activeTab === 'habits') {
            this.habitApi.getHabitsBySearch({ date: dateStr }).subscribe({
                next: (res: any) => {
                    const raw: any[] = Array.isArray(res) ? res : (res?.data || res?.habits || []);
                    this.habits = raw.map((h: any) => this.withTimestamps(h, 'habits', dateStr));
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.habits = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.taskApi.getTasksBySearch({ date: dateStr }).subscribe({
                next: (res: any) => {
                    const raw: any[] = Array.isArray(res) ? res : (res?.data || res?.tasks || []);
                    this.tasks = raw.map((t: any) => this.withTimestamps(t, 'tasks', dateStr));
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.tasks = [];
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    private withTimestamps(item: any, type: 'habits' | 'tasks', dateStr: string): any {
        return {
            ...item,
            type,
            startTimeStamp: this.extractTimestamp(item.startTime || item.start_time, dateStr),
            endTimeStamp: this.extractTimestamp(item.endTime || item.end_time, dateStr)
        };
    }

    private extractTimestamp(timeVal: any, dateStr: string): number {
        if (!timeVal) return 0;
        if (typeof timeVal === 'number') return timeVal;
        if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal)) {
            const parts = timeVal.split(':');
            const d = new Date(dateStr);
            d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
            return d.getTime();
        }
        const parsed = Date.parse(timeVal);
        return isNaN(parsed) ? 0 : parsed;
    }

    get currentItems(): any[] {
        return this.activeTab === 'habits' ? this.habits : this.tasks;
    }

    get journeyItems(): any[] {
        return this.currentItems.filter(i => (i.status || '').toLowerCase() === this.journeyFilter);
    }

    get priorityItems(): any[] {
        return this.currentItems.filter(i => (i.priority || '').toLowerCase() === this.priorityFilter);
    }

    get routineItems(): any[] {
        return this.currentItems.filter(i => (i.selectedRoutine || i.routine || '').toLowerCase() === this.routineFilter);
    }

    countByPriority(p: PriorityFilter): number {
        return this.currentItems.filter(i => (i.priority || '').toLowerCase() === p).length;
    }

    isActivityInProgress(item: any): boolean {
        if (!item) return false;
        const now = Date.now();
        return item.startTimeStamp <= now && now <= item.endTimeStamp;
    }

    goToBanner(index: number): void {
        this.currentBannerIndex = index;
    }

    nextBanner(): void {
        this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
    }

    prevBanner(): void {
        this.currentBannerIndex = this.currentBannerIndex === 0
            ? this.banners.length - 1
            : this.currentBannerIndex - 1;
    }

    openActivity(activity: any): void {
        if (!activity?.id) return;
        const itemType = activity.type || this.activeTab;
        this.router.navigate(['/home/activity-detail', activity.id], {
            state: { habit: activity, type: itemType, selectedDate: this.toIso(this.selectedDate) },
            queryParams: { type: itemType }
        });
    }
}
