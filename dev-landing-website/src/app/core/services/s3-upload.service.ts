import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PresignRequest {
    originalName: string;
    contentType: string;
    fileSize: number;
    userId?: number;
}

export interface PresignResponse {
    fileId?: number;
    fileName?: string;
    presignedUrl: string;
    fileUrl?: string;
    status?: string;
    requiredHeaders?: { [k: string]: string };
}

@Injectable({ providedIn: 'root' })
export class S3UploadService {
    private readonly presignEndpoint = `${environment.apiUrl}/api/s3/presign`;
    private readonly uploadCompleteEndpoint = `${environment.apiUrl}/api/s3/upload-complete/{fileId}`;

    constructor(private http: HttpClient) { }

    async getPresignedUrl(file: File, userId?: number, token?: string): Promise<PresignResponse> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const body: PresignRequest = {
            originalName: file.name,
            contentType: file.type,
            fileSize: file.size,
            ...(userId && { userId })
        };

        return lastValueFrom(
            this.http.post<PresignResponse>(this.presignEndpoint, body, { headers: new HttpHeaders(headers) })
        );
    }

    uploadWithXhr(
        presignedUrl: string,
        file: File,
        requiredHeaders: Record<string, string> = {},
        onProgress?: (percent: number) => void,
        timeoutMs = 60000
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignedUrl, true);
            if (timeoutMs > 0) xhr.timeout = timeoutMs;

            Object.entries(requiredHeaders).forEach(([key, val]) => {
                try { xhr.setRequestHeader(key, val); } catch (e) { console.warn(`Header ${key} failed`, e); }
            });

            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable && onProgress) {
                    onProgress(Math.round((ev.loaded / ev.total) * 100));
                }
            };

            xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));
            xhr.send(file);
        });
    }

    async notifyUploadComplete(fileId: number, token?: string): Promise<void> {
        const url = this.uploadCompleteEndpoint.replace('{fileId}', fileId.toString());
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        await lastValueFrom(
            this.http.post(url, {}, { headers: new HttpHeaders(headers), responseType: 'text' })
        );
    }

    async uploadFileComplete(
        file: File,
        userId: number,
        token?: string,
        onProgress?: (percent: number) => void,
        timeoutMs = 60000
    ): Promise<string> {
        const presignResp = await this.getPresignedUrl(file, userId, token);
        if (!presignResp.presignedUrl) throw new Error('Invalid presign response');

        await this.uploadWithXhr(presignResp.presignedUrl, file, presignResp.requiredHeaders || {}, onProgress, timeoutMs);

        if (presignResp.fileId) await this.notifyUploadComplete(presignResp.fileId, token);

        return presignResp.fileUrl || presignResp.presignedUrl;
    }
}
