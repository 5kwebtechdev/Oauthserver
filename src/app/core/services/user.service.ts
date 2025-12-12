import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  userId?: number;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  dob?: string;
  gender?: 'male' | 'female';
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

  constructor(private http: HttpClient) {
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

    this.userProfileSubject.next(updatedProfile);
    this.saveUserToStorage(updatedProfile);
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
      return '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
    } else if (profile?.gender === 'female') {
      return '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png';
    }
    return '/assets/app-assets/Default-avatar-home.svg';
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
  saveUserStats(stats: { coins: number; streaks: number; days: number; badges: number }): void {
    try {
      localStorage.setItem('user_stats', JSON.stringify(stats));
      console.log('[UserService] Saved user stats to localStorage:', stats);
    } catch (e) {
      console.error('[UserService] Error saving user stats:', e);
    }
  }

  /**
   * Get user stats from localStorage
   */
  getUserStats(): { coins: number; streaks: number; days: number; badges: number } | null {
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
   * Fetch user profile from API
   */
  fetchUserProfileFromAPI(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/${userId}/profile`);
  }

  /**
   * Update user profile on API
   */
  updateUserProfileOnAPI(userId: number, profile: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/users/${userId}/profile`, profile);
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
    // Map avatar numbers to actual image paths
    // This should match your avatar selection in signup
    const genderPrefix = gender === 'male' ? 'Male' : 'Female';
    return `/assets/Images-Transparent/Image-Onboarding-Avatar-${genderPrefix}${avatarNumber}.png`;
  }
}
