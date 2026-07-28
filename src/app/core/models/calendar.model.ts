import { ReminderOffset } from '../components/activity-section/habit.types';

export interface CalendarResponse {
    events: CalendarEvent[];
    tasks: CalendarTask[];
    habits: CalendarHabit[];
    totalTasks?: number;
    totalTasksCompleted?: number;
    taskCompletionRate?: number;
    totalHabits?: number;
    totalHabitsCompleted?: number;
    habitCompletionRate?: number;
}

export interface CalendarEvent {
    id: number;
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    type: string;
    completed: boolean;
    family: any;
    createdAt: string;
    updatedAt: string | null;
    tags: string[];
    daysOfWeek: string[];
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    everyday: boolean;
    reminderOffset?: ReminderOffset | null;
}

export interface CalendarHabit {
    id: number;
    title: string;
    description: string;
    status: 'PENDING' | 'COMPLETED';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    routine: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    family: any;
    daysOfWeek: string[];
    createdAt: string;
    updatedAt: string;
    coinReward: number;
    everyday: boolean;
    tags: string[];
    reminderOffset?: ReminderOffset | null;
}

export interface CalendarTask extends CalendarEvent { }

export interface TimelineEvent {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    type: 'habit' | 'task' | 'event' | 'timetable';
    description?: string;
    tags?: string[];
    priority?: string;
    status?: string;
    _top?: number;
    _height?: number;
    _column?: number;
    _columnCount?: number;
    // Who created this item (server may return `createdBy` or `created_by`)
    createdBy?: number;
    // Whether the child has shared this item with their parent — used to hide
    // items the child marked Private when a parent is viewing their timeline.
    sharedWithParent?: boolean;
    reminderOffset?: ReminderOffset | null;
}
