import { RenderMode, ServerRoute } from '@angular/ssr';

const publicPaths = [
  '', '404', 'habit-tracker', 'task-manager', 'daily-journal', 'routine-planner',
  'productivity-calendar', 'note-taking-app', 'quiz', 'puzzle', 'master-class',
  'reels', 'insights', 'find-a-tutor', 'find-an-academy', 'find-events',
  'find-second-hand-book', 'find-a-counselor', 'find-a-stationery-shop',
  'find-a-book-store', 'find-a-sport-shop', 'find-pg-hostel', 'school-uniforms',
  'entrance-exam-books', 'general-books', 'stationery', 'become-a-tutor',
  'list-your-academy',
  'advertise-with-us', 'list-your-stationery-shop', 'become-a-counsellor',
  'list-a-workshop', 'list-your-bookstore',
  'list-your-sports-shop', 'list-an-event', 'list-your-pg-hostel',
  'list-second-hand-books',
  'about', 'meet-the-team', 'contact-us', 'faq', 'child-safety', 'app/privacy-policy',
  'privacy-policy', 'cookie-policy', 'terms-of-use', 'refund-cancellation',
];

export const serverRoutes: ServerRoute[] = [
  { path: 'blogs', renderMode: RenderMode.Server },
  { path: 'article/:slug', renderMode: RenderMode.Server },
  ...publicPaths.map(path => ({ path, renderMode: RenderMode.Prerender as const })),
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
