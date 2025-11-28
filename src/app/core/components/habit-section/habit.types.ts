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
  // Task-specific fields
  assignedToId?: number;
  assignedToName?: string;
  createdById?: number;
  createdByName?: string;
  createdBy?: string;
  sharedWithParents?: boolean;
  completed?: boolean;
  rewardCoins?: number;
  familyId?: number | null;
  updatedAt?: string | null;
}