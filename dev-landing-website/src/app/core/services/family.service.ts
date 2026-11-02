import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CreateFamilyResponse {
    familyId: number;
    familyName: string;
    familyCode: string;
    createdOn: string;
    status: string;
}

export interface JoinFamilyResponse {
    success: boolean;
    message: string;
    familyId?: number;
    familyName?: string;
}

export interface FamilyMember {
    userId: number;
    name: string;
    avatarName: string;
    avatarUrl?: string;
    relationship: string;
    age: number;
    you: boolean;
}

export interface FamilyDetails {
    familyId: number;
    familyName: string;
    familyCode: string;
    status: string;
    createdOn: string;
    creator: FamilyMember;
    members: FamilyMember[];
}

export interface FamilyDetailsResponse {
    mode: 'FAMILY' | 'SELF' | null;
    family: FamilyDetails | null;
    selfMode: any | null;
}

@Injectable({
    providedIn: 'root'
})
export class FamilyService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('auth_token');

        if (token) {
            return new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            });
        }

        // Fallback to environment token for unauthenticated requests
        if (environment.apiAuthToken) {
            return new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': environment.apiAuthToken
            });
        }

        return new HttpHeaders({ 'Content-Type': 'application/json' });
    }

    /**
     * Create a new family with the given name
     * @param familyName - Name of the family to create (2-30 characters)
     */
    createFamily(familyName: string): Observable<CreateFamilyResponse> {
        const url = `${this.apiUrl}/family/create?familyName=${encodeURIComponent(familyName)}`;
        const headers = this.getAuthHeaders();

        console.log('[FamilyService] Creating family:', { familyName, url });

        return this.http.post<CreateFamilyResponse>(url, {}, { headers }).pipe(
            tap({
                next: (response) => {
                    console.log('[FamilyService] Family created successfully:', {
                        familyId: response.familyId,
                        familyCode: response.familyCode
                    });
                },
                error: (error) => {
                    console.error('[FamilyService] Failed to create family:', error.status, error.message);
                }
            })
        );
    }

    /**
     * Join an existing family using a family code/token
     * @param token - The family code/token to join (6-10 characters)
     */
    joinFamily(token: string): Observable<JoinFamilyResponse> {
        const url = `${this.apiUrl}/family/join`;
        const headers = this.getAuthHeaders();

        console.log('[FamilyService] Joining family with code:', { tokenLength: token.length });

        return this.http.post<JoinFamilyResponse>(url, { token }, { headers }).pipe(
            tap({
                next: (response) => {
                    console.log('[FamilyService] Joined family successfully:', response);
                },
                error: (error) => {
                    console.error('[FamilyService] Failed to join family:', error.status, error.message);
                }
            })
        );
    }

    /**
     * Get family details for the authenticated user
     */
    getFamilyDetails(): Observable<FamilyDetailsResponse> {
        const url = `${this.apiUrl}/auth/family-details`;
        const headers = this.getAuthHeaders();

        console.log('[FamilyService] Getting family details');

        return this.http.get<FamilyDetailsResponse>(url, { headers }).pipe(
            tap({
                next: (response) => {
                    console.log('[FamilyService] Family details retrieved:', {
                        mode: response.mode,
                        hasFamily: !!response.family
                    });
                },
                error: (error) => {
                    console.error('[FamilyService] Failed to get family details:', error.status, error.message);
                }
            })
        );
    }

    /**
     * Leave the current family
     */
    leaveFamily(): Observable<any> {
        const url = `${this.apiUrl}/family/leave`;
        const headers = this.getAuthHeaders();

        console.log('[FamilyService] Leaving family');

        return this.http.post(url, {}, { headers }).pipe(
            tap({
                next: () => {
                    console.log('[FamilyService] Left family successfully');
                },
                error: (error) => {
                    console.error('[FamilyService] Failed to leave family:', error.status, error.message);
                }
            })
        );
    }

    /**
     * Remove a member from the family (only for family creator/admin)
     * @param memberId - User ID of the member to remove
     */
    removeMember(memberId: number): Observable<any> {
        const url = `${this.apiUrl}/family/remove-member/${memberId}`;
        const headers = this.getAuthHeaders();

        console.log('[FamilyService] Removing family member:', { memberId });

        return this.http.delete(url, { headers }).pipe(
            tap({
                next: () => {
                    console.log('[FamilyService] Member removed successfully');
                },
                error: (error) => {
                    console.error('[FamilyService] Failed to remove member:', error.status, error.message);
                }
            })
        );
    }

    /**
     * Validate a family code without joining
     * @param code - The family code to validate
     */
    validateFamilyCode(code: string): Observable<{ valid: boolean; familyName?: string }> {
        const url = `${this.apiUrl}/family/validate?code=${encodeURIComponent(code)}`;
        const headers = this.getAuthHeaders();

        return this.http.get<{ valid: boolean; familyName?: string }>(url, { headers });
    }

    /**
     * Generate QR code data for sharing family code
     * @param familyCode - The family code to encode
     */
    generateQRCodeData(familyCode: string): string {
        // Return a URL that can be scanned to join the family
        return `${window.location.origin}/join-family?code=${familyCode}`;
    }

    /**
     * Share family code using Web Share API
     * @param familyCode - The family code to share
     * @param familyName - The family name for the share message
     */
    async shareFamilyCode(familyCode: string, familyName: string): Promise<boolean> {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${familyName}`,
                    text: `Join my family "${familyName}" using this code: ${familyCode}`,
                    url: `${window.location.origin}/join-family?code=${familyCode}`
                });
                return true;
            } catch (error) {
                console.log('[FamilyService] Share cancelled or failed:', error);
                return false;
            }
        }
        return false;
    }

    /**
     * Copy family code to clipboard
     * @param familyCode - The family code to copy
     */
    async copyFamilyCode(familyCode: string): Promise<boolean> {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(familyCode);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = familyCode;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (error) {
            console.error('[FamilyService] Failed to copy family code:', error);
            return false;
        }
    }
}
