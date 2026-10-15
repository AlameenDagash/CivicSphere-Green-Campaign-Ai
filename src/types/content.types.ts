/**
 * CivicSphere AI — Content & Learning Domain Types
 * Defines data structures for Projects, Activities, Events, Announcements,
 * Documents, Media, Academy Courses, and Lessons within the active tenant.
 */

export type ProjectStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'on_hold' | 'archived';
export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type EventType = 'town_hall' | 'public_hearing' | 'workshop' | 'volunteer' | 'community_meeting' | 'other';
export type AnnouncementPriority = 'low' | 'normal' | 'important' | 'urgent';
export type DocumentCategory = 'policy' | 'bylaw' | 'financial_report' | 'public_notice' | 'minutes' | 'form' | 'other';
export type MediaType = 'image' | 'video' | 'audio' | 'document';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type SchemaTableStatus = 'ready' | 'missing_table' | 'unauthorized' | 'error';

export interface ContentQueryResult<T> {
  data: T[];
  error: string | null;
  tableStatus: SchemaTableStatus;
  errorMessage?: string;
  tableName: string;
}

// 1. Projects
export interface CivicProject {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  category?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  location?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// 2. Activities
export interface CivicActivity {
  id: string;
  tenant_id: string;
  project_id?: string | null;
  title: string;
  description: string | null;
  type?: string | null;
  status: ActivityStatus;
  date?: string | null;
  points_reward?: number | null;
  created_at: string;
  updated_at?: string | null;
}

// 3. Events
export interface CivicEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  venue?: string | null;
  start_time: string;
  end_time?: string | null;
  is_virtual?: boolean;
  meeting_link?: string | null;
  capacity?: number | null;
  rsvp_count?: number;
  created_at: string;
  updated_at?: string | null;
}

// 4. Announcements
export interface CivicAnnouncement {
  id: string;
  tenant_id: string;
  title: string;
  summary: string | null;
  content: string;
  priority: AnnouncementPriority;
  is_published: boolean;
  published_at?: string | null;
  author_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// 5. Documents
export interface CivicDocument {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  file_url: string;
  category: DocumentCategory;
  is_public: boolean;
  created_at: string;
  updated_at?: string | null;
}

// 6. Photos & Media
export interface CivicMediaItem {
  id: string;
  tenant_id: string;
  title: string;
  caption?: string | null;
  media_type: MediaType;
  url: string;
  thumbnail_url?: string | null;
  album?: string | null;
  file_size?: number | null;
  created_at: string;
  updated_at?: string | null;
}

// 7. Academy Courses
export interface AcademyCourse {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  level: CourseLevel;
  duration_minutes?: number | null;
  points_reward?: number | null;
  is_published: boolean;
  created_at: string;
  updated_at?: string | null;
  thumbnail_url?: string | null;
  badge_id?: string | null;
  /**
   * Derived / client-computed count of lessons belonging to this course.
   * Note: This is NOT a database column and must never be written to PostgreSQL.
   */
  lesson_count?: number;
}

// 8. Academy Lessons
export interface AcademyLesson {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  video_url?: string | null;
  order_index: number;
  duration_minutes?: number | null;
  has_quiz?: boolean;
  created_at: string;
  updated_at?: string | null;
}

// Content Summary for Dashboard
export interface ContentDomainSummary {
  projectsCount: number;
  activitiesCount: number;
  eventsCount: number;
  announcementsCount: number;
  documentsCount: number;
  mediaCount: number;
  coursesCount: number;
  lessonsCount: number;
  tablesStatus: Record<string, SchemaTableStatus>;
}
