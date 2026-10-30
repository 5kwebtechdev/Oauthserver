// Product-defined requirements, not user progress or an awarding engine.
export const TIERS = ['Starter', 'Builder', 'Achiever', 'Champion', 'Legend'] as const;
export type Tier = typeof TIERS[number];
export interface BadgeDefinition {
  id: string; name: string; milestones: readonly number[]; unit: string; detailDescription: string;
  describe: (n: number) => string;
}
const definition = (id: string, name: string, milestones: number[], unit: string,
  describe: (n: number) => string, detailDescription: string): BadgeDefinition =>
  ({ id, name, milestones, unit, describe, detailDescription });
export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  definition('coin-chaser', 'Coin Chaser', [500,2000,6000,15000,40000], 'Coins', n => `Earn ${n.toLocaleString('en-US')} coins.`, 'Total coins collected across all activities'),
  definition('quiz-ace', 'Quiz Ace', [10,30,75,200,500], 'Quizzes', n => `Ace ${n} quizzes (100%).`, 'Quizzes completed with a perfect 100% score'),
  definition('speed-reader', 'Speed Reader', [25,70,180,450,1000], 'Articles', n => `Read ${n} articles.`, 'Total articles you have read from start to end'),
  definition('habit-flow', 'Habit Flow', [100,300,800,2000,5000], 'Habits', n => `Complete ${n} habits.`, 'Total habit completions across all your habits'),
  definition('task-crusher', 'Task Crusher', [50,140,350,850,2000], 'Tasks', n => `Complete ${n} tasks.`, 'Total tasks completions across all your tasks'),
  definition('daily-grit', 'Daily Grit', [20,50,120,250,500], 'Days', n => `${n} all-activity days.`, 'Days with a habit, task, quiz, article and lesson'),
  definition('daily-learner', 'Daily Learner', [30,75,150,300,500], 'Days', n => `Learn ${n} days.`, 'Days with a quiz, article or lesson completed'),
  definition('lesson-sharp', 'Lesson Sharp', [5,15,40,100,250], 'Lessons', n => `Complete ${n} lessons.`, 'Total Masterclass lessons completed so far'),
  definition('journal-flow', 'Journal Flow', [7,21,60,150,365], 'Journals', n => `Write ${n} journals.`, 'Total journal entries you have written so far'),
  definition('crown-collector', 'Crown Collector', [1,3,7,15,30], 'Times', n => `Top the board ${n} time${n === 1 ? '' : 's'}.`, 'Times you were #1 on the leaderboard'),
  definition('squad-builder', 'Squad Builder', [1,3,7,15,30], 'Friends', n => `Get ${n} friend${n === 1 ? '' : 's'} to join.`, 'Friends who joined SuperMeApp with your invite'),
  definition('streak-peak', 'Streak Peak', [3,7,30,100,365], 'Days', n => `Hit a ${n}-day streak.`, 'Consecutive days in your active app streak'),
  definition('pet-squad', 'Pet Squad', [3,6,10,15,20], 'Pets', n => `Collect ${n} unique pets.`, 'Total unique pets added to your collection'),
  definition('creator-mode', 'Creator Mode', [5,15,35,80,180], 'Reels', n => `Post ${n} reels.`, 'Total reels you have posted on the SuperMeApp'),
  definition('like-magnet', 'Like Magnet', [100,350,1000,3000,8000], 'Likes', n => `Get ${n.toLocaleString('en-US')} reel likes.`, 'Total likes received across all your reels'),
];
