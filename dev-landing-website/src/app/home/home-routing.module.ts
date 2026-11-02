import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';

const routes: Routes = [
    {
        path: '',
        component: HomePage
    },
    {
        path: 'timeline',
        loadComponent: () => import('../core/pages/activity-section/activity-timeline/activity-timeline.component').then(m => m.ActivityTimelineComponent)
    },
    {
        path: 'activity-calendar',
        loadComponent: () => import('../core/pages/activity-section/activity-calendar/activity-calendar.component').then(m => m.ActivityCalendarComponent)
    },
    {
        path: 'activity-detail',
        loadComponent: () => import('../core/pages/activity-section/activity-detail/activity-detail.component').then(m => m.ActivityDetailComponent)
    },
    {
        path: 'activity-detail/:id',
        loadComponent: () => import('../core/pages/activity-section/activity-detail/activity-detail.component').then(m => m.ActivityDetailComponent)
    },
    {
        path: 'activity-input',
        loadComponent: () => import('../core/pages/activity-section/activity-input/activity-input.component').then(m => m.ActivityInputComponent)
    },
    {
        path: 'activity-page',
        loadComponent: () => import('../core/pages/activity-section/activity-page/activity-page.component').then(m => m.ActivityPageComponent)
    },
    {
        path: 'habits',
        loadComponent: () => import('../core/pages/activity-section/activity-universe/activity-universe.component').then(m => m.ActivityUniverseComponent),
        data: { tab: 'habits' }
    },
    {
        path: 'tasks',
        loadComponent: () => import('../core/pages/activity-section/activity-universe/activity-universe.component').then(m => m.ActivityUniverseComponent),
        data: { tab: 'tasks' }
    },
    {
        path: 'content',
        loadComponent: () => import('../core/pages/learning-section/learning-page/learning-page.component').then(m => m.LearningPageComponent)
    },
    {
        path: 'content/description',
        loadComponent: () => import('../core/components/content-card/content-description/content-description.component').then(m => m.ContentDescriptionComponent)
    },
    {
        path: 'quizzes',
        loadComponent: () => import('../core/components/content-card/content-quiz/content-quiz.component').then(m => m.ContentQuizComponent)
    },
    {
        path: 'articles',
        loadComponent: () => import('../core/components/content-card/Content-Articles/content-articles.component').then(m => m.ContentArticlesComponent)
    },
    {
        path: 'puzzles',
        loadComponent: () => import('../core/components/content-card/content-puzzle/content-puzzle.component').then(m => m.ContentPuzzleComponent)
    },
    {
        path: 'content/viewall',
        loadComponent: () => import('../core/components/content-card/content-viewall/content-viewall.component').then(m => m.ContentViewallComponent)
    },
    {
        path: 'notes',
        loadComponent: () => import('../core/pages/notes/notes.page').then(m => m.NotesPage)
    },
    {
        path: 'notes/new',
        loadComponent: () => import('../core/components/notes/notes-new/notes-new.component').then(m => m.NotesNewComponent)
    },
    {
        path: 'coin',
        loadComponent: () => import('../core/pages/coin-section/coin-page/coin-page.component').then(m => m.CoinPageComponent)
    },
    {
        path: 'badges',
        loadComponent: () => import('../core/pages/badges-section/badges-page/badges-page.component').then(m => m.BadgesPageComponent)
    },
    {
        path: 'trophies',
        loadComponent: () => import('../core/components/trophy-section/trophy-page/trophy-page.component').then(m => m.TrophyPageComponent)
    },
    {
        path: 'streaks',
        loadComponent: () => import('../core/pages/streak-section/streak-homepage/streak-homepage.component').then(m => m.StreakHomepageComponent)
    },
    {
        path: 'journal-input',
        loadComponent: () => import('../core/pages/journal-section/journal-input-page/journal-input-page.component').then(m => m.JournalInputPageComponent)
    },
    {
        path: 'journal-output',
        loadComponent: () => import('../core/pages/journal-section/journal-home/journal-home.component').then(m => m.JournalHomeComponent)
    },
    {
        path: 'education',
        loadComponent: () => import('../core/pages/tutor-section/tutor-category/tutor-category.component').then(m => m.TutorCategoryComponent)
    },
    {
        path: 'tutors',
        loadComponent: () => import('../core/pages/tutor-section/tutor-homepage/tutor-homepage.component').then(m => m.TutorHomepageComponent)
    },
    {
        path: 'academy',
        loadComponent: () => import('../core/components/academy-section/academy-home/academy-home.component').then(m => m.AcademyHomeComponent)
    },
    {
        path: 'academy/managing-money',
        loadComponent: () => import('../core/components/academy-section/academy-course/academy-course.component').then(m => m.AcademyCourseComponent)
    },
    {
        path: 'academy/course',
        loadComponent: () => import('../core/components/academy-section/academy-course/academy-course.component').then(m => m.AcademyCourseComponent)
    },
    {
        path: 'academy/course/:id',
        loadComponent: () => import('../core/components/academy-section/academy-course/academy-course.component').then(m => m.AcademyCourseComponent)
    },
    {
        path: 'academy/lesson/:id',
        loadComponent: () => import('../core/components/academy-section/academy-lesson-page/academy-lesson-page.component').then(m => m.AcademyLessonPageComponent)
    },
    {
        path: 'academy/fulllesson/:id',
        loadComponent: () => import('../core/components/academy-section/academy-fulllesson-page/academy-fulllesson-page.component').then(m => m.AcademyFulllessonPageComponent)
    },
    {
        path: 'reels',
        loadComponent: () => import('../core/components/reel-section/reel-homepage/reel-homepage.component').then(m => m.ReelHomepageComponent)
    },
    {
        path: 'reels/all',
        loadComponent: () => import('../core/components/reel-section/all-reels/all-reels.component').then(m => m.AllReelsComponent)
    },
    {
        path: 'reels/bookmarks',
        loadComponent: () => import('../core/components/reel-section/bookmark-reels/bookmark-reels.component').then(m => m.BookmarkReelsComponent)
    },
    {
        path: 'reels/upload',
        loadComponent: () => import('../core/components/reel-section/upload-reel/upload-reel.component').then(m => m.UploadReelComponent)
    },
    {
        path: 'reel-expand',
        loadComponent: () => import('../core/components/reel-section/reel-expand').then(m => m.ReelsExpandComponent)
    },
    {
        path: 'learning',
        loadComponent: () => import('../core/pages/learning-section/learning-page/learning-page.component').then(m => m.LearningPageComponent)
    },
    {
        path: 'learning/description/:id',
        loadComponent: () => import('../core/pages/learning-section/description-page/description-page.component').then(m => m.DescriptionPageComponent)
    },
    {
        path: 'learning/questions/:id',
        loadComponent: () => import('../core/pages/learning-section/questions-page/questions-page.component').then(m => m.QuestionsPageComponent)
    },
    {
        path: 'learning/result/:id',
        loadComponent: () => import('../core/pages/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent)
    },
    {
        path: 'learning/article/:id',
        loadComponent: () => import('../core/pages/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent)
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule { }