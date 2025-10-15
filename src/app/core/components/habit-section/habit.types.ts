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
  status: 'pending' | 'ongoing' | 'completed';
  createdAt: Date;
  activities?: { name: string; startTime: string; endTime: string }[]; // For timetable type
  tags?: string[];
  coinReward?: number;
}