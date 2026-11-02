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

    private userProfileSubject = new BehaviorSubject<UserProfile | null>(this.loadUserFromStorage());
    public userProfile$ = this.userProfileSubject.asObservable();

    constructor(private http: HttpClient) { }

    private loadUserFromStorage(): UserProfile | null {
        try {
            const storedUser = localStorage.getItem('user_profile');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    }

    private saveUserToStorage(profile: UserProfile): void {
        try {
            localStorage.setItem('user_profile', JSON.stringify(profile));
        } catch (e) {
            console.error('Error saving user profile:', e);
        }
    }

    getUserProfile(): UserProfile | null {
        return this.userProfileSubject.value;
    }

    getUserProfile$(): Observable<UserProfile | null> {
        return this.userProfile$;
    }

    updateUserProfile(profile: Partial<UserProfile>): void {
        const currentProfile = this.userProfileSubject.value || {} as UserProfile;
        const updatedProfile = { ...currentProfile, ...profile };
        this.userProfileSubject.next(updatedProfile);
        this.saveUserToStorage(updatedProfile);
    }

    setUserProfile(profile: UserProfile): void {
        this.userProfileSubject.next(profile);
        this.saveUserToStorage(profile);
    }

    getUserAvatarUrl(): string {
        const profile = this.userProfileSubject.value;
        if (profile?.avatarUrl) return profile.avatarUrl;
        if (profile?.gender === 'male') {
            return '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png';
        } else if (profile?.gender === 'female') {
            return '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png';
        }
        return '/assets/app-assets/Default-avatar-home.svg';
    }

    updateUserAvatar(avatarUrl: string, avatarName?: string): void {
        this.updateUserProfile({ avatarUrl, avatarName });
    }

    getUserName(): string {
        return this.userProfileSubject.value?.name || 'User';
    }

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

    fetchUserFromApi(): Observable<any> {
        const userId = localStorage.getItem('user_id');
        return this.http.get(`${this.apiUrl}/users/${userId}`);
    }
}
