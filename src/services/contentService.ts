/**
 * CivicSphere AI — Content & Learning Domain Service
 * Performs real Supabase queries strictly scoped to the active tenant_id.
 * Respects RLS and reports real table readiness/authorization state.
 */

import { getSupabaseClient } from '../lib/supabase';
import type {
  CivicProject,
  CivicActivity,
  CivicEvent,
  CivicAnnouncement,
  CivicDocument,
  CivicMediaItem,
  AcademyCourse,
  AcademyLesson,
  CourseLevel,
  ContentQueryResult,
  SchemaTableStatus,
  ContentDomainSummary,
} from '../types/content.types';

function parseSupabaseError(error: any, tableName: string): { status: SchemaTableStatus; message: string } {
  if (!error) {
    return { status: 'ready', message: '' };
  }

  const code = String(error.code || '');
  const msg = String(error.message || '');

  // 1. Missing table in PostgreSQL or PostgREST schema cache
  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  ) {
    return {
      status: 'missing_table',
      message: `Table 'public.${tableName}' is not yet created in the Supabase database.`,
    };
  }

  // 2. Permission denied / RLS failure
  if (
    code === '42501' ||
    code === '401' ||
    code === '403' ||
    msg.includes('permission denied') ||
    msg.includes('violates row-level security')
  ) {
    return {
      status: 'unauthorized',
      message: `Access denied by Row Level Security for table 'public.${tableName}'.`,
    };
  }

  // 3. Other errors
  return {
    status: 'error',
    message: msg || `Failed to query table 'public.${tableName}'.`,
  };
}

/**
 * 1. Fetch Projects for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 */
export async function fetchTenantProjects(tenantId: string): Promise<ContentQueryResult<CivicProject>> {
  const client = getSupabaseClient();
  const tableName = 'projects';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicProject[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 2. Fetch Activities for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 */
export async function fetchTenantActivities(tenantId: string): Promise<ContentQueryResult<CivicActivity>> {
  const client = getSupabaseClient();
  const tableName = 'activities';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicActivity[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 3. Fetch Events for active tenant
 * Filter: tenant_id = tenantId
 * Order: start_time ascending
 */
export async function fetchTenantEvents(tenantId: string): Promise<ContentQueryResult<CivicEvent>> {
  const client = getSupabaseClient();
  const tableName = 'events';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicEvent[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 4. Fetch Announcements for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 */
export async function fetchTenantAnnouncements(tenantId: string): Promise<ContentQueryResult<CivicAnnouncement>> {
  const client = getSupabaseClient();
  const tableName = 'announcements';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicAnnouncement[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 5. Fetch Documents for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 */
export async function fetchTenantDocuments(tenantId: string): Promise<ContentQueryResult<CivicDocument>> {
  const client = getSupabaseClient();
  const tableName = 'documents';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicDocument[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 6. Fetch Media & Photos for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 */
export async function fetchTenantMedia(tenantId: string): Promise<ContentQueryResult<CivicMediaItem>> {
  const client = getSupabaseClient();
  const tableName = 'media';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as CivicMediaItem[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 7. Fetch Academy Courses for active tenant
 * Filter: tenant_id = tenantId
 * Order: created_at descending
 * Note: lesson_count is NOT a database column and is never queried or written to DB.
 */
export async function fetchTenantCourses(tenantId: string): Promise<ContentQueryResult<AcademyCourse>> {
  const client = getSupabaseClient();
  const tableName = 'courses';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as AcademyCourse[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * 8. Fetch Academy Lessons for active tenant
 * Filter: tenant_id = tenantId, optionally course_id = courseId
 * Order: order_index ascending
 */
export async function fetchTenantLessons(
  tenantId: string,
  courseId?: string
): Promise<ContentQueryResult<AcademyLesson>> {
  const client = getSupabaseClient();
  const tableName = 'lessons';
  if (!client) {
    const errorMsg = 'Supabase client is not initialized';
    return { data: [], error: errorMsg, errorMessage: errorMsg, tableStatus: 'error', tableName };
  }

  try {
    let query = client
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query.order('order_index', { ascending: true });

    if (error) {
      const parsed = parseSupabaseError(error, tableName);
      return { data: [], error: parsed.message, errorMessage: parsed.message, tableStatus: parsed.status, tableName };
    }

    return { data: (data as AcademyLesson[]) || [], error: null, tableStatus: 'ready', tableName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected query error';
    return {
      data: [],
      error: msg,
      errorMessage: msg,
      tableStatus: 'error',
      tableName,
    };
  }
}

/**
 * Fetch Overall Content & Learning Summary for Tenant Overview
 */
export async function fetchContentDomainSummary(tenantId: string): Promise<ContentDomainSummary> {
  const [
    projectsRes,
    activitiesRes,
    eventsRes,
    announcementsRes,
    documentsRes,
    mediaRes,
    coursesRes,
    lessonsRes,
  ] = await Promise.all([
    fetchTenantProjects(tenantId),
    fetchTenantActivities(tenantId),
    fetchTenantEvents(tenantId),
    fetchTenantAnnouncements(tenantId),
    fetchTenantDocuments(tenantId),
    fetchTenantMedia(tenantId),
    fetchTenantCourses(tenantId),
    fetchTenantLessons(tenantId),
  ]);

  return {
    projectsCount: projectsRes.data.length,
    activitiesCount: activitiesRes.data.length,
    eventsCount: eventsRes.data.length,
    announcementsCount: announcementsRes.data.length,
    documentsCount: documentsRes.data.length,
    mediaCount: mediaRes.data.length,
    coursesCount: coursesRes.data.length,
    lessonsCount: lessonsRes.data.length,
    tablesStatus: {
      projects: projectsRes.tableStatus,
      activities: activitiesRes.tableStatus,
      events: eventsRes.tableStatus,
      announcements: announcementsRes.tableStatus,
      documents: documentsRes.tableStatus,
      media: mediaRes.tableStatus,
      courses: coursesRes.tableStatus,
      lessons: lessonsRes.tableStatus,
    },
  };
}

// ============================================================================
// STAGE 5A: CONTENT MANAGER MUTATIONS (RLS Protected)
// ============================================================================

export interface MutationResult<T> {
  data: T | null;
  error: string | null;
}

// ----------------------------------------------------------------------------
// 1. Projects Mutations
// ----------------------------------------------------------------------------

export async function createTenantProject(
  tenantId: string,
  params: {
    title: string;
    description?: string;
    status: CivicProject['status'];
    category?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    location?: string;
  }
): Promise<MutationResult<CivicProject>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const fullPayload = {
      tenant_id: tenantId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      status: params.status || 'draft',
      category: params.category?.trim() || null,
      start_date: params.start_date || null,
      end_date: params.end_date || null,
      budget: params.budget !== undefined ? params.budget : null,
      location: params.location?.trim() || null,
    };

    // Attempt insert with select() without .single() to avoid PGRST116 when newly created draft row is not SELECT-visible under RLS
    let { data, error } = await client
      .from('projects')
      .insert(fullPayload)
      .select();

    // If schema mismatch error (e.g. category, start_date, end_date column does not exist in projects table), retry with core columns
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const corePayload = {
        tenant_id: tenantId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        status: params.status || 'draft',
        budget: params.budget !== undefined ? params.budget : null,
        location: params.location?.trim() || null,
      };

      const retryRes = await client.from('projects').insert(corePayload).select();
      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      } else if (
        retryRes.error.code === 'PGRST116' ||
        retryRes.error.code === '42501' ||
        retryRes.error.message?.includes('Row Level Security') ||
        retryRes.error.message?.includes('permission denied')
      ) {
        const minimalRes = await client.from('projects').insert(corePayload);
        if (minimalRes.error) {
          return { data: null, error: minimalRes.error.message };
        }
        return { data: corePayload as unknown as CivicProject, error: null };
      } else {
        error = retryRes.error;
      }
    }

    if (error) {
      // If select failed due to RLS visibility restrictions on drafts, execute minimal insert so creation succeeds
      if (
        error.code === 'PGRST116' ||
        error.code === '42501' ||
        error.message?.includes('Row Level Security') ||
        error.message?.includes('permission denied')
      ) {
        const minimalRes = await client.from('projects').insert(fullPayload);
        if (minimalRes.error) {
          return { data: null, error: minimalRes.error.message };
        }
        return { data: fullPayload as unknown as CivicProject, error: null };
      }
      return { data: null, error: error.message };
    }

    const createdProject = (Array.isArray(data) && data.length > 0 ? data[0] : fullPayload) as CivicProject;
    return { data: createdProject, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantProject(
  tenantId: string,
  projectId: string,
  updates: Partial<Pick<CivicProject, 'title' | 'description' | 'status' | 'category' | 'start_date' | 'end_date' | 'budget' | 'location'>>
): Promise<MutationResult<CivicProject>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;

    let { data, error } = await client
      .from('projects')
      .update(payload)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .select();

    // If updated_at or non-core column does not exist, retry with core updates
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const coreKeys = ['title', 'description', 'status', 'budget', 'location'];
      const sanitizedPayload: Record<string, unknown> = {};
      for (const k of coreKeys) {
        if (k in updates) {
          sanitizedPayload[k] = (updates as any)[k];
        }
      }
      if (sanitizedPayload.title && typeof sanitizedPayload.title === 'string') {
        sanitizedPayload.title = sanitizedPayload.title.trim();
      }

      const retryRes = await client
        .from('projects')
        .update(sanitizedPayload)
        .eq('id', projectId)
        .eq('tenant_id', tenantId)
        .select();

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      } else {
        error = retryRes.error;
      }
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: { id: projectId, tenant_id: tenantId, ...payload } as unknown as CivicProject, error: null };
      }
      return { data: null, error: error.message };
    }
    const updatedProject = (Array.isArray(data) && data.length > 0 ? data[0] : { id: projectId, tenant_id: tenantId, ...payload }) as CivicProject;
    return { data: updatedProject, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 2. Activities Mutations
// ----------------------------------------------------------------------------

export async function createTenantActivity(
  tenantId: string,
  params: {
    project_id?: string;
    title: string;
    description?: string;
    type?: string;
    status: CivicActivity['status'];
    date?: string;
    points_reward?: number;
  }
): Promise<MutationResult<CivicActivity>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const { data, error } = await client
      .from('activities')
      .insert({
        tenant_id: tenantId,
        project_id: params.project_id || null,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        type: params.type?.trim() || null,
        status: params.status || 'planned',
        date: params.date || null,
        points_reward: params.points_reward !== undefined ? params.points_reward : null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicActivity, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantActivity(
  tenantId: string,
  activityId: string,
  updates: Partial<Pick<CivicActivity, 'project_id' | 'title' | 'description' | 'type' | 'status' | 'date' | 'points_reward'>>
): Promise<MutationResult<CivicActivity>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;

    const { data, error } = await client
      .from('activities')
      .update(payload)
      .eq('id', activityId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicActivity, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 3. Events Mutations
// ----------------------------------------------------------------------------

export async function createTenantEvent(
  tenantId: string,
  params: {
    title: string;
    description?: string;
    event_type: CivicEvent['event_type'];
    venue?: string;
    start_time: string;
    end_time?: string;
    is_virtual?: boolean;
    meeting_link?: string;
    capacity?: number;
  }
): Promise<MutationResult<CivicEvent>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const fullPayload = {
      tenant_id: tenantId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      event_type: params.event_type || 'community_meeting',
      venue: params.venue?.trim() || null,
      start_time: params.start_time,
      end_time: params.end_time || null,
      is_virtual: params.is_virtual ?? false,
      meeting_link: params.meeting_link?.trim() || null,
      capacity: params.capacity !== undefined ? params.capacity : null,
    };

    // Attempt insert with select() without .single() to avoid PGRST116 when newly created event is not immediately SELECT-visible under RLS
    let { data, error } = await client
      .from('events')
      .insert(fullPayload)
      .select();

    // If schema mismatch error (e.g. is_virtual, meeting_link, capacity not in events table), retry with core columns
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const corePayload = {
        tenant_id: tenantId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        event_type: params.event_type || 'community_meeting',
        venue: params.venue?.trim() || null,
        start_time: params.start_time,
        end_time: params.end_time || null,
      };

      const retryRes = await client.from('events').insert(corePayload).select();
      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      } else if (
        retryRes.error.code === 'PGRST116' ||
        retryRes.error.code === '42501' ||
        retryRes.error.message?.includes('Row Level Security') ||
        retryRes.error.message?.includes('permission denied')
      ) {
        const minimalRes = await client.from('events').insert(corePayload);
        if (minimalRes.error) {
          return { data: null, error: minimalRes.error.message };
        }
        return { data: corePayload as unknown as CivicEvent, error: null };
      } else {
        error = retryRes.error;
      }
    }

    if (error) {
      // If select failed due to RLS visibility restrictions on events, execute minimal insert so creation succeeds
      if (
        error.code === 'PGRST116' ||
        error.code === '42501' ||
        error.message?.includes('Row Level Security') ||
        error.message?.includes('permission denied')
      ) {
        const minimalRes = await client.from('events').insert(fullPayload);
        if (minimalRes.error) {
          return { data: null, error: minimalRes.error.message };
        }
        return { data: fullPayload as unknown as CivicEvent, error: null };
      }
      return { data: null, error: error.message };
    }

    const createdEvent = (Array.isArray(data) && data.length > 0 ? data[0] : fullPayload) as CivicEvent;
    return { data: createdEvent, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantEvent(
  tenantId: string,
  eventId: string,
  updates: Partial<Pick<CivicEvent, 'title' | 'description' | 'event_type' | 'venue' | 'start_time' | 'end_time' | 'is_virtual' | 'meeting_link' | 'capacity'>>
): Promise<MutationResult<CivicEvent>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;

    let { data, error } = await client
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .select();

    // If updated_at or non-core column does not exist, retry with core updates
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      const coreKeys = ['title', 'description', 'event_type', 'venue', 'start_time', 'end_time'];
      const sanitizedPayload: Record<string, unknown> = {};
      for (const k of coreKeys) {
        if (k in updates) {
          sanitizedPayload[k] = (updates as any)[k];
        }
      }
      if (sanitizedPayload.title && typeof sanitizedPayload.title === 'string') {
        sanitizedPayload.title = sanitizedPayload.title.trim();
      }

      const retryRes = await client
        .from('events')
        .update(sanitizedPayload)
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .select();

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
      } else {
        error = retryRes.error;
      }
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: { id: eventId, tenant_id: tenantId, ...payload } as unknown as CivicEvent, error: null };
      }
      return { data: null, error: error.message };
    }

    const updatedEvent = (Array.isArray(data) && data.length > 0 ? data[0] : { id: eventId, tenant_id: tenantId, ...payload }) as CivicEvent;
    return { data: updatedEvent, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 4. Announcements Mutations
// ----------------------------------------------------------------------------

export async function createTenantAnnouncement(
  tenantId: string,
  params: {
    title: string;
    summary?: string;
    content: string;
    priority: CivicAnnouncement['priority'];
    is_published: boolean;
    author_id?: string;
  }
): Promise<MutationResult<CivicAnnouncement>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const { data, error } = await client
      .from('announcements')
      .insert({
        tenant_id: tenantId,
        title: params.title.trim(),
        summary: params.summary?.trim() || null,
        content: params.content.trim(),
        priority: params.priority || 'normal',
        is_published: params.is_published ?? true,
        published_at: params.is_published ? new Date().toISOString() : null,
        author_id: params.author_id || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicAnnouncement, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantAnnouncement(
  tenantId: string,
  announcementId: string,
  updates: Partial<Pick<CivicAnnouncement, 'title' | 'summary' | 'content' | 'priority' | 'is_published'>>
): Promise<MutationResult<CivicAnnouncement>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.summary !== undefined) payload.summary = updates.summary?.trim() || null;
    if (updates.content !== undefined) payload.content = updates.content.trim();
    if (updates.is_published === true) payload.published_at = new Date().toISOString();

    const { data, error } = await client
      .from('announcements')
      .update(payload)
      .eq('id', announcementId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicAnnouncement, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 5. Documents Mutations
// ----------------------------------------------------------------------------

export async function createTenantDocument(
  tenantId: string,
  params: {
    title: string;
    description?: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
    file_url: string;
    category: CivicDocument['category'];
    is_public?: boolean;
  }
): Promise<MutationResult<CivicDocument>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const insertPayload = {
      tenant_id: tenantId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      file_name: params.file_name.trim(),
      file_type: params.file_type?.trim() || null,
      file_size: params.file_size || null,
      file_url: params.file_url.trim(),
      category: params.category || 'public_notice',
      is_public: params.is_public ?? true,
    };

    const { data, error } = await client
      .from('documents')
      .insert(insertPayload)
      .select();

    if (error) {
      if (
        error.code === 'PGRST116' ||
        error.code === '42501' ||
        error.message?.includes('Row Level Security') ||
        error.message?.includes('permission denied')
      ) {
        const minimalRes = await client.from('documents').insert(insertPayload);
        if (minimalRes.error) {
          return { data: null, error: minimalRes.error.message };
        }
        return { data: insertPayload as unknown as CivicDocument, error: null };
      }
      return { data: null, error: error.message };
    }

    const createdDocument = (Array.isArray(data) && data.length > 0 ? data[0] : insertPayload) as CivicDocument;
    return { data: createdDocument, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantDocument(
  tenantId: string,
  documentId: string,
  updates: Partial<Pick<CivicDocument, 'title' | 'description' | 'file_name' | 'file_type' | 'file_size' | 'file_url' | 'category' | 'is_public'>>
): Promise<MutationResult<CivicDocument>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;

    const { data, error } = await client
      .from('documents')
      .update(payload)
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicDocument, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 6. Media Items Mutations
// ----------------------------------------------------------------------------

export async function createTenantMediaItem(
  tenantId: string,
  params: {
    title: string;
    caption?: string;
    media_type: CivicMediaItem['media_type'];
    url: string;
    thumbnail_url?: string;
    album?: string;
    file_size?: number;
  }
): Promise<MutationResult<CivicMediaItem>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const { data, error } = await client
      .from('media')
      .insert({
        tenant_id: tenantId,
        title: params.title.trim(),
        caption: params.caption?.trim() || null,
        media_type: params.media_type || 'image',
        url: params.url.trim(),
        thumbnail_url: params.thumbnail_url?.trim() || null,
        album: params.album?.trim() || null,
        file_size: params.file_size || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicMediaItem, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantMediaItem(
  tenantId: string,
  mediaId: string,
  updates: Partial<Pick<CivicMediaItem, 'title' | 'caption' | 'media_type' | 'url' | 'thumbnail_url' | 'album' | 'file_size'>>
): Promise<MutationResult<CivicMediaItem>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.caption !== undefined) payload.caption = updates.caption?.trim() || null;

    const { data, error } = await client
      .from('media')
      .update(payload)
      .eq('id', mediaId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as CivicMediaItem, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 7. Academy Courses Mutations (Stage 5B)
// ----------------------------------------------------------------------------

export async function createTenantCourse(
  tenantId: string,
  params: {
    title: string;
    description?: string;
    level: CourseLevel;
    duration_minutes?: number | null;
    points_reward?: number | null;
    is_published?: boolean;
    thumbnail_url?: string | null;
  }
): Promise<MutationResult<AcademyCourse>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    // Note: badge_id is NOT included (badges table is not part of Stage 5B scope)
    // Note: lesson_count is NOT a database column and is never included in writes
    const { data, error } = await client
      .from('courses')
      .insert({
        tenant_id: tenantId,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        level: params.level || 'beginner',
        duration_minutes: params.duration_minutes !== undefined ? params.duration_minutes : null,
        points_reward: params.points_reward !== undefined ? params.points_reward : null,
        is_published: params.is_published ?? false, // New courses default to false
        thumbnail_url: params.thumbnail_url?.trim() || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as AcademyCourse, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantCourse(
  tenantId: string,
  courseId: string,
  updates: Partial<Pick<AcademyCourse, 'title' | 'description' | 'level' | 'duration_minutes' | 'points_reward' | 'is_published' | 'thumbnail_url'>>
): Promise<MutationResult<AcademyCourse>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.thumbnail_url !== undefined) payload.thumbnail_url = updates.thumbnail_url?.trim() || null;

    // Explicitly ensure badge_id and lesson_count are omitted
    delete payload.badge_id;
    delete payload.lesson_count;
    delete payload.tenant_id; // Never allow mutating tenant_id

    const { data, error } = await client
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as AcademyCourse, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----------------------------------------------------------------------------
// 8. Academy Lessons Mutations (Stage 5B Step 2A)
// ----------------------------------------------------------------------------

export async function createTenantLesson(
  tenantId: string,
  params: {
    course_id: string;
    title: string;
    summary?: string | null;
    content?: string | null;
    video_url?: string | null;
    order_index: number;
    duration_minutes?: number | null;
    has_quiz?: boolean;
  }
): Promise<MutationResult<AcademyLesson>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    // Security check: Verify that the referenced course belongs to active tenant
    const { data: course, error: courseCheckError } = await client
      .from('courses')
      .select('id')
      .eq('id', params.course_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (courseCheckError) {
      return { data: null, error: `Course verification error: ${courseCheckError.message}` };
    }
    if (!course) {
      return { data: null, error: 'Invalid course: the selected course does not exist or does not belong to this tenant workspace.' };
    }

    // Insert new lesson strictly with active tenant_id
    // Exclude unrelated fields like badge_id, lesson_count
    const { data, error } = await client
      .from('lessons')
      .insert({
        tenant_id: tenantId,
        course_id: params.course_id,
        title: params.title.trim(),
        summary: params.summary?.trim() || null,
        content: params.content?.trim() || null,
        video_url: params.video_url?.trim() || null,
        order_index: Math.max(0, Math.floor(params.order_index ?? 0)),
        duration_minutes: params.duration_minutes !== undefined ? params.duration_minutes : null,
        has_quiz: params.has_quiz ?? false,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as AcademyLesson, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTenantLesson(
  tenantId: string,
  lessonId: string,
  updates: Partial<Pick<AcademyLesson, 'course_id' | 'title' | 'summary' | 'content' | 'video_url' | 'order_index' | 'duration_minutes' | 'has_quiz'>>
): Promise<MutationResult<AcademyLesson>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase client is not initialized' };

  try {
    // If course_id is being updated, verify target course belongs to active tenant
    if (updates.course_id) {
      const { data: targetCourse, error: courseCheckError } = await client
        .from('courses')
        .select('id')
        .eq('id', updates.course_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (courseCheckError) {
        return { data: null, error: `Course verification error: ${courseCheckError.message}` };
      }
      if (!targetCourse) {
        return { data: null, error: 'Invalid course: the target course does not exist or does not belong to this tenant workspace.' };
      }
    }

    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.summary !== undefined) payload.summary = updates.summary?.trim() || null;
    if (updates.content !== undefined) payload.content = updates.content?.trim() || null;
    if (updates.video_url !== undefined) payload.video_url = updates.video_url?.trim() || null;
    if (updates.order_index !== undefined) payload.order_index = Math.max(0, Math.floor(updates.order_index));

    // Security sanitization: Never allow modifying tenant_id or unrelated fields
    delete payload.tenant_id;
    delete (payload as Record<string, unknown>).badge_id;
    delete (payload as Record<string, unknown>).lesson_count;

    const { data, error } = await client
      .from('lessons')
      .update(payload)
      .eq('id', lessonId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as AcademyLesson, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

