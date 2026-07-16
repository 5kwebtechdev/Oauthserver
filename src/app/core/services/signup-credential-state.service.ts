import { Injectable } from '@angular/core';

export interface PendingLoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class SignupCredentialStateService {
  private signupPassword = '';
  private pendingLogin: PendingLoginCredentials | null = null;

  setPassword(password: string): void {
    this.signupPassword = password;
  }

  getPassword(): string {
    return this.signupPassword;
  }

  setPendingLogin(credentials: PendingLoginCredentials): void {
    this.pendingLogin = { ...credentials };
  }

  getPendingLogin(): PendingLoginCredentials | null {
    return this.pendingLogin ? { ...this.pendingLogin } : null;
  }

  clear(): void {
    this.signupPassword = '';
    this.pendingLogin = null;
  }
}
