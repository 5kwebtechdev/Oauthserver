export interface CalendarResponse {
    events: CalendarEvent[];
    tasks: CalendarTask[];
    habits: CalendarHabit[];
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
    everyWeekend: boolean;
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
    everyWeekend: boolean;
    tags: string[];
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
}