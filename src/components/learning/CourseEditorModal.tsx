import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AcademyCourse, CourseLevel } from '../../types/content.types';
import { GraduationCap, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface CourseFormData {
  title: string;
  description: string;
  level: CourseLevel;
  durationMinutes: string;
  pointsReward: string;
  isPublished: boolean;
  thumbnailUrl: string;
}

interface CourseEditorModalProps {
  course: AcademyCourse | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    level: CourseLevel;
    duration_minutes?: number | null;
    points_reward?: number | null;
    is_published: boolean;
    thumbnail_url?: string | null;
  }) => Promise<boolean>;
}

export const CourseEditorModal: React.FC<CourseEditorModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CourseLevel>('beginner');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [pointsReward, setPointsReward] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Store initial state to detect changes
  const initialDataRef = useRef<CourseFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Helper to get current form snapshot
  const getFormSnapshot = useCallback((): CourseFormData => {
    return {
      title,
      description,
      level,
      durationMinutes,
      pointsReward,
      isPublished,
      thumbnailUrl,
    };
  }, [title, description, level, durationMinutes, pointsReward, isPublished, thumbnailUrl]);

  // Check if current form has unsaved changes compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      description !== initial.description ||
      level !== initial.level ||
      durationMinutes !== initial.durationMinutes ||
      pointsReward !== initial.pointsReward ||
      isPublished !== initial.isPublished ||
      thumbnailUrl !== initial.thumbnailUrl
    );
  }, [title, description, level, durationMinutes, pointsReward, isPublished, thumbnailUrl]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: CourseFormData;
    if (course) {
      base = {
        title: course.title,
        description: course.description || '',
        level: course.level,
        durationMinutes:
          course.duration_minutes !== null && course.duration_minutes !== undefined
            ? String(course.duration_minutes)
            : '',
        pointsReward:
          course.points_reward !== null && course.points_reward !== undefined
            ? String(course.points_reward)
            : '',
        isPublished: course.is_published,
        thumbnailUrl: course.thumbnail_url || '',
      };
    } else {
      base = {
        title: '',
        description: '',
        level: 'beginner',
        durationMinutes: '',
        pointsReward: '',
        isPublished: false,
        thumbnailUrl: '',
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists
    const draft = loadDraft<CourseFormData>('course', course?.id);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setDescription(draft.description ?? base.description);
      setLevel(draft.level ?? base.level);
      setDurationMinutes(draft.durationMinutes ?? base.durationMinutes);
      setPointsReward(draft.pointsReward ?? base.pointsReward);
      setIsPublished(draft.isPublished ?? base.isPublished);
      setThumbnailUrl(draft.thumbnailUrl ?? base.thumbnailUrl);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setDescription(base.description);
      setLevel(base.level);
      setDurationMinutes(base.durationMinutes);
      setPointsReward(base.pointsReward);
      setIsPublished(base.isPublished);
      setThumbnailUrl(base.thumbnailUrl);
      setDraftRestored(false);
    }
    setError(null);
  }, [course, isOpen]);

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
        saveDraft('course', course?.id, current);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, course?.id]);

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
    clearDraft('course', course?.id);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('course', course?.id);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setDescription(base.description);
      setLevel(base.level);
      setDurationMinutes(base.durationMinutes);
      setPointsReward(base.pointsReward);
      setIsPublished(base.isPublished);
      setThumbnailUrl(base.thumbnailUrl);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedDuration = durationMinutes.trim() ? parseInt(durationMinutes, 10) : null;
      if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration < 0)) {
        setError('Duration must be a positive number of minutes.');
        setIsSubmitting(false);
        return;
      }

      const parsedPoints = pointsReward.trim() ? parseInt(pointsReward, 10) : null;
      if (parsedPoints !== null && (isNaN(parsedPoints) || parsedPoints < 0)) {
        setError('Points reward must be a positive integer.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        duration_minutes: parsedDuration,
        points_reward: parsedPoints,
        is_published: isPublished,
        thumbnail_url: thumbnailUrl.trim() || null,
      });

      if (success) {
        // Clear saved temporary draft on successful persist
        clearDraft('course', course?.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course');
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {course ? 'Edit Course' : 'Create Civic Academy Course'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {course ? 'Update course curriculum details' : 'Draft a new civic course curriculum'}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Local Civic Governance"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Overview
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of what civic learners will master in this course..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white resize-y min-h-[5rem] max-h-[16rem] leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulty Level <span className="text-red-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CourseLevel)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white text-slate-700"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Duration (Minutes)
              </label>
              <input
                type="number"
                min="0"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Points Reward (Completion)
              </label>
              <input
                type="number"
                min="0"
                value={pointsReward}
                onChange={(e) => setPointsReward(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thumbnail Image URL
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Publication Status Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900">
                  Published to Civic Learners
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When unchecked, the course remains a draft visible only to Content Managers.
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
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
