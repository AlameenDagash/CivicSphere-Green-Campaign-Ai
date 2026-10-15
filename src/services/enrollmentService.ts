/**
 * CivicSphere AI — Course Enrollment Service
 * Presentation MVP Step 5A
 *
 * Rules:
 * - Operates strictly against the authenticated tenant context and authenticated user.
 * - Adheres to Row Level Security (RLS) policies.
 * - Calls the database RPC: public.enroll_in_course(p_tenant_id, p_course_id).
 * - Reads real user enrollments from public.course_enrollments via Supabase.
 * - No mock data.
 */

import { getSupabaseClient } from '../lib/supabase';
import type { CourseEnrollment } from '../types/enrollment.types';

export interface EnrollInCourseResult {
  enrollmentId: string | null;
  error: string | null;
}

export interface FetchUserEnrollmentsResult {
  enrollments: CourseEnrollment[];
  error: string | null;
}

export interface CompleteLessonResult {
  lesson_completed: boolean;
  progress_percent: number;
  course_status: string | null;
  error: string | null;
}

export interface FetchUserLessonCompletionsResult {
  completedLessonIds: string[];
  error: string | null;
}

/**
 * Enrolls the authenticated user into an Academy course via RPC:
 * public.enroll_in_course(p_tenant_id, p_course_id)
 */
export async function enrollInCourse(
  tenantId: string,
  courseId: string
): Promise<EnrollInCourseResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { enrollmentId: null, error: 'Supabase client is not initialized.' };
  }

  try {
    const { data, error } = await client.rpc('enroll_in_course', {
      p_tenant_id: tenantId,
      p_course_id: courseId,
    });

    if (error) {
      return { enrollmentId: null, error: error.message };
    }

    // RPC returns UUID or json object depending on database definition
    const enrollmentId = typeof data === 'string' ? data : (data?.id || (data as any)?.enrollment_id || null);
    return { enrollmentId: enrollmentId ? String(enrollmentId) : null, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { enrollmentId: null, error: msg };
  }
}

/**
 * Marks a lesson complete for the authenticated learner via RPC:
 * public.complete_lesson(p_tenant_id, p_course_id, p_lesson_id)
 *
 * Returns:
 * - lesson_completed: boolean
 * - progress_percent: number
 * - course_status: string | null
 */
export async function completeLesson(
  tenantId: string,
  courseId: string,
  lessonId: string
): Promise<CompleteLessonResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      lesson_completed: false,
      progress_percent: 0,
      course_status: null,
      error: 'Supabase client is not initialized.',
    };
  }

  try {
    const { data, error } = await client.rpc('complete_lesson', {
      p_tenant_id: tenantId,
      p_course_id: courseId,
      p_lesson_id: lessonId,
    });

    if (error) {
      return {
        lesson_completed: false,
        progress_percent: 0,
        course_status: null,
        error: error.message,
      };
    }

    // Normalize result whether returned as row/object or array
    const record = Array.isArray(data) ? data[0] : data;
    const lessonCompleted = Boolean(record?.lesson_completed ?? true);
    const progressPercent = Number(record?.progress_percent ?? 0);
    const courseStatus = record?.course_status ? String(record.course_status) : null;

    return {
      lesson_completed: lessonCompleted,
      progress_percent: progressPercent,
      course_status: courseStatus,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      lesson_completed: false,
      progress_percent: 0,
      course_status: null,
      error: msg,
    };
  }
}

/**
 * Fetches course enrollments for the authenticated user within the active tenant.
 * Filtered by tenant_id = tenantId and user_id = userId.
 */
export async function fetchUserCourseEnrollments(
  tenantId: string,
  userId: string
): Promise<FetchUserEnrollmentsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { enrollments: [], error: 'Supabase client is not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('course_enrollments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      return { enrollments: [], error: error.message };
    }

    return { enrollments: (data as CourseEnrollment[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { enrollments: [], error: msg };
  }
}

/**
 * Fetches completed lesson IDs for the authenticated user within the active tenant and course.
 * Reads public.lesson_completions filtered by tenant_id, user_id, and course_id.
 */
export async function fetchUserCourseLessonCompletions(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<FetchUserLessonCompletionsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { completedLessonIds: [], error: 'Supabase client is not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('lesson_completions')
      .select('lesson_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      return { completedLessonIds: [], error: error.message };
    }

    const ids = (data || []).map((row: any) => String(row.lesson_id));
    return { completedLessonIds: ids, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { completedLessonIds: [], error: msg };
  }
}

