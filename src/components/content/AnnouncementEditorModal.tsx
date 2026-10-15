import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicAnnouncement } from '../../types/content.types';
import { Megaphone, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface AnnouncementFormData {
  title: string;
  summary: string;
  content: string;
  priority: CivicAnnouncement['priority'];
  isPublished: boolean;
}

interface AnnouncementEditorModalProps {
  announcement: CivicAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    summary?: string;
    content: string;
    priority: CivicAnnouncement['priority'];
    is_published: boolean;
  }) => Promise<boolean>;
}

export const AnnouncementEditorModal: React.FC<AnnouncementEditorModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<CivicAnnouncement['priority']>('normal');
  const [isPublished, setIsPublished] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<AnnouncementFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): AnnouncementFormData => {
    return {
      title,
      summary,
      content,
      priority,
      isPublished,
    };
  }, [title, summary, content, priority, isPublished]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      summary !== initial.summary ||
      content !== initial.content ||
      priority !== initial.priority ||
      isPublished !== initial.isPublished
    );
  }, [title, summary, content, priority, isPublished]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: AnnouncementFormData;
    if (announcement) {
      base = {
        title: announcement.title,
        summary: announcement.summary || '',
        content: announcement.content,
        priority: announcement.priority,
        isPublished: announcement.is_published,
      };
    } else {
      base = {
        title: '',
        summary: '',
        content: '',
        priority: 'normal',
        isPublished: true,
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and announcement ID / create_new)
    const draft = loadDraft<AnnouncementFormData>('announcement', announcement?.id, tenantId);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setSummary(draft.summary ?? base.summary);
      setContent(draft.content ?? base.content);
      setPriority(draft.priority ?? base.priority);
      setIsPublished(draft.isPublished ?? base.isPublished);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setSummary(base.summary);
      setContent(base.content);
      setPriority(base.priority);
      setIsPublished(base.isPublished);
      setDraftRestored(false);
    }
    setError(null);
  }, [announcement, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('announcement', announcement?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, announcement?.id, tenantId]);

  // Browser navigation / tab switch guard
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
    clearDraft('announcement', announcement?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('announcement', announcement?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setSummary(base.summary);
      setContent(base.content);
      setPriority(base.priority);
      setIsPublished(base.isPublished);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (!content.trim()) {
        setError('Please enter the announcement body.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        priority,
        is_published: isPublished,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('announcement', announcement?.id, tenantId);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {announcement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <p className="text-xs text-slate-500">Official tenant bulletin and community broadcast</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Draft Restored Banner */}
        {draftRestored && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
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

        {/* Discard Confirmation Overlay */}
        {showDiscardConfirm && (
          <div className="bg-red-50/95 border-b border-red-200 px-6 py-3 shrink-0">
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Headline / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean Energy Grant Applications Now Open..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brief Summary <span className="text-slate-400 font-normal">(Optional teaser)</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-sentence overview shown on cards and previews..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CivicAnnouncement['priority'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-slate-700">Publish Immediately</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Body <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Complete announcement copy, guidelines, links, and contact info..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : announcement ? 'Save Changes' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
