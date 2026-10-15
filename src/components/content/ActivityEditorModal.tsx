import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicActivity, CivicProject } from '../../types/content.types';
import { Zap, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface ActivityFormData {
  projectId: string;
  title: string;
  description: string;
  type: string;
  status: CivicActivity['status'];
  date: string;
  pointsReward: string;
}

interface ActivityEditorModalProps {
  activity: CivicActivity | null;
  projects: CivicProject[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    project_id?: string;
    title: string;
    description?: string;
    type?: string;
    status: CivicActivity['status'];
    date?: string;
    points_reward?: number;
  }) => Promise<boolean>;
}

export const ActivityEditorModal: React.FC<ActivityEditorModalProps> = ({
  activity,
  projects,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [projectId, setProjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState<CivicActivity['status']>('planned');
  const [date, setDate] = useState('');
  const [pointsReward, setPointsReward] = useState<string>('25');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<ActivityFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): ActivityFormData => {
    return {
      projectId,
      title,
      description,
      type,
      status,
      date,
      pointsReward,
    };
  }, [projectId, title, description, type, status, date, pointsReward]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      projectId !== initial.projectId ||
      title !== initial.title ||
      description !== initial.description ||
      type !== initial.type ||
      status !== initial.status ||
      date !== initial.date ||
      pointsReward !== initial.pointsReward
    );
  }, [projectId, title, description, type, status, date, pointsReward]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: ActivityFormData;
    if (activity) {
      base = {
        projectId: activity.project_id || '',
        title: activity.title,
        description: activity.description || '',
        type: activity.type || '',
        status: activity.status,
        date: activity.date ? activity.date.split('T')[0] : '',
        pointsReward:
          activity.points_reward !== null && activity.points_reward !== undefined
            ? String(activity.points_reward)
            : '0',
      };
    } else {
      base = {
        projectId: '',
        title: '',
        description: '',
        type: '',
        status: 'planned',
        date: '',
        pointsReward: '25',
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and activity ID / create_new)
    const draft = loadDraft<ActivityFormData>('activity', activity?.id, tenantId);
    if (draft) {
      setProjectId(draft.projectId ?? base.projectId);
      setTitle(draft.title ?? base.title);
      setDescription(draft.description ?? base.description);
      setType(draft.type ?? base.type);
      setStatus(draft.status ?? base.status);
      setDate(draft.date ?? base.date);
      setPointsReward(draft.pointsReward ?? base.pointsReward);
      setDraftRestored(true);
    } else {
      setProjectId(base.projectId);
      setTitle(base.title);
      setDescription(base.description);
      setType(base.type);
      setStatus(base.status);
      setDate(base.date);
      setPointsReward(base.pointsReward);
      setDraftRestored(false);
    }
    setError(null);
  }, [activity, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('activity', activity?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, activity?.id, tenantId]);

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
    clearDraft('activity', activity?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('activity', activity?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setProjectId(base.projectId);
      setTitle(base.title);
      setDescription(base.description);
      setType(base.type);
      setStatus(base.status);
      setDate(base.date);
      setPointsReward(base.pointsReward);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedPoints = pointsReward ? parseInt(pointsReward, 10) : undefined;
      if (parsedPoints !== undefined && (isNaN(parsedPoints) || parsedPoints < 0)) {
        setError('Points reward must be a positive integer.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        project_id: projectId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        type: type.trim() || undefined,
        status,
        date: date || undefined,
        points_reward: parsedPoints,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('activity', activity?.id, tenantId);
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {activity ? 'Edit Civic Activity' : 'New Civic Activity'}
              </h2>
              <p className="text-xs text-slate-500">Citizen participation and volunteer activity</p>
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
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Park Cleanup Drive, Feedback Workshop..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Project <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value="">No linked project (Stand-alone activity)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide instructions, equipment needed, and participation guidelines..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CivicActivity['status'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. Volunteer, Survey, Action"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Civic Points Reward</label>
              <input
                type="number"
                min="0"
                value={pointsReward}
                onChange={(e) => setPointsReward(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
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
              {isSubmitting ? 'Saving Activity...' : activity ? 'Save Changes' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
