import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
// local components
import { ProfileContentCardComponent } from './profile-content-card/profile-content-card.component';
// internal components (no modal usage here)
import { AuthService, FamilyMember } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { MoodService } from '../../services/mood.service';
import { ChildSelfImageService } from '../../services/child-self-image.service';
import { ParentImageService } from '../../services/parent-image.service';
import { ParentDataService } from '../../services/parent-data.service';
import { VibesDisplayResponse } from '../../models/mood.model';

@Component({
    selector: 'user-profile-sidebar',
    standalone: true,
    imports: [CommonModule, IonicModule, ProfileContentCardComponent],
    templateUrl: './user-profile-sidebar.component.html',
    styleUrls: ['./user-profile-sidebar.component.scss']
})
export class UserProfileSidebarComponent implements OnInit, OnChanges {
    @Input() user: any = {};

    // Local user avatar URL
    userAvatarUrl: string = '/assets/Icons-Neutral/Child Avatar.png';
    // Avatar image name (e.g., "Avatar 3") coming from login response
    avatarImageName: string | null = null;

    @Input() userCoins: number | string = 0;
    @Input() userStreaks: number | string = 0;
    @Input() userDays: number | string = 0;
    @Input() userBadges: number | string = 0;

    @Output() edit = new EventEmitter<void>();

    @Output() logout = new EventEmitter<void>();

    // Emit when user requests password/security panel
    @Output() password = new EventEmitter<void>();

    // Generic selection emitter for parent-driven UI (e.g., 'edit', 'password', 'pet')
    @Output() select = new EventEmitter<string>();

    /** Avatar picker state and events */
    showAvatarPicker: boolean = false;

    // list of avatar image URLs — all 12 options (6 female + 6 male)
    avatars: string[] = [
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png',
        '/assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png',
    ];

    @Output() avatarSelected = new EventEmitter<string>();

    // currently selected profile item key (used to mark active card)
    selectedKey: string | null = null;

    // popup state for confirming logout
    showLogoutPopup: boolean = false;

    // Children from vibes display API (for parent profile view)
    apiChildren: VibesDisplayResponse[] = [];
    familyMembers: FamilyMember[] = [];

    constructor(
        private router: Router,
        private authService: AuthService,
        private userService: UserService,
        private moodService: MoodService,
        private childSelfImageService: ChildSelfImageService,
        public parentImageService: ParentImageService,
        private parentDataService: ParentDataService,
        private el: ElementRef
    ) {
        // Subscribe to user profile changes
        this.userService.getUserProfile$().subscribe(profile => {
            if (profile) {
                this.userAvatarUrl = this.userService.getUserAvatarUrl();

                // Also resolve avatar from service for child/self users
                const userData = localStorage.getItem('user_data');
                if (userData) {
                    try {
                        const parsedData = JSON.parse(userData);
                        const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
                        if (resolved.url) this.userAvatarUrl = resolved.url;
                        if (resolved.alt) this.avatarImageName = resolved.alt;
                    } catch (e) {
                        // ignore
                    }
                }

                // Merge service-provided avatar into local `user` object.
                if (!this.user || Object.keys(this.user).length === 0) {
                    this.user = {
                        name: profile.name,
                        age: profile.age,
                        avatarUrl: this.userAvatarUrl
                    };
                } else {
                    if (!this.user.avatarUrl || this.user.avatarUrl === '') {
                        this.user = { ...this.user, avatarUrl: this.userAvatarUrl };
                    }
                }
            }
        });
    }

    ngOnInit() {
        // Load user data from localStorage (set during login)
        this.loadUserDataFromStorage();
        // Load user stats from localStorage first, then API if not available
        this.loadUserStatsFromStorage();

        this.userService.getUserProfile$().subscribe(profile => {
            if (profile && this.user) {
                this.user.name = profile.name || 'User';
            }
        });

        if (this.isParent()) {
            this.apiChildren = this.parentDataService.children;
            if (!this.apiChildren.length) {
                this.moodService.getParentVibesDisplay().subscribe({
                    next: (vibes) => {
                        if (vibes?.length) {
                            this.parentDataService.setChildren(vibes);
                            this.apiChildren = vibes;
                        }
                    },
                    error: () => {}
                });
            }
            this.authService.getFamilyDetails().subscribe({
                next: (res) => {
                    this.familyMembers = res?.family?.members ?? [];
                },
                error: () => {}
            });
        }
    }

    getChildAvatarUrl(child: VibesDisplayResponse): string {
        const resolved = this.childSelfImageService.resolveAvatarFromUser(child);
        return resolved.url || '/assets/Icons-Neutral/Child Avatar.png';
    }

    getChildAge(child: VibesDisplayResponse): number | null {
        const match = this.familyMembers.find(
            m => m.userId === (child.assignedTo ?? child.userId) || m.name === child.userName
        );
        return match?.age ?? null;
    }

    /**
     * Load user data from localStorage and map to component properties
     */
    private loadUserDataFromStorage(): void {
        try {
            const userData = localStorage.getItem('user_data');
            if (userData) {
                const parsedData = JSON.parse(userData);
                console.log('[UserProfileSidebar] Loaded user_data from localStorage:', parsedData);

                // Use API avatar URL stored in localStorage, fall back to local resolution
                const apiAvatarUrl = parsedData.avatar?.url;
                const resolved = this.childSelfImageService.resolveAvatarFromUser(parsedData);
                this.userAvatarUrl = apiAvatarUrl || resolved.url || this.userAvatarUrl;
                if (resolved.alt) this.avatarImageName = resolved.alt;

                // Map user basic info
                this.user = {
                    ...this.user,
                    name: parsedData.name || 'User',
                    email: parsedData.email,
                    phone: parsedData.phone,
                    age: parsedData.age,
                    gender: parsedData.gender,
                    avatarUrl: this.userAvatarUrl,
                    relationship: parsedData.relationship
                };

                console.log('[UserProfileSidebar] Mapped user info:', {
                    name: this.user.name,
                    age: this.user.age,
                    avatarUrl: this.userAvatarUrl,
                    avatarImageName: this.avatarImageName
                });
            }
        } catch (e) {
            console.error('[UserProfileSidebar] Error loading user_data from localStorage:', e);
        }
    }

    /**
     * Load user statistics from localStorage first, then fetch from API if not available
     */
    private loadUserStatsFromStorage(): void {
        // Try to load from localStorage first
        const cachedStats = this.userService.getUserStats();

        if (cachedStats) {
            // Use cached stats
            this.userCoins = cachedStats.coins;
            this.userStreaks = cachedStats.streaks;
            this.userDays = cachedStats.days;
            this.userBadges = cachedStats.badges;

            console.log('[UserProfileSidebar] Loaded stats from localStorage:', cachedStats);
        } else {
            // No cached stats, fetch from API
            console.log('[UserProfileSidebar] No cached stats, fetching from API...');
            this.loadUserStatsFromAPI();
        }
    }

    /**
     * Load user statistics from the vibes/display endpoint and cache them
     */
    private loadUserStatsFromAPI(): void {
        this.moodService.getVibesDisplay().subscribe({
            next: (data: VibesDisplayResponse[]) => {
                // The API returns an array, get the first item (current user's data)
                if (data && data.length > 0) {
                    const userStats = data[0];
                    this.userCoins = userStats.coins || 0;
                    this.userStreaks = userStats.streak || 0;
                    this.userDays = userStats.trophies || 0;
                    this.userBadges = userStats.badges || 0;

                    // Cache the stats in localStorage
                    this.userService.saveUserStats({
                        coins: this.userCoins as number,
                        streaks: this.userStreaks as number,
                        days: this.userDays as number,
                        badges: this.userBadges as number
                    });

                    console.log('[UserProfileSidebar] Loaded and cached stats from API:', {
                        coins: this.userCoins,
                        streaks: this.userStreaks,
                        days: this.userDays,
                        badges: this.userBadges
                    });
                }
            },
            error: (error) => {
                console.error('[UserProfileSidebar] Failed to load user stats:', error);
                // Keep default values (0) on error
            }
        });
    }

    @HostListener('document:click', ['$event'])
    handleDocumentClick(event: Event) {
        if (!this.showAvatarPicker) return;
        const target = event.target as Node;
        if (this.el && !this.el.nativeElement.contains(target)) {
            this.showAvatarPicker = false;
        }
    }

    onChangePet() {
        this.selectedKey = 'pet';
        // Tell parent to open the pet selection panel inside profile-main
        this.select.emit('pet');
    }

    onEdit() {
        this.selectedKey = 'edit';
        this.edit.emit();
        this.select.emit('edit');
    }

    toggleAvatarPicker(event?: Event) {
        if (event) event.stopPropagation();
        this.showAvatarPicker = !this.showAvatarPicker;
    }

    selectAvatar(url: string) {
        // Update local user model if present
        if (this.user) {
            this.user.avatarUrl = url;
        }
        this.avatarSelected.emit(url);
        // close picker after selection
        this.showAvatarPicker = false;
    }

    onPassword() {
        this.selectedKey = 'password';
        // Notify parent to switch UI to password/security panel.
        // Parent should set its `selectedItem = 'password'` to render the password form inside profile-main.
        this.password.emit();
        // backward-compatible generic selection
        this.select.emit('password');
    }

    onNotifications() {
        this.selectedKey = 'notifications';
        this.select.emit('notifications');
    }

    onRefer() {
        this.selectedKey = 'refer';
        this.select.emit('refer');
    }

    onMyFamily() {
        this.selectedKey = 'family';
        this.select.emit('family');
    }

    onParentalControl() {
        this.selectedKey = 'parental';
        this.select.emit('parental');
    }

    onFeedback() {
        this.selectedKey = 'feedback';
        // navigate to the feedback suggestion page
        this.select.emit('feedback');
    }

    onHelpSupport() {
        this.selectedKey = 'help';
        // navigate to the help & support page
        this.select.emit('help');
    }

    onOurPolicies() {
        this.selectedKey = 'policies';
        // navigate to the Our Policies page
        this.select.emit('policies');
    }

    onDeleteMyData() {
        this.selectedKey = 'delete';
        this.select.emit('delete');
    }

    onMembership() {
        this.selectedKey = 'membership';
        this.select.emit('membership');
    }

    onLogout() {
        this.logout.emit();
    }

    openLogoutPopup() {
        this.showLogoutPopup = true;
    }

    confirmLogout() {
        // Close the popup first for smooth transition
        this.showLogoutPopup = false;

        // Clear authentication data
        this.authService.logout();

        // Emit logout event for parent components if needed
        this.onLogout();
    }

    closeLogoutPopup() {
        this.showLogoutPopup = false;
    }

    /**
     * Get first initial from name
     */
    getInitial(name: string | undefined): string {
        return (name || '?').trim().charAt(0).toUpperCase();
    }

    /**
     * Check if user is female based on gender
     */
    isFemale(user: any): boolean {
        if (!user) return false;
        const g = (user.gender || '').toString().toLowerCase();
        return g === 'female' || g === 'f';
    }

    /**
     * Check if user is parent
     */
    isParent(): boolean {
        return this.user?.relationship === 'PARENT';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['user'] && this.user) {
            const u = this.user || {};
            if (u.coins != null) this.userCoins = u.coins;
            if (u.streaks != null) this.userStreaks = u.streaks;
            if (u.days != null) this.userDays = u.days;
            if (u.badges != null) this.userBadges = u.badges;
        }
    }
}
