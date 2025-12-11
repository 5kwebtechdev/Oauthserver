import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../package/api/auth.service';

export interface Lesson {
    id: number;
    lessonTitle: string;
    lessonDescription?: string;
    format?: string;
    duration?: number;
    coins?: number;
    thumbnailUrl?: string;
    content?: string;
    lessonOrder?: number;
}

export interface Course {
    id: number;
    courseName: string;
    description?: string;
    category?: string;
    difficulty?: string;
    noOfLessons?: number;
    ageGroup?: string;
    duration?: number;
    format?: string;
    totalCoins?: number;
    thumbnailUrl?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    enabled?: boolean;
    lessons?: Lesson[];
}

@Injectable({
    providedIn: 'root'
})
export class AcademyService {
    private base = environment.apiUrl;

    constructor(private http: HttpClient, private authService: AuthService) { }

    getCourses(): Observable<Course[]> {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // Prefer user token from AuthService (localStorage), fallback to environment.apiAuthToken
        const userToken = this.authService.getToken();
        if (userToken) {
            const t = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;
            headers = headers.set('Authorization', t);
        } else if (environment.apiAuthToken) {
            const envToken = environment.apiAuthToken.startsWith('Bearer ') ? environment.apiAuthToken : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envToken);
        }

        return this.http.get<Course[]>(`${this.base}/courses`, { headers });
    }
}
