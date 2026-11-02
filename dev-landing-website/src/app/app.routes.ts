import { Routes } from '@angular/router';
import { signedInShop, shopCategoryMatcher, shopSelectionResolver, shopProductResolver, legacyShopRedirect } from './core/guards/shop-route.resolver';
import { articleLinkGuard, articleSlugResolver } from './core/guards/article-route.resolver';
import { AuthGuard } from './core/guards/auth.guard';
import { UnauthGuard } from './core/guards/unauth.guard';
import { discoveryDetailsGuard } from './core/guards/discovery-details.guard';
import { DashboardRedirectGuard } from './core/guards/dashboard-redirect.guard';
import { seoResolver } from './core/guards/seo.resolver';
import { AllReelsComponent } from './core/components/reel-section/all-reels/all-reels.component';
import { UploadReelComponent } from './core/components/reel-section/upload-reel/upload-reel.component';
import { BookmarkReelsComponent } from './core/components/reel-section/bookmark-reels/bookmark-reels.component';

// Professional routing structure:
// 1. Landing page is public - for unauthenticated users
// 2. After login, users are redirected based on their role:
//    - PARENT → /parent (Parent Dashboard)
//    - CHILD/SELF → /home (User Dashboard)
// 3. Protected routes require authentication
const routeDefinitions: Routes = [
    {
        path: 'article/:slug',
        resolve: { articleSelection: articleSlugResolver },
        loadComponent: () => import('./core/pages/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent),
    },
    {
        path: 'articles/:slug',
        canActivate: [articleLinkGuard],
        resolve: { articleSelection: articleSlugResolver },
        loadComponent: () => import('./core/pages/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent),
    },
    {
        path: 'shop/products/:slug',
        canMatch: [signedInShop],
        canActivate: [AuthGuard],
        resolve: { shopSelection: shopProductResolver },
        loadComponent: () => import('./core/pages/school-store/product-store/product-detail/product-detail.components').then(m => m.ProductDetailComponent),
    },
    {
        matcher: shopCategoryMatcher,
        canMatch: [signedInShop],
        canActivate: [AuthGuard],
        resolve: { shopSelection: shopSelectionResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        loadComponent: () => import('./core/pages/school-store/product-store/product-store.components').then(m => m.ProductStoreComponent),
    },

    // Public web aliases used by the logged-out navbar and account prompt.
    // Keep these URLs stable even though the full onboarding flow also lives under /auth.
    {
        path: 'login',
        loadComponent: () => import('./core/pages/onboarding/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'signup',
        loadComponent: () => import('./core/pages/onboarding/signup/signup.component').then(m => m.SignupComponent)
    },

    // Authentication (login / signup / onboarding) - public access (with redirect if logged in)
    {
        path: 'auth',
        loadChildren: () => import('./authentication/authentication.module').then(m => m.AuthenticationModule)
    },

    // Home page (Child/Self Dashboard) - protected with role check
    {
        path: 'home',
        loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
        canActivate: [AuthGuard, DashboardRedirectGuard]
    },

    // Profile page - protected
    {
        path: 'profile',
        loadComponent: () => import('./core/pages/profile-section/profile-section.component').then(m => m.ProfileSectionComponent),
        canActivate: [AuthGuard]
    },

    // Find Tutor page - public landing route
    {
        path: 'find-a-tutor',
        loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent),
    },
    // Keep the previous public URL working while the new URL becomes canonical.
    {
        path: 'find-an-tutor',
        redirectTo: 'find-a-tutor',
        pathMatch: 'full',
    },

    // Become a Tutor page - public
    {
        path: 'become-a-tutor',
        loadComponent: () => import('./landing/pages/tutor/become/page.component').then(m => m.BecomeTutorPageComponent),
    },

    // Public listing registration pages - Tutor-style flow
    {
        path: 'list-your-academy',
        loadComponent: () => import('./landing/pages/tutor/become/page.component').then(m => m.BecomeTutorPageComponent),
        data: { academyListing: true, seoFallbackTitle: 'List Your Academy | SuperMeApp' },
    },
    {
        path: 'list-your-stationery-shop',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'stationary' },
    },
    {
        path: 'list-your-bookstore',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'bookstore' },
    },
    {
        path: 'list-second-hand-books',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'secondhand' },
    },
    {
        path: 'list-your-sports-shop',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'sports' },
    },
    {
        path: 'become-a-counsellor',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'counselor' },
    },
    {
        path: 'list-an-event',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'event' },
    },
    {
        path: 'list-a-workshop',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'workshop' },
    },
    {
        path: 'list-your-pg-hostel',
        loadComponent: () => import('./landing/pages/listing/become/page.component').then(m => m.BecomeListingPageComponent),
        data: { listingType: 'pg_hostel' },
    },

    // Discovery previews stay public; full profiles require login.
    {
        path: 'tutor/profile/:id',
        canActivate: [discoveryDetailsGuard],
        loadComponent: () => import('./landing/pages/tutor/profile/page.component').then(m => m.TutorPublicProfilePageComponent),
    },

    // Tutor Home page - protected
    {
        path: 'tutors',
        loadComponent: () => import('./core/pages/tutor-section/tutor-homepage/tutor-homepage.component').then(m => m.TutorHomepageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'pg-hostels',
        loadComponent: () => import('./landing/pages/pg-hostel/find/page.component').then(m => m.PgHostelFindPageComponent),
        canActivate: [AuthGuard]
    },

    // Tutor Profile page - protected
    {
        path: 'tutor/:id',
        loadComponent: () => import('./core/pages/tutor-section/tutor-profile/tutor-profile.component').then(m => m.TutorProfileComponent),
        canActivate: [AuthGuard]
    },

    // Learning description page - protected
    {
        path: 'learning/description/:id',
        loadComponent: () => import('./core/pages/learning-section/description-page/description-page.component').then(m => m.DescriptionPageComponent),
        canActivate: [AuthGuard]
    },

    // Learning questions page - protected
    {
        path: 'learning/questions/:id',
        loadComponent: () => import('./core/pages/learning-section/questions-page/questions-page.component').then(m => m.QuestionsPageComponent),
        canActivate: [AuthGuard]
    },

    // Learning result page - protected
    {
        path: 'learning/result/:id',
        loadComponent: () => import('./core/pages/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent),
        canActivate: [AuthGuard]
    },

    // Learning article detail page - protected
    {
        path: 'learning/articles/:id',
        loadComponent: () => import('./core/pages/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent),
        canActivate: [AuthGuard]
    },

    // Masterclass category detail (course list) - protected
    {
        path: 'masterclass/category/:id',
        loadComponent: () => import('./core/pages/learning-section/masterclass-categories/category-detail/category-detail.component').then(m => m.CategoryDetailComponent),
        canActivate: [AuthGuard]
    },

    // Masterclass course detail (lesson list) - protected
    {
        path: 'masterclass/course/:id',
        loadComponent: () => import('./core/pages/learning-section/masterclass-categories/course-detail/course-detail.component').then(m => m.CourseDetailComponent),
        canActivate: [AuthGuard]
    },

    // Referral redirect - preserves ?code= param and redirects to landing page
    {
        path: 'referral',
        loadComponent: () => import('./core/pages/referral-redirect/referral-redirect.component').then(m => m.ReferralRedirectComponent)
    },

    // Landing page - public (redirects to dashboard if logged in)
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./core/pages/landing-page/landing-page.component').then(m => m.LandingPageComponent),
        canActivate: [UnauthGuard],
    },
    {
        path: 'landing-page',
        redirectTo: '',
        pathMatch: 'full'
    },

    // FAQ page - public
    {
        path: 'faq',
        loadComponent: () => import('./core/pages/footer-pages/faq-page/faq-page.component').then(m => m.FaqPageComponent),
        data: { seoFallbackTitle: 'SuperMeApp FAQ | Accounts, Learning, Rewards & Support' },
    },
    {
        path: 'refund-cancellation',
        loadComponent: () => import('./core/pages/footer-pages/refund-policy/refund-policy.component').then(m => m.RefundPolicyComponent),
        data: { seoFallbackTitle: 'Refund & Cancellation Policy | SuperMeApp' },
    },
    { path: 'refund-and-cancellation', redirectTo: 'refund-cancellation', pathMatch: 'full' },

    // FAQ (For Children) page - public
    {
        path: 'cfaq',
        loadComponent: () => import('./core/pages/footer-pages/faq-child/faq-child.component').then(m => m.FaqChildComponent),
    },

    // Child Safety page - public
    {
        path: 'child-safety',
        loadComponent: () => import('./core/pages/footer-pages/child-safety-page/child-safety-page.component').then(m => m.ChildSafetyPageComponent),
        data: { seoFallbackTitle: 'Child Safety Policy | SuperMeApp' },
    },
    {
        path: 'app/privacy-policy',
        loadComponent: () => import('./core/pages/footer-pages/child-safety-page/child-safety-page.component').then(m => m.ChildSafetyPageComponent),
        data: { seoFallbackTitle: 'Child Safety Policy | SuperMeApp' },
    },

    // Privacy Policy page - public
    {
        path: 'privacy-policy',
        loadComponent: () => import('./core/pages/footer-pages/privacy-policy-page/privacy-policy-page.component').then(m => m.PrivacyPolicyPageComponent),
        data: { seoFallbackTitle: 'Privacy Policy | SuperMeApp' },
    },
    {
        path: 'cookie-policy',
        loadComponent: () => import('./core/pages/footer-pages/cookie-policy/cookie-policy.component').then(m => m.CookiePolicyComponent),
        data: { seoFallbackTitle: 'Cookie Policy | SuperMeApp' },
    },
    // Old URL - redirect to the current one
    { path: 'privacy', redirectTo: 'privacy-policy', pathMatch: 'full' },

    // How It Works page - public
    {
        path: 'how-it-works',
        loadComponent: () => import('./core/pages/footer-pages/how-works-page/how-works-page.component').then(m => m.HowWorksPageComponent),
    },

    // Help Centre page - public
    {
        path: 'help',
        loadComponent: () => import('./core/pages/footer-pages/help-centre-page/help-centre-page.component').then(m => m.HelpCentrePageComponent),
    },

    // Pet Gallery page - public
    {
        path: 'pet-gallery',
        loadComponent: () => import('./core/pages/footer-pages/pet-gallery-page/pet-gallery-page.component').then(m => m.PetGalleryPageComponent),
    },

    // About Us) page - public
    // {
    //     path: 'about',
    //     loadComponent: () => import('./core/pages/footer-pages/company-page/company-page.component').then(m => m.CompanyPageComponent)
    // },

    // SuperMe About page - public
    {
        path: 'about',
        loadComponent: () => import('./core/pages/footer-pages/superme-about-page/superme-about-page.component').then(m => m.SupermeAboutPageComponent),
        data: { seoFallbackTitle: 'About SuperMeApp | Personal Growth & Productivity Platform' },
    },
    {
        path: 'meet-the-team',
        loadComponent: () => import('./core/pages/footer-pages/superme-about-page/superme-about-page.component').then(m => m.SupermeAboutPageComponent),
        data: { scrollToTeam: true, seoFallbackTitle: 'Meet the SuperMeApp Team | Evolved Wellness' },
    },

    // Blog page - public
    {
        path: 'blog',
        redirectTo: 'blogs',
        pathMatch: 'full',
    },

    // Terms of Use page - public
    {
        path: 'terms-of-use',
        loadComponent: () => import('./core/pages/footer-pages/terms-use/terms-use.component').then(m => m.TermsUseComponent),
        data: { seoFallbackTitle: 'Terms of Use | SuperMeApp' },
    },
    // Old URL - redirect to the current one
    { path: 'terms-use', redirectTo: 'terms-of-use', pathMatch: 'full' },

    // Upload Reel page - protected
    {
        path: 'reels/upload',
        loadComponent: () => import('./core/components/reel-section/upload-reel/upload-reel.component').then(m => m.UploadReelComponent),
        canActivate: [AuthGuard]
    },

    // All Reels page - protected
    {
        path: 'reels/all',
        loadComponent: () => import('./core/components/reel-section/all-reels/all-reels.component').then(m => m.AllReelsComponent),
        canActivate: [AuthGuard]
    },

    // Bookmarked Reels page - protected
    {
        path: 'reels/bookmarks',
        loadComponent: () => import('./core/components/reel-section/bookmark-reels/bookmark-reels.component').then(m => m.BookmarkReelsComponent),
        canActivate: [AuthGuard]
    },

    // Parent Dashboard - protected with role check
    {
        path: 'parent',
        loadComponent: () => import('./core/pages/parent-dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent),
        canActivate: [AuthGuard, DashboardRedirectGuard]
    },

    // Parent -> Coins page
    {
        path: 'parent/coins',
        loadComponent: () => import('./core/pages/parent-dashboard/coin-parent-page/coin-parent-page.component').then(m => m.CoinParentPageComponent),
        canActivate: [AuthGuard]
    },

    // Coin Pack Page - protected
    {
        path: 'coin-pack',
        loadComponent: () => import('./core/pages/parent-dashboard/coin-pack-page/coin-pack-page.component').then(m => m.CoinPackPageComponent),
        canActivate: [AuthGuard]
    },

    // ─── Landing Feature Pages (public) ───

    { path: 'habit-tracker', loadComponent: () => import('./landing/pages/grow/habit/page.component').then(m => m.HabitPageComponent) },
    { path: 'task-manager', loadComponent: () => import('./landing/pages/grow/task/page.component').then(m => m.TaskPageComponent) },
    { path: 'daily-journal', loadComponent: () => import('./landing/pages/grow/journal/page.component').then(m => m.JournalPageComponent) },
    { path: 'grow/habit', redirectTo: 'habit-tracker', pathMatch: 'full' },
    { path: 'habit', redirectTo: 'habit-tracker', pathMatch: 'full' },
    { path: 'task', redirectTo: 'task-manager', pathMatch: 'full' },
    { path: 'journal', redirectTo: 'daily-journal', pathMatch: 'full' },

    { path: 'routine-planner', loadComponent: () => import('./landing/pages/plan/planner/page.component').then(m => m.PlannerLandingPageComponent) },
    { path: 'productivity-calendar', loadComponent: () => import('./landing/pages/plan/calendar/page.component').then(m => m.CalendarPageComponent) },
    { path: 'note-taking-app', loadComponent: () => import('./landing/pages/plan/notes/page.component').then(m => m.NotesPageComponent) },
    { path: 'planner', redirectTo: 'routine-planner', pathMatch: 'full' },
    { path: 'calendar', redirectTo: 'productivity-calendar', pathMatch: 'full' },
    { path: 'notes', redirectTo: 'note-taking-app', pathMatch: 'full' },

    { path: 'quiz', loadComponent: () => import('./landing/pages/learn/quiz/page.component').then(m => m.QuizPageComponent) },
    { path: 'puzzle', loadComponent: () => import('./landing/pages/learn/puzzle/page.component').then(m => m.PuzzlePageComponent) },
    { path: 'blogs', loadComponent: () => import('./landing/pages/learn/article/page.component').then(m => m.ArticlePageComponent), data: { seoFallbackTitle: 'Blogs on Habits, Productivity and Growth | SuperMeApp' } },
    { path: 'articles', redirectTo: 'blogs', pathMatch: 'full' },
    { path: 'Articles', redirectTo: 'blogs', pathMatch: 'full' },
    { path: 'article', redirectTo: 'blogs', pathMatch: 'full' },
    { path: 'insights', loadComponent: () => import('./landing/pages/parenting/insights/page.component').then(m => m.InsightsLandingPageComponent) },
    { path: 'ios-app', loadComponent: () => import('./landing/pages/ios-app/page.component').then(m => m.IosAppFallbackPageComponent) },
    { path: 'master-class', loadComponent: () => import('./landing/pages/learn/academy/page.component').then(m => m.AcademyPageComponent) },
    { path: 'online-masterclasses', redirectTo: 'master-class', pathMatch: 'full' },
    { path: 'academy', redirectTo: 'master-class', pathMatch: 'full' },
    { path: 'reels', loadComponent: () => import('./landing/pages/learn/reels/page.component').then(m => m.ReelsPageComponent) },

    // Public PG / Hostel directory
    {
        path: 'find-pg-hostel',
        loadComponent: () => import('./landing/pages/pg-hostel/find/page.component').then(m => m.PgHostelFindPageComponent),
    },

    // Public EduHub aliases. Dedicated listing pages can replace these loaders later
    // without changing the published URLs.
    { path: 'find-an-academy', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-an-academy', title: 'Find an academy', singular: 'academy', plural: 'academies', intro: 'Discover academies that help learners build skills and grow with confidence.' } } },
    { path: 'find-a-academy', redirectTo: 'find-an-academy', pathMatch: 'full' },
    { path: 'find-events', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-an-event', title: 'Find events', singular: 'event', plural: 'events', intro: 'Explore events happening near you and discover something new.' } } },
    { path: 'find-work', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-workshop', title: 'Find workshops', singular: 'workshop', plural: 'workshops', intro: 'Find hands-on workshops for learning, creativity and growth.' } } },
    { path: 'find-a-counselor', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-counselor', title: 'Find a counselor', singular: 'counselor', plural: 'counselors', intro: 'Connect with trusted counselors for guidance and well-being support.' } } },
    { path: 'find-a-conuselor', redirectTo: 'find-a-counselor', pathMatch: 'full' },

    // ─── Shop (Student Store, protected) ───
    // NOTE ON ORDERING: Angular matches routes in array order. Within each segment-count
    // group below, literal/specific paths MUST come before generic parameterized ones
    // (e.g. 'shop/books' before 'shop/:category'), otherwise the generic route would
    // swallow the specific one.
    {
        path: 'shop',
        loadComponent: () => import('./core/pages/school-store/school-store.components').then(m => m.SchoolStoreComponent),
        canActivate: [AuthGuard]
    },

    // 2-segment routes under /shop/* — specific literals first, 'shop/:category' last
    {
        path: 'shop/school-details',
        loadComponent: () => import('./core/pages/school-store/institute-detail-fill/institute-detail-fill.components').then(m => m.InstituteDetailFillComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'shop/products',
        loadComponent: () => import('./core/pages/school-store/product-store/product-store.components').then(m => m.ProductStoreComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'shop/cart',
        loadComponent: () => import('./core/pages/school-store/product-store/my-cart/my-cart.components').then(m => m.MyCartComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'shop/orders',
        loadComponent: () => import('./core/pages/school-store/my-orders/my-orders.components').then(m => m.MyOrdersComponent),
        canActivate: [AuthGuard]
    },
    { path: 'shop/books', loadComponent: () => import('./landing/pages/shop/books/page.component').then(m => m.BooksPageComponent) },
    { path: 'shop/uniforms', loadComponent: () => import('./landing/pages/shop/uniforms/page.component').then(m => m.UniformsPageComponent) },
    { path: 'shop/accessories', loadComponent: () => import('./landing/pages/shop/accessories/page.component').then(m => m.AccessoriesPageComponent) },
    { path: 'shop/stationery', loadComponent: () => import('./landing/pages/shop/stationery/page.component').then(m => m.StationeryPageComponent) },
    { path: 'school-uniforms', loadComponent: () => import('./landing/pages/shop/uniforms/page.component').then(m => m.UniformsPageComponent) },
    { path: 'stationery', loadComponent: () => import('./landing/pages/shop/stationery/page.component').then(m => m.StationeryPageComponent) },
    { path: 'entrance-exam-books', loadComponent: () => import('./landing/pages/shop/books/page.component').then(m => m.BooksPageComponent) },
    { path: 'general-books', loadComponent: () => import('./landing/pages/shop/books/page.component').then(m => m.BooksPageComponent) },
    { path: 'find-a-book-store', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-bookstore', title: 'Find a book store', singular: 'book store', plural: 'book stores', intro: 'Find trusted book stores and discover your next great read.' } } },
    { path: 'find-second-hand-book', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-second-hand-book', title: 'Find second-hand books', singular: 'book', plural: 'books', intro: 'Browse approved pre-loved books near you and find the right book at a better price.', profileEnabled: false, rateSuffix: '' } } },
    { path: 'find-a-stationery-shop', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-stationary-shop', title: 'Find a stationery shop', singular: 'stationery shop', plural: 'stationery shops', intro: 'Find nearby stationery shops for school, art and everyday supplies.' } } },
    { path: 'find-a-sport-shop', loadComponent: () => import('./landing/pages/tutor/find/page.component').then(m => m.FindTutorPageComponent), data: { directory: { endpoint: 'find-a-sports-shop', title: 'Find a sports shop', singular: 'sports shop', plural: 'sports shops', intro: 'Discover sports shops for gear that keeps you active and ready to play.' } } },
    // Category-filtered product listing (was ?category= query param) — generic, must stay last in this group
    {
        path: 'shop/:category',
        loadComponent: () => import('./core/pages/school-store/product-store/product-store.components').then(m => m.ProductStoreComponent),
        canActivate: [AuthGuard]
    },

    // 3-segment routes under /shop/* — specific literals first, 'shop/:categoryId/:subCategory' last
    {
        path: 'shop/products/:id',
        loadComponent: () => import('./core/pages/school-store/product-store/product-detail/product-detail.components').then(m => m.ProductDetailComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'shop/checkout/address',
        loadComponent: () => import('./core/pages/school-store/address-input/address-input.components').then(m => m.AddressInputComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'shop/orders/:id',
        loadComponent: () => import('./core/pages/school-store/my-orders/order-details/order-details.component').then(m => m.OrderDetailsComponent),
        canActivate: [AuthGuard]
    },
    { path: 'shop/stationery/:id', loadComponent: () => import('./landing/pages/shop/stationery/product-detail.component').then(m => m.StationeryProductDetailComponent) },
    // Nested category/sub-category browsing (was /categories/:categoryId/sub-categories/:subCategory/sub-category1) — generic, must stay last in this group
    { path: 'shop/:categoryId/:subCategory', loadComponent: () => import('./landing/pages/shop/stationery/page.component').then(m => m.StationeryPageComponent) },

    // 4-segment route under /shop/*
    {
        path: 'shop/orders/:id/return-exchange',
        loadComponent: () => import('./core/pages/school-store/return&exchange/return-exchange.components').then(m => m.ReturnExchangeComponent),
        canActivate: [AuthGuard]
    },

    { path: 'contact-us', loadComponent: () => import('./landing/pages/contact-us/contact-us.component').then(m => m.ContactUsPageComponent), data: { seoFallbackTitle: 'Contact SuperMeApp | Support, Feedback & Help' } },
    { path: 'submit-an-ad', loadComponent: () => import('./landing/pages/submit-ad/submit-ad.component').then(m => m.SubmitAdPageComponent) },
    { path: 'list-your-business', redirectTo: 'advertise-with-us', pathMatch: 'full' },
    { path: 'advertise-with-us', loadComponent: () => import('./landing/pages/submit-ad/submit-ad.component').then(m => m.SubmitAdPageComponent) },
    { path: 'advertise-your-event', loadComponent: () => import('./landing/pages/submit-ad/submit-ad.component').then(m => m.SubmitAdPageComponent) },

    { path: '404', loadComponent: () => import('./core/pages/not-found.component').then(m => m.NotFoundComponent) },

    // Do not silently redirect unmatched client-side navigation home.
    {
        path: '**',
        loadComponent: () => import('./core/pages/not-found.component').then(m => m.NotFoundComponent)
    }
];

// Attach the SEO resolver to every public (logged-out) route so the router waits for the
// real metatags to load before rendering, instead of shipping fallback tags. Routes gated
// by AuthGuard are only ever reached by authenticated users and aren't crawled/indexed, so
// they're skipped to avoid firing the metatags API unnecessarily.
export const routes: Routes = routeDefinitions.map(route => {
    if (['stationery', 'school-uniforms', 'entrance-exam-books', 'general-books', 'shop/products'].includes(route.path || '')) {
        route = { ...route, canActivate: [...(route.canActivate || []), legacyShopRedirect] };
    }
    const isPublic = route.path !== '**' && route.path !== '404' && route.redirectTo === undefined && !route.canActivate?.includes(AuthGuard);
    return isPublic
        ? { ...route, resolve: { ...(route.resolve || {}), seo: seoResolver } }
        : route;
});
