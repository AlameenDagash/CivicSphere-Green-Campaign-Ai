/**
 * CivicSphere AI — Course Enrollment Types
 * Derived from the authoritative database foundation (public.course_enrollments).
 */

export type CourseEnrollmentStatus = 'in_progress' | 'completed';

export interface CourseEnrollment {
  id: string;
  tenant_id: string;
  user_id: string;
  course_id: string;
  status: CourseEnrollmentStatus;
  progress_percent: number;
  enrolled_at: string;
  completed_at?: string | null;
  updated_at?: string | null;
}
