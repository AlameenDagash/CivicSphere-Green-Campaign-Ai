import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useEntitlements } from '../../hooks/useEntitlements';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  GraduationCap,
  BookOpen,
  Video,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ShieldCheck,
  PlayCircle,
  HelpCircle,
  ChevronRight,
  Layers,
  Plus,
  Edit2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { SchemaStatusBanner } from '../../components/common/SchemaStatusBanner';
import { CourseEditorModal } from '../../components/learning/CourseEditorModal';
import { LessonEditorModal } from '../../components/learning/LessonEditorModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  setActiveModalState,
  getActiveModalState,
  clearActiveModalState,
} from '../../utils/draftStorage';
import {
  fetchTenantCourses,
  fetchTenantLessons,
  createTenantCourse,
  updateTenantCourse,
  createTenantLesson,
  updateTenantLesson,
} from '../../services/contentService';
import {
  enrollInCourse,
  completeLesson,
  fetchUserCourseEnrollments,
  fetchUserCourseLessonCompletions,
} from '../../services/enrollmentService';
import { fetchQuizIdForLesson } from '../../services/quizService';
import { LessonQuizViewer } from '../../components/learning/LessonQuizViewer';
import type { AcademyCourse, AcademyLesson, CourseLevel, SchemaTableStatus } from '../../types/content.types';
import type { CourseEnrollment } from '../../types/enrollment.types';

type LearningTab = 'courses' | 'lessons';

export const LearningModulePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeTenant, isContentLearningManager, isPlatformOwner, roleDisplayName } = useTenant();
  const { hasFeature, planName } = useEntitlements();
  const { t } = useLanguage();

  // Requirement: content_learning_manager and platform_owner can manage courses and lessons.
  // Operations & Rewards Manager and public_user must NOT receive management controls.
  const isManager = isContentLearningManager || isPlatformOwner;

  const isAcademyEntitled = hasFeature('academy');

  const activeTab = (searchParams.get('tab') as LearningTab) || 'courses';
  const handleTabChange = (tab: LearningTab) => {
    setSelectedCourse(null);
    setSelectedCourseLessons([]);
    setSelectedLesson(null);
    setSearchParams({ tab });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  // Learner drill-down course detail state
  const [selectedCourse, setSelectedCourse] = useState<AcademyCourse | null>(null);
  const [selectedCourseLessons, setSelectedCourseLessons] = useState<AcademyLesson[]>([]);
  const [isLoadingCourseLessons, setIsLoadingCourseLessons] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<AcademyLesson | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);

  // Course create/edit modal states
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AcademyCourse | null>(null);

  // Lesson create/edit modal states
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<AcademyLesson | null>(null);

  const [coursesTableStatus, setCoursesTableStatus] = useState<SchemaTableStatus>('ready');
  const [lessonsTableStatus, setLessonsTableStatus] = useState<SchemaTableStatus>('ready');
  const [coursesError, setCoursesError] = useState<string>('');
  const [lessonsError, setLessonsError] = useState<string>('');

  const loadData = async () => {
    if (!activeTenant) return;
    setIsLoading(true);
    setActionError(null);

    try {
      if (activeTab === 'courses') {
        const [res, enrollRes] = await Promise.all([
          fetchTenantCourses(activeTenant.id),
          user?.id ? fetchUserCourseEnrollments(activeTenant.id, user.id) : Promise.resolve({ enrollments: [], error: null }),
        ]);
        setCourses(res.data);
        setCoursesTableStatus(res.tableStatus);
        setCoursesError(res.error || '');
        if (enrollRes.enrollments) {
          setEnrollments(enrollRes.enrollments);
        }
      } else {
        // When on lessons tab, load both lessons and courses (so manager can pick from active tenant courses)
        const [lessonsRes, coursesRes] = await Promise.all([
          fetchTenantLessons(activeTenant.id),
          fetchTenantCourses(activeTenant.id),
        ]);
        setLessons(lessonsRes.data);
        setLessonsTableStatus(lessonsRes.tableStatus);
        setLessonsError(lessonsRes.error || '');

        setCourses(coursesRes.data);
        setCoursesTableStatus(coursesRes.tableStatus);
        setCoursesError(coursesRes.error || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenant?.id, activeTab, user?.id]);

  // Learning Editor Modal Restoration on mount / tenant change
  useEffect(() => {
    if (!activeTenant) return;

    const savedModal = getActiveModalState();
    if (!savedModal) return;

    // Tenant isolation: if stored tenant doesn't match active tenant, clear and do not restore
    if (savedModal.tenantId !== activeTenant.id) {
      clearActiveModalState();
      return;
    }

    if (savedModal.type !== 'course' && savedModal.type !== 'lesson') {
      return; // Belongs to another module (e.g. Content)
    }

    // CREATE MODE RESTORATION
    if (savedModal.mode === 'create') {
      if (savedModal.type === 'course') {
        setEditingCourse(null);
        setIsCourseModalOpen(true);
      } else if (savedModal.type === 'lesson') {
        setEditingLesson(null);
        setIsLessonModalOpen(true);
      }
      return;
    }

    // EDIT MODE RESTORATION
    if (savedModal.mode === 'edit') {
      if (!savedModal.id) {
        clearActiveModalState();
        return;
      }

      const targetId = savedModal.id;
      const tenantId = activeTenant.id;

      if (savedModal.type === 'course') {
        const found = courses.find((c) => c.id === targetId);
        if (found) {
          setEditingCourse(found);
          setIsCourseModalOpen(true);
        } else {
          fetchTenantCourses(tenantId).then((res) => {
            const item = res.data.find((c) => c.id === targetId);
            if (item) {
              setEditingCourse(item);
              setIsCourseModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      } else if (savedModal.type === 'lesson') {
        const found = lessons.find((l) => l.id === targetId);
        if (found) {
          setEditingLesson(found);
          setIsLessonModalOpen(true);
        } else {
          fetchTenantLessons(tenantId).then((res) => {
            const item = res.data.find((l) => l.id === targetId);
            if (item) {
              setEditingLesson(item);
              setIsLessonModalOpen(true);
            } else {
              clearActiveModalState();
            }
          });
        }
      }
    }
  }, [activeTenant?.id]);

  const currentStatus = activeTab === 'courses' ? coursesTableStatus : lessonsTableStatus;
  const currentError = activeTab === 'courses' ? coursesError : lessonsError;
  const currentTableName = activeTab === 'courses' ? 'courses' : 'lessons';
  const currentCols =
    activeTab === 'courses'
      ? ['id', 'tenant_id', 'title', 'description', 'level', 'duration_minutes', 'points_reward', 'is_published', 'created_at']
      : ['id', 'tenant_id', 'course_id', 'title', 'summary', 'video_url', 'order_index', 'duration_minutes', 'has_quiz', 'created_at'];

  // Handlers for course create & edit (scoped strictly to activeTenant.id)
  const handleOpenCreateCourse = () => {
    if (activeTenant) {
      setActiveModalState({
        tenantId: activeTenant.id,
        type: 'course',
        mode: 'create',
        id: null,
      });
    }
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: AcademyCourse) => {
    if (activeTenant) {
      setActiveModalState({
        tenantId: activeTenant.id,
        type: 'course',
        mode: 'edit',
        id: course.id,
      });
    }
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (data: {
    title: string;
    description?: string;
    level: CourseLevel;
    duration_minutes?: number | null;
    points_reward?: number | null;
    is_published: boolean;
    thumbnail_url?: string | null;
  }): Promise<boolean> => {
    if (!activeTenant) return false;
    setActionError(null);

    if (editingCourse) {
      // Update existing course
      const res = await updateTenantCourse(activeTenant.id, editingCourse.id, {
        title: data.title,
        description: data.description,
        level: data.level,
        duration_minutes: data.duration_minutes,
        points_reward: data.points_reward,
        is_published: data.is_published,
        thumbnail_url: data.thumbnail_url,
      });

      if (res.error) {
        setActionError(res.error);
        return false;
      }
    } else {
      // Create new course - uses active tenant ID only
      const res = await createTenantCourse(activeTenant.id, {
        title: data.title,
        description: data.description,
        level: data.level,
        duration_minutes: data.duration_minutes,
        points_reward: data.points_reward,
        is_published: data.is_published,
        thumbnail_url: data.thumbnail_url,
      });

      if (res.error) {
        setActionError(res.error);
        return false;
      }
    }

    clearActiveModalState();
    await loadData();
    return true;
  };

  // Handlers for lesson create & edit (scoped strictly to activeTenant.id)
  const handleOpenCreateLesson = () => {
    if (activeTenant) {
      setActiveModalState({
        tenantId: activeTenant.id,
        type: 'lesson',
        mode: 'create',
        id: null,
      });
    }
    setEditingLesson(null);
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: AcademyLesson) => {
    if (activeTenant) {
      setActiveModalState({
        tenantId: activeTenant.id,
        type: 'lesson',
        mode: 'edit',
        id: lesson.id,
      });
    }
    setEditingLesson(lesson);
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (data: {
    course_id: string;
    title: string;
    summary?: string;
    content?: string;
    video_url?: string;
    order_index: number;
    duration_minutes?: number | null;
    has_quiz: boolean;
  }): Promise<boolean> => {
    if (!activeTenant) return false;
    setActionError(null);

    if (editingLesson) {
      // Update existing lesson
      const res = await updateTenantLesson(activeTenant.id, editingLesson.id, {
        course_id: data.course_id,
        title: data.title,
        summary: data.summary,
        content: data.content,
        video_url: data.video_url,
        order_index: data.order_index,
        duration_minutes: data.duration_minutes,
        has_quiz: data.has_quiz,
      });

      if (res.error) {
        setActionError(res.error);
        return false;
      }
    } else {
      // Create new lesson - uses active tenant ID only
      const res = await createTenantLesson(activeTenant.id, {
        course_id: data.course_id,
        title: data.title,
        summary: data.summary,
        content: data.content,
        video_url: data.video_url,
        order_index: data.order_index,
        duration_minutes: data.duration_minutes,
        has_quiz: data.has_quiz,
      });

      if (res.error) {
        setActionError(res.error);
        return false;
      }
    }

    // Refresh lessons data without altering filters or search state
    clearActiveModalState();
    await loadData();
    return true;
  };

  // Quick toggle publication status for managers
  const handleTogglePublish = async (course: AcademyCourse) => {
    if (!activeTenant || !isManager) return;
    setActionError(null);

    const res = await updateTenantCourse(activeTenant.id, course.id, {
      is_published: !course.is_published,
    });

    if (res.error) {
      setActionError(res.error);
    } else {
      await loadData();
    }
  };

  // Learner drill-down: select course and fetch lessons strictly for that course
  const handleSelectCourse = async (course: AcademyCourse) => {
    if (!activeTenant) return;
    setSelectedCourse(course);
    setIsLoadingCourseLessons(true);
    setActionError(null);

    try {
      const [lessonsRes, completionsRes] = await Promise.all([
        fetchTenantLessons(activeTenant.id, course.id),
        user?.id
          ? fetchUserCourseLessonCompletions(activeTenant.id, user.id, course.id)
          : Promise.resolve({ completedLessonIds: [], error: null }),
      ]);

      if (lessonsRes.error) {
        setActionError(lessonsRes.error);
        setSelectedCourseLessons([]);
      } else {
        setSelectedCourseLessons(lessonsRes.data);
      }

      if (completionsRes.error) {
        setActionError(completionsRes.error);
      } else if (completionsRes.completedLessonIds) {
        setCompletedLessonIds(new Set(completionsRes.completedLessonIds));
      }
    } finally {
      setIsLoadingCourseLessons(false);
    }
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedCourseLessons([]);
    setSelectedLesson(null);
    setActiveQuizId(null);
    setCompletedLessonIds(new Set());
  };

  // Learner lesson viewer: opens a lesson belonging to the currently selected course
  const handleSelectLesson = (lesson: AcademyLesson) => {
    if (selectedCourse && lesson.course_id === selectedCourse.id) {
      setSelectedLesson(lesson);
      setActiveQuizId(null);
    }
  };

  const handleBackToCourse = () => {
    setSelectedLesson(null);
    setActiveQuizId(null);
  };

  // Learner lesson opener from all-lessons list
  const handleOpenLessonFromList = async (lesson: AcademyLesson) => {
    // 1. Find the parent course from the existing courses state using lesson.course_id
    let parentCourse = courses.find((c) => c.id === lesson.course_id);
    if (!parentCourse && activeTenant) {
      const res = await fetchTenantCourses(activeTenant.id);
      if (res.data) {
        setCourses(res.data);
        parentCourse = res.data.find((c) => c.id === lesson.course_id);
      }
    }
    if (!parentCourse) return;

    // 2. Set selectedCourse to that course
    setSelectedCourse(parentCourse);

    // 3. Set selectedLesson to that lesson
    setSelectedLesson(lesson);

    // 4. Clear activeQuizId
    setActiveQuizId(null);

    // 5. Switch to the existing Courses/lesson-viewer path
    setSearchParams({ tab: 'courses' });

    // Sync course lessons and learner lesson completions for course context
    if (activeTenant) {
      try {
        const [lessonsRes, completionsRes] = await Promise.all([
          fetchTenantLessons(activeTenant.id, parentCourse.id),
          user?.id
            ? fetchUserCourseLessonCompletions(activeTenant.id, user.id, parentCourse.id)
            : Promise.resolve({ completedLessonIds: [], error: null }),
        ]);
        if (lessonsRes.data) {
          setSelectedCourseLessons(lessonsRes.data);
        }
        if (completionsRes.completedLessonIds) {
          setCompletedLessonIds(new Set(completionsRes.completedLessonIds));
        }
      } catch (err) {
        console.error('Error syncing course context for lesson:', err);
      }
    }
  };

  // Live Learner Course Enrollment via public.enroll_in_course RPC
  const handleEnrollCourse = async (courseId: string) => {
    if (!activeTenant) return;
    if (!user) {
      setActionError('Please sign in to enroll in this course.');
      return;
    }
    setActionError(null);
    setEnrollingCourseId(courseId);

    try {
      const res = await enrollInCourse(activeTenant.id, courseId);
      if (res.error) {
        setActionError(res.error);
      } else {
        // Refresh real enrollment state from Supabase
        const enrollRes = await fetchUserCourseEnrollments(activeTenant.id, user.id);
        if (enrollRes.enrollments) {
          setEnrollments(enrollRes.enrollments);
        }
      }
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Live Learner Lesson Completion via public.complete_lesson RPC
  const handleCompleteLesson = async (options?: { fromQuizPass?: boolean }) => {
    if (!activeTenant || !selectedCourse || !selectedLesson) return;
    if (!user) {
      setActionError('Please sign in to complete lessons.');
      return;
    }
    if (isCompletingLesson) return;

    // Defensive guard: a quiz-backed lesson cannot be manually completed before passing its quiz
    if (selectedLesson.has_quiz && !options?.fromQuizPass && !completedLessonIds.has(selectedLesson.id)) {
      setActionError('Complete the quiz to finish this lesson.');
      return;
    }

    setActionError(null);
    setIsCompletingLesson(true);

    try {
      const res = await completeLesson(activeTenant.id, selectedCourse.id, selectedLesson.id);

      if (res.error) {
        setActionError(res.error);
        return;
      }

      // Mark lesson completed in current session
      setCompletedLessonIds((prev) => new Set([...prev, selectedLesson.id]));

      // Immediately update local enrollments with exact values returned by the RPC
      setEnrollments((prev) => {
        const existingIdx = prev.findIndex((e) => e.course_id === selectedCourse.id);
        const updatedStatus = (res.course_status === 'completed' ? 'completed' : 'in_progress') as CourseEnrollment['status'];

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            progress_percent: res.progress_percent,
            status: updatedStatus,
            completed_at: res.course_status === 'completed' ? (next[existingIdx].completed_at || new Date().toISOString()) : next[existingIdx].completed_at,
            updated_at: new Date().toISOString(),
          };
          return next;
        } else {
          // If no enrollment existed yet in state, synthesize the record with RPC output
          return [
            ...prev,
            {
              id: `synth-${Date.now()}`,
              tenant_id: activeTenant.id,
              user_id: user.id,
              course_id: selectedCourse.id,
              status: updatedStatus,
              progress_percent: res.progress_percent,
              enrolled_at: new Date().toISOString(),
              completed_at: res.course_status === 'completed' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
          ];
        }
      });
    } finally {
      setIsCompletingLesson(false);
    }
  };

  // Learner Take Quiz Handler: safely resolves quizId via fetchQuizIdForLesson
  const handleTakeQuiz = async () => {
    if (!activeTenant || !selectedLesson) return;
    setActionError(null);
    setIsLoadingQuiz(true);

    try {
      const res = await fetchQuizIdForLesson(activeTenant.id, selectedLesson.id);
      if (res.error) {
        setActionError(res.error);
      } else if (!res.quizId) {
        setActionError('No quiz is currently configured for this lesson.');
      } else {
        setActiveQuizId(res.quizId);
      }
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Quiz Pass Callback: triggers authoritative lesson completion if not already completed
  const handleQuizPass = async () => {
    if (!selectedLesson || completedLessonIds.has(selectedLesson.id)) {
      return;
    }
    await handleCompleteLesson({ fromQuizPass: true });
  };

  // Filtering
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [courses, searchQuery, levelFilter]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      return (
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.summary && l.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [lessons, searchQuery]);

  if (!activeTenant) {
    return (
      <EmptyState
        title="No Active Tenant Selected"
        description="Please select a tenant workspace to view civic academy and learning courses."
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
              <span>{activeTenant.name}</span>
              <span aria-hidden="true">·</span>
              <span>Civic Academy</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 break-words">
              {t('learning.title')}
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed break-words">
              {t('learning.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Manager Create Button: Only for content_learning_manager and platform_owner */}
            {isManager && activeTab === 'courses' && (
              <button
                type="button"
                onClick={handleOpenCreateCourse}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('learning.createCourse')}</span>
              </button>
            )}

            {isManager && activeTab === 'lessons' && (
              <button
                type="button"
                onClick={handleOpenCreateLesson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('learning.createLesson')}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-500">{t('tenant.activeRole')}:</span>
              <span className="font-semibold text-slate-900">{roleDisplayName}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs disabled:opacity-50 shrink-0"
              title={t('action.refresh')}
              aria-label={t('action.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('courses')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-2xs ${
                activeTab === 'courses'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{t('learning.tabCourses')}</span>
              {courses.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                  {courses.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('lessons')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-2xs ${
                activeTab === 'lessons'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('learning.tabLessons')}</span>
              {lessons.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                  {lessons.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Error Notification */}
      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 font-semibold"
          >
            {t('action.dismiss')}
          </button>
        </div>
      )}

      {/* Subscription Entitlement Notice if academy feature disabled */}
      {!isAcademyEntitled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 flex items-start gap-3">
          <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Subscription Entitlement Notice:</span> The current subscription plan (
            <span className="font-semibold font-mono">{planName}</span>) does not include full Academy entitlements. Upgrade to access interactive video quiz creation.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {!selectedCourse && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('content.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-shadow"
            />
          </div>

          {activeTab === 'courses' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{t('learning.level')}:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">{t('learning.levelAll')}</option>
                <option value="beginner">{t('learning.levelBeginner')}</option>
                <option value="intermediate">{t('learning.levelIntermediate')}</option>
                <option value="advanced">{t('learning.levelAdvanced')}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Schema / RLS Alert Banner */}
      <SchemaStatusBanner
        tableName={currentTableName}
        tableStatus={currentStatus}
        errorMessage={currentError}
        expectedColumns={currentCols}
        onRetry={loadData}
      />

      {/* Content Rendering */}
      {isLoading ? (
        <div className="py-12 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-center">
          <LoadingSpinner message={t('state.loading')} />
        </div>
      ) : currentStatus === 'ready' ? (
        <div className="space-y-4">
          {activeTab === 'courses' ? (
            selectedLesson ? (
              activeQuizId && activeTenant ? (
                /* Public Learner Quiz Viewer */
                <LessonQuizViewer
                  quizId={activeQuizId}
                  tenantId={activeTenant.id}
                  onPass={handleQuizPass}
                  onBack={() => setActiveQuizId(null)}
                />
              ) : (
                /* Public Learner Lesson Viewer */
                <div className="space-y-6">
                {/* Lesson Viewer Header */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleBackToCourse}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-2xs self-start"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('learning.backToCourse')}</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {t('learning.lessonNum')} #{selectedLesson.order_index}
                      </span>

                      {selectedLesson.video_url && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Video className="w-3 h-3 text-blue-600" />
                          <span>{t('domain.video')}</span>
                        </span>
                      )}

                      {selectedLesson.duration_minutes ? (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{selectedLesson.duration_minutes} mins</span>
                        </span>
                      ) : null}

                      {/* Quiz & Completion Actions */}
                      {selectedLesson.has_quiz ? (
                        completedLessonIds.has(selectedLesson.id) ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg cursor-default shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t('learning.lessonCompleted')}</span>
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              Complete the quiz to finish this lesson.
                            </span>
                            <button
                              type="button"
                              disabled={isLoadingQuiz}
                              onClick={handleTakeQuiz}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors shadow-2xs"
                            >
                              {isLoadingQuiz ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>{t('quiz.loading')}</span>
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>{t('learning.takeQuiz')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )
                      ) : (
                        /* Content-only lesson without quiz */
                        completedLessonIds.has(selectedLesson.id) ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg cursor-default shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t('learning.lessonCompleted')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isCompletingLesson}
                            onClick={() => handleCompleteLesson()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors shadow-2xs disabled:cursor-not-allowed"
                          >
                            {isCompletingLesson ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>{t('state.completing')}</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('learning.completeLesson')}</span>
                              </>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {selectedCourse && (
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                        {selectedCourse.title}
                      </div>
                    )}
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 break-words">
                      {selectedLesson.title}
                    </h2>
                    {selectedLesson.summary && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-3xl break-words">
                        {selectedLesson.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lesson Content Body */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 pb-3 border-b border-slate-100">
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <span>{t('learning.lessonMaterial')}</span>
                  </div>

                  {selectedLesson.content ? (
                    <div className="prose prose-slate max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans break-words">
                      {selectedLesson.content}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No written curriculum notes provided for this lesson.
                    </p>
                  )}
                </div>
              </div>
              )
            ) : selectedCourse ? (
              /* Selected Course Detail View (Learner Course Drill-down) */
              <div className="space-y-6">
                {/* Detail View Header */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleBackToCourses}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-2xs self-start"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{t('learning.backToCourses')}</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Course Level */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedCourse.level}
                      </span>

                      {/* Course Duration */}
                      {selectedCourse.duration_minutes ? (
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{selectedCourse.duration_minutes} mins</span>
                        </span>
                      ) : null}

                      {/* Points Reward */}
                      {selectedCourse.points_reward ? (
                        <span className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>+{selectedCourse.points_reward} Points</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 break-words">
                      {selectedCourse.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl break-words">
                      {selectedCourse.description || 'No detailed description provided for this course.'}
                    </p>
                  </div>

                  {/* Enrollment Status & Progress */}
                  {(() => {
                    const enrollment = enrollments.find((e) => e.course_id === selectedCourse.id);
                    const progressPercent = enrollment?.progress_percent ?? 0;
                    const isCompleted = enrollment?.status === 'completed';

                    return (
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">{t('learning.enrollmentStatus')}:</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isCompleted ? t('state.completed') : t('state.inProgress')}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 sm:w-64">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-700 shrink-0">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Course Lessons List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-600" />
                      <span>{t('learning.courseLessons')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                        {selectedCourseLessons.length}
                      </span>
                    </h3>
                  </div>

                  {isLoadingCourseLessons ? (
                    <div className="py-8 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-center">
                      <LoadingSpinner message={t('state.loading')} />
                    </div>
                  ) : selectedCourseLessons.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title={t('learning.noCourseLessons')}
                      description="This course does not have any published lessons yet. Check back soon."
                    />
                  ) : (
                    <div className="space-y-3">
                      {selectedCourseLessons.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => handleSelectLesson(l)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectLesson(l);
                            }
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shrink-0 font-bold text-xs font-mono">
                              #{l.order_index}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate sm:line-clamp-2">
                                {l.title}
                              </h4>
                              {l.summary && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {l.summary}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 text-xs self-start sm:self-center">
                            {l.video_url && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <Video className="w-3 h-3 text-blue-600" />
                                <span>{t('domain.video')}</span>
                              </span>
                            )}
                            {l.has_quiz && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <HelpCircle className="w-3 h-3 text-emerald-600" />
                                <span>{t('quiz.title')}</span>
                              </span>
                            )}
                            {l.duration_minutes && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                {l.duration_minutes}m
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title={t('learning.noCourses')}
                description={
                  isManager
                    ? `No courses found. As a Content & Learning Manager, click "New Course" above to create your first curriculum module.`
                    : `There are currently no active academy courses published for ${activeTenant.name}. Courses will appear here once published.`
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      {c.thumbnail_url && (
                        <div className="h-32 w-full rounded-lg overflow-hidden bg-slate-100">
                          <img
                            src={c.thumbnail_url}
                            alt={c.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image gracefully
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{c.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Manager publication badge */}
                          {isManager && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                                c.is_published
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {c.is_published ? t('state.published') : t('state.draft')}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {c.level}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {c.description || 'No course overview provided.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        {c.duration_minutes ? (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{c.duration_minutes} mins</span>
                          </div>
                        ) : (
                          <div />
                        )}
                        {c.points_reward ? (
                          <div className="flex items-center gap-1 text-amber-700 font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>+{c.points_reward} Points</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Learner Enrollment & Status Section */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {(() => {
                          const enrollment = enrollments.find((e) => e.course_id === c.id);
                          const isEnrolled = !!enrollment;
                          const isEnrolling = enrollingCourseId === c.id;

                          if (isEnrolled) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleSelectCourse(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                              >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>{t('learning.continueCourse')}</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => handleEnrollCourse(c.id)}
                              disabled={isEnrolling}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                            >
                              {isEnrolling ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>{t('learning.enrolling')}</span>
                                </>
                              ) : (
                                <>
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>{t('learning.enroll')}</span>
                                </>
                              )}
                            </button>
                          );
                        })()}

                        {/* Manager Controls: Edit and Quick Toggle Published */}
                        {isManager && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(c)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              title={c.is_published ? 'Unpublish to draft' : 'Publish course'}
                            >
                              {c.is_published ? (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  <span>{t('action.unpublish')}</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-slate-400" />
                                  <span>{t('action.publish')}</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCourse(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{t('action.edit')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredLessons.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={t('learning.noLessons')}
                description={`No lessons have been created yet for ${activeTenant.name}. Lessons belong to courses and contain educational videos and text.`}
              />
            ) : (
              <div className="space-y-3">
                {filteredLessons.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => handleOpenLessonFromList(l)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenLessonFromList(l);
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shrink-0 font-bold text-xs font-mono">
                        #{l.order_index}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate sm:line-clamp-2">{l.title}</h4>
                        {l.summary && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{l.summary}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 text-xs self-start sm:self-center">
                      {l.video_url && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Video className="w-3 h-3 text-blue-600" />
                          <span>{t('domain.video')}</span>
                        </span>
                      )}
                      {l.has_quiz && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <HelpCircle className="w-3 h-3 text-emerald-600" />
                          <span>{t('quiz.title')}</span>
                        </span>
                      )}
                      {l.duration_minutes && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {l.duration_minutes}m
                        </span>
                      )}
                      {isManager && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditLesson(l);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors ml-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{t('action.edit')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : null}

      {/* Course Create / Edit Modal */}
      {isManager && (
        <CourseEditorModal
          course={editingCourse}
          isOpen={isCourseModalOpen}
          onClose={() => {
            clearActiveModalState();
            setIsCourseModalOpen(false);
            setEditingCourse(null);
          }}
          onSave={handleSaveCourse}
        />
      )}

      {/* Lesson Create / Edit Modal */}
      {isManager && (
        <LessonEditorModal
          lesson={editingLesson}
          courses={courses}
          isOpen={isLessonModalOpen}
          onClose={() => {
            clearActiveModalState();
            setIsLessonModalOpen(false);
            setEditingLesson(null);
          }}
          onSave={handleSaveLesson}
        />
      )}
    </div>
  );
};
