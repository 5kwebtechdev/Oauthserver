import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface PresignRequest {
    originalName: string;
    contentType: string;
    fileSize: number;
    userId?: number; // Optional userId for custom backend
}

export interface PresignResponse {
    fileId?: number;
    fileName?: string;
    presignedUrl: string;
    fileUrl?: string; // Public URL to the uploaded file (if backend provides it)
    status?: string;
    requiredHeaders?: { [k: string]: string };
}

/**
 * Reusable S3 upload service.
 * - getPresignedUrl: requests presign data from your backend
 * - uploadWithXhr: uploads file using XHR with progress callback (recommended for progress)
 * - uploadWithFetch: upload using fetch (no progress but sometimes simpler for CORS)
 *
 * The service does not assume auth storage location; you can pass a token or let the service read localStorage.
 */
@Injectable({ providedIn: 'root' })
export class S3UploadService {
    constructor(private http: HttpClient) { }

    /**
     * Request a presigned URL from backend.
     * @param presignEndpoint full backend endpoint to request presign data
     * @param file file being uploaded
     * @param token optional auth token (Bearer)
     */
    async getPresignedUrl(
        presignEndpoint: string,
        file: File,
        token?: string
    ): Promise<PresignResponse> {
        const headers: any = {
            'Content-Type': 'application/json'
        };

        // Only set Authorization header if token is provided
        if (token) {
            headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }

        const body: PresignRequest = {
            originalName: file.name,
            contentType: file.type,
            fileSize: file.size
        };

        const resp = await lastValueFrom(
            this.http.post<PresignResponse>(presignEndpoint, body, { headers: new HttpHeaders(headers) })
        );
        return resp;
    }

    /**
     * Upload file to S3 using XMLHttpRequest so progress events are available.
     * @param presignedUrl the full presigned URL (including query string)
     * @param requiredHeaders headers returned by backend that must be set for signature verification (e.g. x-amz-meta-* and Content-Type)
     * @param file file to upload
     * @param onProgress optional callback(percent:number)
     */
    uploadWithXhr(
        presignedUrl: string,
        requiredHeaders: { [k: string]: string } = {},
        file: File,
        onProgress?: (percent: number) => void,
        timeoutMs: number = 0
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignedUrl, true);

            if (timeoutMs > 0) {
                xhr.timeout = timeoutMs;
            }

            // Set headers as provided. Note: browsers restrict some headers; if header can't be set it will throw - we catch and warn.
            Object.keys(requiredHeaders || {}).forEach((key) => {
                try {
                    xhr.setRequestHeader(key, requiredHeaders[key]);
                } catch (e) {
                    // Keep going; if header is required by signature this upload will fail with 403.
                    console.warn(`Could not set header ${key} on XHR:`, e);
                }
            });

            xhr.upload.onprogress = (ev: ProgressEvent) => {
                if (ev.lengthComputable && onProgress) {
                    const percent = Math.round((ev.loaded / ev.total) * 100);
                    try { onProgress(percent); } catch (_) { }
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    const msg = `Upload failed with status ${xhr.status} (${xhr.statusText})`;
                    reject(new Error(msg));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));

            xhr.send(file);
        });
    }

    /**
     * Upload file using fetch() - simpler and sometimes less restricted, but no progress.
     * Accepts either a presign response object (with requiredHeaders & presignedUrl) or direct params.
     * This is identical to the snippet provided earlier.
     */
    async uploadWithFetch(presignRespOrUrl: PresignResponse | string, file?: File): Promise<void> {
        let presignResp: PresignResponse;
        if (typeof presignRespOrUrl === 'string') {
            if (!file) throw new Error('file is required when passing a presignedUrl string');
            presignResp = { presignedUrl: presignRespOrUrl, requiredHeaders: {} };
        } else {
            presignResp = presignRespOrUrl;
            if (!file) throw new Error('file is required when passing presign response');
        }

        const required = presignResp.requiredHeaders || {};
        const fetchHeaders = new Headers();
        Object.keys(required).forEach(k => {
            fetchHeaders.set(k, required[k]);
        });

        // Important: do not set 'Content-Length' manually; browser sets it
        const res = await fetch(presignResp.presignedUrl, {
            method: 'PUT',
            headers: fetchHeaders,
            body: file as File,
            mode: 'cors',
            credentials: 'omit'
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Upload failed with status ${res.status}: ${text}`);
        }
    }

    /**
     * Request a presigned URL with userId included in the request body.
     * This is for backends that require userId as part of the presign request.
     * @param presignEndpoint full backend endpoint to request presign data
     * @param file file being uploaded
     * @param userId user ID to include in request
     * @param token optional auth token (Bearer)
     */
    async getPresignedUrlWithUserId(
        presignEndpoint: string,
        file: File,
        userId: number,
        token?: string
    ): Promise<PresignResponse> {
        const headers: any = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }

        const body: PresignRequest = {
            userId: userId,
            originalName: file.name,
            contentType: file.type,
            fileSize: file.size
        };

        const resp = await lastValueFrom(
            this.http.post<PresignResponse>(presignEndpoint, body, { headers: new HttpHeaders(headers) })
        );
        return resp;
    }

    /**
     * Notify backend that upload is complete.
     * @param uploadCompleteEndpoint full backend endpoint (including fileId)
     * @param token optional auth token (Bearer)
     */
    async notifyUploadComplete(
        uploadCompleteEndpoint: string,
        token?: string
    ): Promise<void> {
        const headers: any = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }

        await lastValueFrom(
            this.http.post(uploadCompleteEndpoint, {}, {
                headers: new HttpHeaders(headers),
                responseType: 'text',
                observe: 'response'
            })
        );
    }

    /**
     * Complete S3 upload workflow: presign → upload → notify complete.
     * This is a convenience method that combines all steps.
     * @param presignEndpoint backend endpoint to request presign data
     * @param uploadCompleteEndpoint backend endpoint to notify completion (use {fileId} placeholder)
     * @param file file to upload
     * @param userId user ID for presign request
     * @param token auth token
     * @param onProgress progress callback
     * @param timeoutMs upload timeout
     * @returns presigned URL of uploaded file
     */
    async uploadFileComplete(
        presignEndpoint: string,
        uploadCompleteEndpoint: string,
        file: File,
        userId: number,
        token?: string,
        onProgress?: (percent: number) => void,
        timeoutMs: number = 60000
    ): Promise<string> {
        // Step 1: Get presigned URL
        const presignResp = await this.getPresignedUrlWithUserId(
            presignEndpoint,
            file,
            userId,
            token
        );

        if (!presignResp.presignedUrl) {
            throw new Error('Invalid presign response - missing presignedUrl');
        }

        // Step 2: Upload to S3
        await this.uploadWithXhr(
            presignResp.presignedUrl,
            presignResp.requiredHeaders || {},
            file,
            onProgress,
            timeoutMs
        );

        // Step 3: Notify backend
        if (presignResp.fileId) {
            const completeUrl = uploadCompleteEndpoint.replace('{fileId}', presignResp.fileId.toString());
            await this.notifyUploadComplete(completeUrl, token);
        }

        // Prefer a clean public file URL if backend provided one. Otherwise
        // derive a stable URL by stripping query params from the presigned URL.
        if (presignResp.fileUrl) {
            return presignResp.fileUrl;
        }

        return presignResp.presignedUrl;
    }
}
