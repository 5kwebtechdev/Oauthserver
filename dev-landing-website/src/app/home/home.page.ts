import { Component, OnInit, ChangeDetectorRef, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import gsap from 'gsap';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { forkJoin, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../core/services/course.service';
import { Course } from '../core/models/course.model';
import { environment } from '../../environments/environment';
import { FooterComponent } from '../core/components/footer/footer.component';
import { SupermeCardHeaderComponent } from '../core/components/superme-navigator/superme-card-header/superme-card-header.component';
import { ActivityDashboardComponent } from '../core/pages/activity-section/activity-dashboard/activity-dashboard.component';
import { ActivityDetailComponent } from '../core/pages/activity-section/activity-detail/activity-detail.component';
import { Activity } from '../core/pages/activity-section/activity.types';
import { ActivityCalendarComponent } from '../core/pages/activity-section/activity-calendar/activity-calendar.component';
import { ActivitySectionModule } from '../core/pages/activity-section/activity-section.module';
import { TutorDashboardComponent } from '../core/pages/tutor-section/tutor-dashboard/tutor-dashboard.component';
import { normalizeTutor, ITutor } from '../core/models/tutor.model';
import { TUTORS } from '../core/pages/tutor-section/tutors.data';
import { SupermeButtonComponent } from '../core/components/superme-button/superme-button.component';
import { ActivityCardComponent } from '../core/components/quiz-puzzle-card/activity-card.component';
import { SupermeHomeHeaderComponent } from '../core/components/superme-home-header';
import { MoodSelectorComponent } from '../core/components/mood-selector/mood-selector.component';
import { JournalDashboardComponent } from '../core/pages/journal-section/journal-dashboard/journal-dashboard.component';
import { MoodService } from '../core/services/mood.service';
import { UserService } from '../core/services/user.service';
import { AuthService } from '../core/services/auth.service';
import { SupremePetBubbleComponent } from '../core/components/superme-pet-bubble/superme-pet-bubble.component';
import { SupremePetComponent } from '../core/components/superme-pet/superme-pet.component';
import { AdSliderComponent } from '../core/components/ad-slider/ad-slider.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        FooterComponent,
        PublicNavbarComponent,
        TutorDashboardComponent,
        SupermeButtonComponent,
        JournalDashboardComponent,
        ActivityCardComponent,
        SupermeHomeHeaderComponent,
        MoodSelectorComponent,
        SupremePetComponent,
        ActivityDashboardComponent,
        ActivityDetailComponent,
        ActivityCalendarComponent,
        ActivitySectionModule,
        AdSliderComponent
    ],
    templateUrl: './home.page.html',
    styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  /** Home page only teases this many masterclass courses; "View all" leads to the full list. */
  private static readonly MASTERCLASS_PREVIEW_COUNT = 3;

  @ViewChild('pandaRef', { read: ElementRef }) pandaRef!: ElementRef;
  @ViewChild('bubbleRef', { read: ElementRef }) bubbleRef!: ElementRef;
  @ViewChild('moodRef',  { read: ElementRef }) moodRef!: ElementRef;
    // simple demo data used by the template
    tasksCount = 5;
    habitsCount = 2;
    // value from 0..100
    progressPercent = 18;
    // current selected mood (bound to mood-selector)
    currentMood: string | null = null;

    // demo content for Day at a Glance
    habits = [
        { title: 'Reading', time: '8.00-9.15', tag: 'Fitness', points: 14, coins: 200 },
        { title: 'Exercising', time: '11.00-13.00', tag: 'Fitness', points: 0, coins: 0 },
        { title: 'Exercising', time: '11.00-13.00', tag: 'Fitness', points: 0, coins: 0 }
    ];

    tasks = [
        { title: 'Reading', time: '8.00-9.15', tag: 'Fitness' },
        { title: 'Exercising', time: '11.00-13.00', tag: 'Fitness' },
        { title: 'Exercising', time: '11.00-13.00', tag: 'Fitness' }
    ];

    timetable = [
        { title: 'Maths Period', time: '11.00-13.00', tag: 'School' },
        { title: 'Maths Period', time: '11.00-13.00', tag: 'School' },
        { title: 'Maths Period', time: '11.00-13.00', tag: 'School' }
    ];

    // discover/play activities — populated from API
    activities: any[] = [];
    discoverLoading = true;

    // HTML subtitles for headers (used to preserve <br> and span.dot markup)
    discoverSubtitleHtml: string = 'Dive into brain-teasing quizzes, mind-bending puzzles,<br>captivating stories, and insightful reads.';
    coursesSubtitleHtml: string = 'Real lessons <span class="dot">·</span> Life ready <span class="dot">·</span> Future strong';

    // demo reels / made-by-kids content
    reels = [
        { image: '/assets/images/Image-Reel-Random.jpg', tag: 'Science Wonders', author: 'SparkleKid', title: 'Epic Volcano Eruption Experiment!', duration: '20 sec', likes: '10K' },
        { image: '/assets/images/Image-Reel-Random.jpg', tag: 'Science Wonders', author: 'SparkleKid', title: 'Epic Volcano Eruption Experiment!', duration: '20 sec', likes: '10K' },
        { image: '/assets/images/Image-Reel-Random.jpg', tag: 'Science Wonders', author: 'SparkleKid', title: 'Epic Volcano Eruption Experiment!', duration: '20 sec', likes: '10K' },
        { image: '/assets/images/Image-Reel-Random.jpg', tag: 'Science Wonders', author: 'SparkleKid', title: 'Epic Volcano Eruption Experiment!', duration: '20 sec', likes: '10K' }
    ];


    // Masterclass courses shown in the "Life Skills" section - merged across
    // every category, see loadMasterclassCourses().
    masterclassCourses: Course[] = [];
    coursesLoading = true;
    coursesError: string | null = null;

    // simple carousel state for tutors (show 3 at a time)
    currentStart = 0;
    // tutors shown on homepage (shared demo data)
    tutors: ITutor[] = TUTORS.map(normalizeTutor);

    // flags to control homepage alternate views
    showDayView = false;
    showActivityView = false;
    showCalendarView = false;
    // show a temporary modal when a user just joined a family
    showFamilyConnectedModal = false;
    familyConnectedRole: string | null = null;
    // currently selected habit when rendering the inline habit detail
    selectedActivity: Activity | null = null;

    prev() {
        this.currentStart = Math.max(0, this.currentStart - 3);
    }

    next() {
        this.currentStart = Math.min(this.tutors.length - 3, this.currentStart + 3);
    }

    onMoodChange(value: string | null) {
        this.currentMood = value;
        console.log('[HomePage] Mood changed:', value);
    }

    onViewProfile(tutor: any) {
        // use name as a simple id/slug for demo - in production use tutor.id
        const id = (tutor.name || 'tutor').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        this.router.navigate(['/tutor', id], { state: { tutor } });
    }

    private routerEventsSub?: Subscription;

    constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private http: HttpClient, private userService: UserService, private authService: AuthService, private courseService: CourseService) { }

    ngAfterViewInit(): void {
        setTimeout(() => this.animatePanda(), 300);
    }

    private animatePanda(): void {
        if (!this.pandaRef?.nativeElement) return;
        const panda = this.pandaRef.nativeElement;
        const bubble = this.bubbleRef?.nativeElement;

        const mood = this.moodRef?.nativeElement;

        const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                // Continuous gentle idle float starts after walk-in finishes
                gsap.to(panda, {
                    y: -10,
                    duration: 2,
                    ease: 'sine.inOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        // Panda slides in from left
        tl.fromTo(panda, { x: -200, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0 });

        // Bubble slides in from left slightly after panda starts
        if (bubble) {
            tl.fromTo(bubble,
                { x: -60, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
                '-=0.5'
            );
        }

        // Mood section slides in from right
        if (mood) {
            tl.fromTo(mood,
                { x: 80, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
                '-=0.6'
            );
        }

        // Small bounce settle
        tl.to(panda, { y: -6, duration: 0.4, ease: 'sine.inOut' })
          .to(panda, { y: 0,  duration: 0.4, ease: 'sine.inOut' });
    }

    ngOnInit(): void {
        this.loadDiscoverContent();
        this.loadMasterclassCourses();
        // Listen for query params and toggle alternate homepage views (same behavior as day view)
        this.route.queryParams.subscribe(params => {
            // Log params so we can debug cases where the query param isn't propagated as expected
            console.log('[HomePage] queryParams', params);
            this.updateViewFlagsFromParams(params);
        });

        // Also listen to router navigation end events and re-evaluate flags from the root snapshot.
        // This ensures we catch query param updates performed by other components after initial load.
        this.routerEventsSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
            const rootParams = this.router.routerState.snapshot.root?.queryParams || {};
            console.log('[HomePage] NavigationEnd root queryParams', rootParams);
            this.updateViewFlagsFromParams(rootParams);
        });
    }

    startCourse(id: number): void {
        this.router.navigate(['/masterclass/course', id]);
    }

    /** Loads every masterclass category's courses and merges them into one list. Bound to the retry button too. */
    loadMasterclassCourses(): void {
        this.coursesLoading = true;
        this.coursesError = null;
        const age = this.getUserAge();

        this.courseService.getAllCoursesForAge(age).subscribe({
            next: (courses) => {
                // Home page only teases a handful - "View all" leads to the full list.
                this.masterclassCourses = courses.slice(0, HomePage.MASTERCLASS_PREVIEW_COUNT);
                this.coursesLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('[HomePage] Failed to load masterclass courses:', err);
                this.coursesError = err?.message || 'Unable to load courses.';
                this.coursesLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private getUserAge(): number {
        try {
            const raw = localStorage.getItem('user_data');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.age != null) return Number(parsed.age);
            }
        } catch { /* ignore */ }
        return this.userService.getUserProfile()?.age ?? 12;
    }

    private loadDiscoverContent(): void {
        const age = this.getUserAge();
        forkJoin({
            challenges: this.http.get<any>(`${environment.apiUrl}/challenges?age=${age}`),
            articles: this.http.get<any>(`${environment.apiUrl}/articles?age=${age}`)
        }).subscribe({
            next: ({ challenges, articles }) => {
                const challengeList: any[] = challenges?.data?.challenges
                    ?? challenges?.data?.content
                    ?? challenges?.data
                    ?? challenges?.challenges
                    ?? (Array.isArray(challenges) ? challenges : []);

                const articleList: any[] = articles?.data?.articles
                    ?? articles?.data?.content
                    ?? articles?.data
                    ?? articles?.articles
                    ?? (Array.isArray(articles) ? articles : []);

                const mappedChallenges = challengeList.slice(0, 3).map((c: any) => ({
                    id: c.challengeId || c.id,
                    title: c.title || c.name || '',
                    type: 'Challenge',
                    desc: c.description || c.summary || c.desc || '',
                    image: c.thumbnailImageUrl || c.thumbnailUrl || c.imageUrl || c.thumbnail || c.image || '',
                    diff: c.difficulty || c.level || 'Medium',
                    coins: c.coins ?? c.coinReward ?? 0,
                    trophies: c.trophies ?? c.xp ?? 0,
                    timeDuration: c.timeDuration || ''
                }));

                const mappedArticles = articleList.slice(0, 3).map((a: any) => ({
                    id: a.id,
                    title: a.title || a.name || '',
                    type: 'Article',
                    slug: a.slug,
                    tags: a.tags,
                    desc: a.description || a.summary || a.excerpt || a.desc || '',
                    image: a.thumbnailUrl || a.imageUrl || a.thumbnail || a.image || '',
                    diff: a.difficulty || a.level || 'Easy',
                    coins: a.coins ?? a.coinReward ?? 0,
                    trophies: a.trophies ?? a.xp ?? 0,
                    timeDuration: a.durationMinutes?.toString() || a.timeDuration || ''
                }));

                this.activities = [...mappedChallenges, ...mappedArticles];
                this.discoverLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('[HomePage] Failed to load discover content:', err);
                this.discoverLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    ngOnDestroy(): void {
        if (this.routerEventsSub) this.routerEventsSub.unsubscribe();
    }

    private updateViewFlagsFromParams(params: any) {
        const snapshotView = this.route.snapshot?.queryParams?.['view'];
        const rootSnapshotView = this.route.root?.snapshot?.queryParams?.['view'];

        this.showDayView = params['view'] === 'day' || snapshotView === 'day' || rootSnapshotView === 'day';
        // treat both 'activity-page' and 'activity-detail' as the inline activity view
        this.showActivityView = params['view'] === 'activity-page' || params['view'] === 'activity-detail' || snapshotView === 'activity-page' || snapshotView === 'activity-detail' || rootSnapshotView === 'activity-page' || rootSnapshotView === 'activity-detail';
        this.showCalendarView = params['view'] === 'month' || snapshotView === 'month' || rootSnapshotView === 'month';

        console.log('[HomePage] flags', { showDayView: this.showDayView, showActivityView: this.showActivityView, showCalendarView: this.showCalendarView });

        // Show connected popup when joining flow reports success via query param
        if (params['joined']) {
            this.familyConnectedRole = params['joined'];
            // show the popup only for child/parent expected values
            this.showFamilyConnectedModal = params['joined'] === 'child' || params['joined'] === 'parent';
        }

        // If the habit view is active, try to read any navigation state that carried a habit object
        if (this.showActivityView) {
            // Prefer the Router navigation extras state when available, fall back to history.state
            const nav = (this.router as any).getCurrentNavigation ? (this.router as any).getCurrentNavigation() : null;
            const state = nav && nav.extras && nav.extras.state ? nav.extras.state : (window && (window as any).history ? (window as any).history.state : null);
            this.selectedActivity = state && state.activity ? state.activity : this.selectedActivity;
        }

        // Force a change detection pass to ensure the template reflects the updated flags
        try {
            this.cdr.detectChanges();
        } catch (e) {
            console.warn('[HomePage] detectChanges failed', e);
        }
    }

    closeFamilyConnectedModal() {
        this.showFamilyConnectedModal = false;
        this.familyConnectedRole = null;
        try {
            // remove the joined query param
            this.router.navigate([], { relativeTo: this.route, queryParams: { joined: null }, queryParamsHandling: 'merge' });
        } catch (e) {
            console.warn('[HomePage] failed to clear joined query param', e);
        }
    }

    openTutors() {
        this.router.navigate(['/home/education']);
    }

    openReels() {
        this.router.navigate(['/home/reels']);
    }    /** Open activity view on the homepage (sets ?view=activity) */
    openActivityView(activity?: Activity | null) {
        // Open inline and set the query param so the URL becomes '/?view=activity-detail'
        this.showActivityView = true;
        this.selectedActivity = activity || null;

        try {
            // update the URL to include the view query param and carry the activity in navigation state
            this.router.navigate([], { relativeTo: this.route, queryParams: { view: 'activity-detail' }, queryParamsHandling: 'merge', state: activity ? { activity } : undefined });
        } catch (e) {
            // ignore navigation errors — UI already updated
            console.warn('[HomePage] navigate to set view failed', e);
        }
    }

    /** Close activity view on the homepage (remove ?view=activity) */
    closeActivityView() {
        // Close the inline activity detail and clear selection, also remove the view query param
        this.showActivityView = false;
        this.selectedActivity = null;
        try {
            this.router.navigate([], { relativeTo: this.route, queryParams: { view: null }, queryParamsHandling: 'merge' });
        } catch (e) {
            console.warn('[HomePage] failed to remove view query param', e);
        }
    }

    /** Close calendar view on the homepage (remove ?view=month) */
    closeCalendarView() {
        this.router.navigate([], { relativeTo: this.route, queryParams: { view: null }, queryParamsHandling: 'merge' });
    }
}
