import { Injectable } from '@angular/core';

const SCHOOL_KEY = 'mb_last_school_id';
const CLASS_KEY = 'mb_last_class_id';

/**
 * Remembers the last school/class the user picked in the school-store flow.
 * Query params carry this context between pages during normal navigation,
 * but a hard refresh loses them — this fills the gap so pages like My Cart
 * can still scope their requests correctly after a reload.
 */
@Injectable({ providedIn: 'root' })
export class SchoolContextService {
  set(schoolId: number | null, classId: number | null): void {
    try {
      if (schoolId != null) localStorage.setItem(SCHOOL_KEY, String(schoolId));
      if (classId != null) localStorage.setItem(CLASS_KEY, String(classId));
    } catch { /* storage unavailable */ }
  }

  get(): { schoolId: number | null; classId: number | null } {
    try {
      const schoolId = localStorage.getItem(SCHOOL_KEY);
      const classId = localStorage.getItem(CLASS_KEY);
      return {
        schoolId: schoolId ? Number(schoolId) || null : null,
        classId: classId ? Number(classId) || null : null
      };
    } catch {
      return { schoolId: null, classId: null };
    }
  }
}
