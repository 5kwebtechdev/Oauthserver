/** Presentation states from Figma section 25779:53144. Frame labels are not UI copy. */
export type GlanceTab = 'all' | 'habits' | 'tasks' | 'timetable';
export type GlanceOutcome = 'empty' | 'completed' | 'passed' | 'mixed-passed';
export interface GlanceDailyData {
  habits: any[];
  tasks: any[];
  planners: any[];
}
export interface GlanceItemState { completed: boolean; passed: boolean; }
export interface GlanceBlankState {
  key: string;
  frame: string;
  title: string;
  description: string;
  image: string;
  width: number;
  height: number;
  crop: { width: string; height: string; left: string; top: string };
  textWidth: number;
  primary: string;
  secondary?: string;
  secondaryRoute?: 'calendar' | 'activities';
  capitalize?: boolean;
  footerGap?: number;
  parentCopy?: boolean;
}

const crop = (width: string, height: string, left: string, top: string) => ({ width, height, left, top });
const base = 'assets/figma/home-blank-states/';
export const GLANCE_BLANK_STATES: Record<string, GlanceBlankState> = {
  'habits-empty': {
    key: 'habits-empty', frame: '25770:52421', title: 'No habits lined up for today!',
    description: 'Habits help you build a better, brighter you. Add one to start your streak and earn coins.',
    image: base + 'habits.png', width: 305, height: 158,
    crop: crop('256.43%', '330.32%', '-21.54%', '-11.94%'), textWidth: 275,
    primary: 'Add a Habit', secondary: 'View Calendar', secondaryRoute: 'calendar', capitalize: true
  },
  'habits-completed': {
    key: 'habits-completed', frame: '25773:52578', title: 'All habits completed! 🎉',
    description: "Amazing work! You've completed all your habits today. Keep going to build a brighter you.",
    image: base + 'habits.png', width: 317, height: 161,
    crop: crop('246.72%', '324.17%', '-18.83%', '-113.22%'), textWidth: 293,
    primary: 'Add a Habit', secondary: 'View all habits', secondaryRoute: 'activities', capitalize: true, footerGap: 16
  },
  'habits-passed': {
    key: 'habits-passed', frame: '25773:52621', title: 'Habit’s time Over',
    description: 'Mark them done from the calendar to keep your streak going and earn coins.',
    image: base + 'habits.png', width: 325, height: 161,
    crop: crop('240.65%', '324.17%', '-17.13%', '-211.38%'), textWidth: 293,
    primary: 'Add a Habit', secondary: 'View Calendar', secondaryRoute: 'calendar', capitalize: true, footerGap: 16
  },
  'tasks-empty': {
    key: 'tasks-empty', frame: '25773:52703', title: 'No tasks lined up for today!',
    description: 'Tasks helps you stay organized and get things done. Add one to start your progress and earn coin.',
    image: base + 'tasks.png', width: 305, height: 142,
    crop: crop('192.72%', '276.86%', '-45.42%', '-3.78%'), textWidth: 311,
    primary: 'Add a Task', secondary: 'View Calendar', secondaryRoute: 'calendar', capitalize: true
  },
  'tasks-completed': {
    key: 'tasks-completed', frame: '25773:52837', title: 'All Tasks completed! 🎉',
    description: "Great job! You've completed all your tasks for today. Take a moment to celebrate and keep going!",
    image: base + 'tasks-completed.png', width: 319, height: 139,
    crop: crop('184.26%', '282.84%', '-40.35%', '-99.69%'), textWidth: 311,
    primary: 'Add a Task', secondary: 'View all Task', secondaryRoute: 'activities', capitalize: true
  },
  'tasks-passed': {
    key: 'tasks-passed', frame: '25773:52884', title: 'Task’s time Over',
    description: 'Mark them done from the calendar to keep your streak going and earn coins.',
    image: base + 'tasks.png', width: 305, height: 112,
    crop: crop('192.72%', '351.02%', '-48.1%', '-246.01%'), textWidth: 311,
    primary: 'Add a Task', secondary: 'View all Task', secondaryRoute: 'activities', capitalize: true
  },
  'timetable-empty': {
    key: 'timetable-empty', frame: '25776:52931', title: 'No Plan lined up for today!',
    description: 'Plans help you manage your time better. Add one to stay organized.',
    image: base + 'planner.png', width: 305, height: 161,
    crop: crop('112.02%', '122.78%', '-7.54%', '-16.99%'), textWidth: 255,
    primary: 'Add a Plan', secondary: 'View Calendar', secondaryRoute: 'calendar', capitalize: true
  },
  'all-empty': {
    key: 'all-empty', frame: '25776:52979', title: 'Your day is wide open',
    description: 'No habits, tasks, or planner yet. Start with one, anything counts.',
    image: base + 'all.png', width: 345, height: 138,
    crop: crop('107.92%', '269.1%', '-6.28%', '-5.15%'), textWidth: 275,
    primary: 'Add New activity', secondary: 'View Calendar', secondaryRoute: 'calendar'
  },
  'all-completed': {
    key: 'all-completed', frame: '25779:53115', title: 'All done. Actually, all of it',
    description: 'Every activity is cleared. You got through all of it.',
    image: base + 'all.png', width: 345, height: 115,
    crop: crop('107.92%', '322.92%', '-6.28%', '-124.36%'), textWidth: 253,
    primary: 'Add New activity', secondary: 'View Calendar', secondaryRoute: 'calendar'
  },
  'all-mixed-passed': {
    key: 'all-mixed-passed', frame: '25914:16745', title: 'All activities for today have passed',
    description: "Some activities are done, the others moved to your calendar. Head there to see what's still pending.",
    image: base + 'all-passed.png', width: 345, height: 126,
    crop: crop('109.7%', '93.65%', '-4.85%', '7.94%'), textWidth: 325,
    primary: 'Add New activity', secondary: 'View Calendar', secondaryRoute: 'calendar'
  },
  'all-passed': {
    key: 'all-passed', frame: '25778:53083', title: 'All activities for today have passed',
    description: "You didn't mark them as done, so they've been moved to your calendar.",
    image: base + 'all-passed.png', width: 345, height: 126,
    crop: crop('109.7%', '93.65%', '-4.85%', '7.94%'), textWidth: 275,
    primary: 'Add New activity', secondary: 'View Calendar', secondaryRoute: 'calendar'
  }
};

/** Parent-only copy for the three empty category tabs; artwork and actions stay shared. */
export function parentCategoryBlankState(state: GlanceBlankState, childName: string): GlanceBlankState {
  const name = childName.trim() || 'Your child';
  const copy: Record<string, { title: string; description: string }> = {
    'habits-empty': {
      title: `${name}\nhas no habits today!`,
      description: `Habits help build consistency and good routines. Add one to get ${name} started.`
    },
    'tasks-empty': {
      title: `${name}\nhas no tasks today!`,
      description: `Tasks help ${name} stay organized and focused. Add one to keep the day on track.`
    },
    'timetable-empty': {
      title: `${name}\nhas no plans today!`,
      description: `Plans help ${name} manage time better. Add one to keep the day structured.`
    }
  };
  return copy[state.key] ? { ...state, ...copy[state.key], parentCopy: true } : state;
}

/** Receives existing completion/time decisions; does not change activity status. */
export function resolveGlanceBlankState(tab: GlanceTab, groups: Record<'habits' | 'tasks' | 'timetable', GlanceItemState[]>): GlanceBlankState | null {
  const items = tab === 'all' ? [...groups.habits, ...groups.tasks, ...groups.timetable] : groups[tab];
  let outcome: GlanceOutcome;
  if (!items.length) outcome = 'empty';
  else if (tab === 'timetable') return null; // Figma defines only No Planner; retain existing schedule cards.
  else if (items.every(item => item.completed)) outcome = 'completed';
  else if (items.every(item => item.completed || item.passed)) {
    outcome = tab === 'all' && items.some(item => item.completed) ? 'mixed-passed' : 'passed';
  }
  else return null;
  return GLANCE_BLANK_STATES[`${tab}-${outcome}`];
}
