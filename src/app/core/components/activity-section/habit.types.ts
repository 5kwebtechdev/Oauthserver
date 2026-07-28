export type ReminderOffset = 'MINUTES_15' | 'MINUTES_30' | 'MINUTES_45';

export interface Habit {
  id: string; // Unique identifier
  title: string;
  notes: string;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  startTimeStamp: number; // For card calculations
  endTimeStamp: number;
  type: 'habits' | 'tasks' | 'timetable';
  isPrivate: boolean;
  selectedRoutine: string;
  routineTags: { key: string; value: string; type: string }[];
  everyday: boolean;
  selectedDays: string[]; // Array from Set
  priority: 'low' | 'medium' | 'high';
  routine: string;
  status: 'pending' | 'ongoing' | 'completed' | 'skipped';
  createdAt: Date;
  completionDate?: Date | null; // Add this line
  activities?: { name: string; startTime: string; endTime: string }[]; // For timetable type
  tags?: string[];
  coinReward?: number;
  daysOfWeek?: string[]; // e.g., ['Monday', 'Wednesday']
  // Additional optional analytics fields fetched from backend
  description?: string;
  streak?: number;
  highestStreak?: number;
  coinsEarned?: number;
  completionPercentage?: number;
  totalScheduledDays?: number;
  totalCompletedDays?: number;
  milestoneBadges?: any[];
  currentHabitStreak?: number;
  highestHabitStreak?: number;
  currentTaskStreak?: number;
  highestTaskStreak?: number;
  // Task-specific fields
  assignedToId?: number;
  assignedToName?: string;
  createdById?: number;
  createdByName?: string;
  createdBy?: string;
  sharedWithParent?: boolean;
  completed?: boolean;
  rewardCoins?: number;
  familyId?: number | null;
  updatedAt?: string | null;
  reminderOffset?: ReminderOffset | null;
}
