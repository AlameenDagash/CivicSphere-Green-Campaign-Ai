import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicProject } from '../../types/content.types';
import { FolderGit2, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';
import { parseNairaInput } from '../../utils/currency';

interface ProjectFormData {
  title: string;
  description: string;
  status: CivicProject['status'];
  category: string;
  startDate: string;
  endDate: string;
  budget: string;
  location: string;
}

interface ProjectEditorModalProps {
  project: CivicProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    status: CivicProject['status'];
    category?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    location?: string;
  }) => Promise<boolean>;
}

export const ProjectEditorModal: React.FC<ProjectEditorModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CivicProject['status']>('draft');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [location, setLocation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<ProjectFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): ProjectFormData => {
    return {
      title,
      description,
      status,
      category,
      startDate,
      endDate,
      budget,
      location,
    };
  }, [title, description, status, category, startDate, endDate, budget, location]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      description !== initial.description ||
      status !== initial.status ||
      category !== initial.category ||
      startDate !== initial.startDate ||
      endDate !== initial.endDate ||
      budget !== initial.budget ||
      location !== initial.location
    );
  }, [title, description, status, category, startDate, endDate, budget, location]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      setIsSubmitting(false);
      setError(null);
      return;
    }

    setIsSubmitting(false);
    setError(null);

    // Baseline from props
    let base: ProjectFormData;
    if (project) {
      base = {
        title: project.title,
        description: project.description || '',
        status: project.status,
        category: project.category || '',
        startDate: project.start_date ? project.start_date.substring(0, 10) : '',
        endDate: project.end_date ? project.end_date.substring(0, 10) : '',
        budget:
          project.budget !== null && project.budget !== undefined
            ? String(project.budget)
            : '',
        location: project.location || '',
      };
    } else {
      base = {
        title: '',
        description: '',
        status: 'draft',
        category: '',
        startDate: '',
        endDate: '',
        budget: '',
        location: '',
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and project ID / create_new)
    const draft = loadDraft<ProjectFormData>('project', project?.id, tenantId);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setDescription(draft.description ?? base.description);
      setStatus(draft.status ?? base.status);
      setCategory(draft.category ?? base.category);
      setStartDate(draft.startDate ?? base.startDate);
      setEndDate(draft.endDate ?? base.endDate);
      setBudget(draft.budget ?? base.budget);
      setLocation(draft.location ?? base.location);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setDescription(base.description);
      setStatus(base.status);
      setCategory(base.category);
      setStartDate(base.startDate);
      setEndDate(base.endDate);
      setBudget(base.budget);
      setLocation(base.location);
      setDraftRestored(false);
    }
  }, [project, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('project', project?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, project?.id, tenantId]);

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
    clearDraft('project', project?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('project', project?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setDescription(base.description);
      setStatus(base.status);
      setCategory(base.category);
      setStartDate(base.startDate);
      setEndDate(base.endDate);
      setBudget(base.budget);
      setLocation(base.location);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Project title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (startDate && endDate && endDate < startDate) {
        setError('End date cannot be earlier than start date.');
        setIsSubmitting(false);
        return;
      }

      let parsedBudget: number | undefined;
      if (budget.trim()) {
        const val = parseNairaInput(budget);
        if (val === undefined || isNaN(val) || val < 0) {
          setError('Budget must be a valid non-negative number.');
          setIsSubmitting(false);
          return;
        }
        parsedBudget = val;
      }

      const success = await onSave({
        title: trimmedTitle,
        description: description.trim() || undefined,
        status,
        category: category.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: parsedBudget,
        location: location.trim() || undefined,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('project', project?.id, tenantId);
        onClose();
      } else {
        setError('Failed to save project. Please check the active tenant workspace and try again.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {project ? 'Edit Civic Project' : 'New Civic Project'}
              </h2>
              <p className="text-xs text-slate-500">Initiative and capital project record</p>
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
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solar Streetlighting Initiative, Civic Hub..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Outline project scope, objectives, and community impact..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CivicProject['status'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Infrastructure, Health"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Budget (₦ NGN)</label>
              <input
                type="text"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 500,000"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Ward</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. District 4, Central Square"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving Project...' : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
