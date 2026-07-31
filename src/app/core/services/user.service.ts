import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StoredGender } from '../models/gender.model';
import { MoodService } from './mood.service';

export interface UserStats {
  coins: number;
  streaks: number;
  days: number;
  badges: number;
}

export interface UserProfile {
  userId?: number;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  dob?: string;
  gender?: StoredGender;
  avatarUrl?: string;
  avatarName?: string;
  pet?: string;
  relationship?: 'CHILD' | 'PARENT' | 'SELF';
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  // BehaviorSubject to hold the current user profile
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(this.loadUserFromStorage());
  public userProfile$ = this.userProfileSubject.asObservable();

  // BehaviorSubject to hold the current user stats (coins/streaks/days/badges),
  // seeded from the same localStorage cache saveUserStats()/getUserStats() already use.
  // Lets multiple consumers (e.g. the website shell nav) share one fetch instead of
  // each re-calling the vibes/display API independently.
  private statsSubject = new BehaviorSubject<UserStats | null>(this.getUserStats());
  public stats$: Observable<UserStats | null> = this.statsSubject.asObservable();
  private statsRefresh$: Observable<UserStats | null> | null = null;

  constructor(private http: HttpClient, private moodService: MoodService) {
    // Initialize user profile from storage
    this.loadUserFromStorage();
  }

  /**
   * Load user profile from localStorage
   */
  private loadUserFromStorage(): UserProfile | null {
    try {
      const storedUser = localStorage.getItem('user_profile');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Error loading user profile from storage:', e);
    }
    return null;
  }

  /**
   * Save user profile to localStorage
   */
  private saveUserToStorage(profile: UserProfile): void {
    try {
      localStorage.setItem('user_profile', JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving user profile to storage:', e);
    }
  }

  /**
   * Get current user profile
   */
  getUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Get user profile as observable
   */
  getUserProfile$(): Observable<UserProfile | null> {
    return this.userProfile$;
  }

  /**
   * Update user profile
   */
  updateUserProfile(profile: Partial<UserProfile>): void {
    const currentProfile = this.userProfileSubject.value || {} as UserProfile;
    const updatedProfile = { ...currentProfile, ...profile };

    // Whenever dob changes but the caller didn't also pass a fresh `age`,
    // recompute it here so this cache never keeps serving a stale age
    // (this is a second, independent store from AuthService's user_data).
    if (profile.dob !== undefined && profile.age === undefined) {
      const computedAge = this.calculateAgeFromDob(profile.dob);
      if (computedAge !== null) updatedProfile.age = computedAge;
    }

    this.userProfileSubject.next(updatedProfile);
    this.saveUserToStorage(updatedProfile);
  }

  private calculateAgeFromDob(dob: string): number | null {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    return calculatedAge > 0 ? calculatedAge : null;
  }

  /**
   * Set complete user profile
   */
  setUserProfile(profile: UserProfile): void {
    this.userProfileSubject.next(profile);
    this.saveUserToStorage(profile);
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(): string {
    const profile = this.userProfileSubject.value;
    if (profile?.avatarUrl) {
      return profile.avatarUrl;
    }
    // Return default avatar based on gender or a generic default
    if (profile?.gender === 'male') {
      return 'assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
    } else if (profile?.gender === 'female') {
      return 'assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png';
    }
    return 'assets/app-assets/Default-avatar-home.svg';
  }

  /**
   * Update user avatar
   */
  updateUserAvatar(avatarUrl: string, avatarName?: string): void {
    this.updateUserProfile({ avatarUrl, avatarName });
  }

  /**
   * Get user name
   */
  getUserName(): string {
    return this.userProfileSubject.value?.name || 'User';
  }

  /**
   * Clear user profile (on logout)
   */
  clearUserProfile(): void {
    this.userProfileSubject.next(null);
    try {
      localStorage.removeItem('user_profile');
      localStorage.removeItem('user_stats');
    } catch (e) {
      console.error('Error clearing user profile:', e);
    }
  }

  /**
   * Save user stats to localStorage
   */
  saveUserStats(stats: UserStats): void {
    try {
      localStorage.setItem('user_stats', JSON.stringify(stats));
      console.log('[UserService] Saved user stats to localStorage:', stats);
    } catch (e) {
      console.error('[UserService] Error saving user stats:', e);
    }
    this.statsSubject.next(stats);
  }

  /**
   * Get user stats from localStorage
   */
  getUserStats(): UserStats | null {
    try {
      const stats = localStorage.getItem('user_stats');
      if (stats) {
        return JSON.parse(stats);
      }
    } catch (e) {
      console.error('[UserService] Error loading user stats:', e);
    }
    return null;
  }

  /**
   * Fetch fresh stats from the vibes/display API and share the result via
   * stats$. Concurrent callers (e.g. the dashboard page and the persistent
   * website shell both mounting on the same load) ride the same in-flight
   * request instead of firing duplicate HTTP calls.
   */
  refreshStats(): Observable<UserStats | null> {
    if (this.statsRefresh$) {
      return this.statsRefresh$;
    }

    this.statsRefresh$ = this.moodService.getVibesDisplay().pipe(
      tap(data => {
        if (data && data.length > 0) {
          const userStats = data[0];
          const stats: UserStats = {
            coins: userStats.coins || 0,
            streaks: userStats.streak || 0,
            days: userStats.trophies || 0,
            badges: userStats.badges || 0
          };
          this.saveUserStats(stats);
        }
      }),
      map(() => this.statsSubject.value),
      finalize(() => { this.statsRefresh$ = null; }),
      shareReplay(1)
    );

    return this.statsRefresh$;
  }

  /**
   * Fetch user profile from API
   */
  fetchUserProfileFromAPI(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`);
  }

  /**
   * Update user profile on API
   */
  updateUserProfileOnAPI(userId: number, profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, profile);
  }

  /**
   * Load user profile from signup session storage
   */
  loadFromSignupSession(): void {
    try {
      const signupProfile = sessionStorage.getItem('signup_profile');
      const signupAvatar = sessionStorage.getItem('signup_avatar');
      const signupRole = sessionStorage.getItem('signup_role');

      if (signupProfile) {
        const profile = JSON.parse(signupProfile);
        const userProfile: UserProfile = {
          name: profile.name,
          dob: profile.dob ? new Date(profile.dob).toISOString() : undefined,
          gender: profile.gender,
          avatarName: signupAvatar ? `avatar${signupAvatar}` : undefined,
          avatarUrl: profile.avatar ? this.getAvatarUrlFromSelection(profile.avatar, profile.gender) : undefined,
          relationship: signupRole ? signupRole.toUpperCase() as 'CHILD' | 'PARENT' | 'SELF' : undefined
        };

        this.setUserProfile(userProfile);
      }
    } catch (e) {
      console.error('Error loading from signup session:', e);
    }
  }

  /**
   * Get avatar URL from avatar selection number
   */
  private getAvatarUrlFromSelection(avatarNumber: number, gender?: string): string {
    const parsedAvatarNumber = Number(avatarNumber);
    if (!Number.isInteger(parsedAvatarNumber) || parsedAvatarNumber < 1 || parsedAvatarNumber > 12) {
      return '/assets/app-assets/Default-avatar-home.svg';
    }

    const isFemaleAvatar = parsedAvatarNumber <= 6;
    const avatarIndex = isFemaleAvatar ? parsedAvatarNumber : parsedAvatarNumber - 6;
    const genderPrefix = isFemaleAvatar ? 'Female' : 'Male';
    return `/assets/Images-Transparent/Image-Onboarding-Avatar-${genderPrefix}${avatarIndex}.png`;
  }
}
