import { Injectable } from '@angular/core';

/**
 * Holds the school/class context selected by the user in the institute-detail
 * flow. Injected by CartService (to include schoolId/classId in the payload)
 * and by ProductStoreComponent (to populate it).
 *
 * classId is temporarily hardcoded to 3 until the backend class-listing API
 * returns numeric class IDs — tracked in TODO below.
 */
@Injectable({ providedIn: 'root' })
export class SchoolContextService {
    private _schoolId: number | null = null;
    private _classId: number | null = null;

    get schoolId(): number | null { return this._schoolId; }
    get classId(): number | null { return this._classId; }

    /** Returns a complete context object only when both IDs are known. */
    get context(): { schoolId: number; classId: number } | null {
        if (this._schoolId != null && this._classId != null) {
            return { schoolId: this._schoolId, classId: this._classId };
        }
        return null;
    }

    set(schoolId: number | null, classId: number | null): void {
        this._schoolId = schoolId;
        this._classId = classId;
    }

    clear(): void {
        this._schoolId = null;
        this._classId = null;
    }
}
