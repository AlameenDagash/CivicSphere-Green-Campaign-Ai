import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AcademyLesson, AcademyCourse } from '../../types/content.types';
import { BookOpen, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface LessonFormData {
  courseId: string;
  title: string;
  summary: string;
  content: string;
  videoUrl: string;
  orderIndex: string;
  durationMinutes: string;
  hasQuiz: boolean;
}

interface LessonEditorModalProps {
  lesson: AcademyLesson | null;
  courses: AcademyCourse[];
  defaultCourseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    course_id: string;
    title: string;
    summary?: string;
    content?: string;
    video_url?: string;
    order_index: number;
    duration_minutes?: number | null;
    has_quiz: boolean;
  }) => Promise<boolean>;
}

export const LessonEditorModal: React.FC<LessonEditorModalProps> = ({
  lesson,
  courses,
  defaultCourseId,
  isOpen,
  onClose,
  onSave,
}) => {
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [hasQuiz, setHasQuiz] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Store initial baseline data to detect unsaved changes
  const initialDataRef = useRef<LessonFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Helper to get current form snapshot
  const getFormSnapshot = useCallback((): LessonFormData => {
    return {
      courseId,
      title,
      summary,
      content,
      videoUrl,
      orderIndex,
      durationMinutes,
      hasQuiz,
    };
  }, [courseId, title, summary, content, videoUrl, orderIndex, durationMinutes, hasQuiz]);

  // Check if current form has unsaved changes compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      courseId !== initial.courseId ||
      title !== initial.title ||
      summary !== initial.summary ||
      content !== initial.content ||
      videoUrl !== initial.videoUrl ||
      orderIndex !== initial.orderIndex ||
      durationMinutes !== initial.durationMinutes ||
      hasQuiz !== initial.hasQuiz
    );
  }, [courseId, title, summary, content, videoUrl, orderIndex, durationMinutes, hasQuiz]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: LessonFormData;
    if (lesson) {
      base = {
        courseId: lesson.course_id,
        title: lesson.title,
        summary: lesson.summary || '',
        content: lesson.content || '',
        videoUrl: lesson.video_url || '',
        orderIndex: String(lesson.order_index ?? 0),
        durationMinutes:
          lesson.duration_minutes !== null && lesson.duration_minutes !== undefined
            ? String(lesson.duration_minutes)
            : '',
        hasQuiz: lesson.has_quiz ?? false,
      };
    } else {
      base = {
        courseId: defaultCourseId || (courses.length > 0 ? courses[0].id : ''),
        title: '',
        summary: '',
        content: '',
        videoUrl: '',
        orderIndex: '0',
        durationMinutes: '',
        hasQuiz: false,
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists
    const draft = loadDraft<LessonFormData>('lesson', lesson?.id);
    if (draft) {
      setCourseId(draft.courseId ?? base.courseId);
      setTitle(draft.title ?? base.title);
      setSummary(draft.summary ?? base.summary);
      setContent(draft.content ?? base.content);
      setVideoUrl(draft.videoUrl ?? base.videoUrl);
      setOrderIndex(draft.orderIndex ?? base.orderIndex);
      setDurationMinutes(draft.durationMinutes ?? base.durationMinutes);
      setHasQuiz(draft.hasQuiz ?? base.hasQuiz);
      setDraftRestored(true);
    } else {
      setCourseId(base.courseId);
      setTitle(base.title);
      setSummary(base.summary);
      setContent(base.content);
      setVideoUrl(base.videoUrl);
      setOrderIndex(base.orderIndex);
      setDurationMinutes(base.durationMinutes);
      setHasQuiz(base.hasQuiz);
      setDraftRestored(false);
    }
    setError(null);
  }, [lesson, defaultCourseId, courses, isOpen]);

  // Body scroll locking while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Debounced auto-save of draft to sessionStorage
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('lesson', lesson?.id, current);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, lesson?.id]);

  // Accidental browser unload/refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpen && hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, hasUnsavedChanges]);

  if (!isOpen) return null;

  // Safe Cancel / Close handling
  const handleRequestClose = () => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    clearDraft('lesson', lesson?.id);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('lesson', lesson?.id);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setCourseId(base.courseId);
      setTitle(base.title);
      setSummary(base.summary);
      setContent(base.content);
      setVideoUrl(base.videoUrl);
      setOrderIndex(base.orderIndex);
      setDurationMinutes(base.durationMinutes);
      setHasQuiz(base.hasQuiz);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedOrder = parseInt(orderIndex, 10);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        setError('Order index must be a non-negative integer.');
        setIsSubmitting(false);
        return;
      }

      const parsedDuration = durationMinutes.trim() ? parseInt(durationMinutes, 10) : null;
      if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration < 0)) {
        setError('Duration must be a positive number of minutes.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        course_id: courseId,
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        order_index: parsedOrder,
        duration_minutes: parsedDuration,
        has_quiz: hasQuiz,
      });

      if (success) {
        // Clear saved temporary draft on successful persist
        clearDraft('lesson', lesson?.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {lesson ? 'Edit Lesson' : 'Create Civic Lesson'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lesson ? 'Update curriculum lesson module' : 'Add a lesson to a course'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Draft Restored Banner */}
        {draftRestored && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Restored your unsaved draft.</span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraftOnly}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline ml-2"
            >
              Reset to original
            </button>
          </div>
        )}

        {/* Discard Confirmation Modal Overlay */}
        {showDiscardConfirm && (
          <div className="bg-red-50/95 border-b border-red-200 px-5 sm:px-6 py-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900">
                  You have unsaved changes. Discard them?
                </p>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Discarding will erase the temporary draft you typed in this editor session.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Continue Editing
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDiscard}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-2xs"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Body with internal scrolling */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Course Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            {courses.length === 0 ? (
              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800">
                No courses available. Please create a course first before creating lessons.
              </div>
            ) : (
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white text-slate-700"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.level})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Structure of City Council & Commissions"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Summary / Short Description
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of key concepts covered in this lesson..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          {/* Content / Lecture Notes - Enhanced long text field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Lesson Text / Curriculum Content
              </label>
              <span className="text-[10px] text-slate-400">Multi-line markdown & notes supported</span>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Full curriculum text, reading notes, and reference links..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white resize-y min-h-[8rem] max-h-[24rem] leading-relaxed font-sans"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Video URL (Optional)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or MP4 URL"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          {/* Numeric Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Index <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Defines playback order (0, 1, 2...)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Has Quiz Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900">
                  Includes Lesson Quiz
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Flags whether a quiz is associated with this lesson module.
                </p>
              </div>
            </label>
          </div>

          {/* Sticky Footer inside Form */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !courseId || courses.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : lesson ? 'Update Lesson' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
