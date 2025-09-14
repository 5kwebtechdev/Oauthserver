import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApi {
    // Simple token accessor. In a real app replace with secure storage or AuthService.
    getToken(): string | null {
        return environment.apiAuthToken || null;
    }
}
