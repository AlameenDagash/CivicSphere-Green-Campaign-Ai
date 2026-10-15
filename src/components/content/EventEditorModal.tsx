import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicEvent } from '../../types/content.types';
import { Calendar, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface EventFormData {
  title: string;
  description: string;
  eventType: CivicEvent['event_type'];
  venue: string;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
  meetingLink: string;
  capacity: string;
}

interface EventEditorModalProps {
  event: CivicEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    event_type: CivicEvent['event_type'];
    venue?: string;
    start_time: string;
    end_time?: string;
    is_virtual?: boolean;
    meeting_link?: string;
    capacity?: number;
  }) => Promise<boolean>;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CivicEvent['event_type']>('community_meeting');
  const [venue, setVenue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [capacity, setCapacity] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<EventFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): EventFormData => {
    return {
      title,
      description,
      eventType,
      venue,
      startTime,
      endTime,
      isVirtual,
      meetingLink,
      capacity,
    };
  }, [title, description, eventType, venue, startTime, endTime, isVirtual, meetingLink, capacity]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      description !== initial.description ||
      eventType !== initial.eventType ||
      venue !== initial.venue ||
      startTime !== initial.startTime ||
      endTime !== initial.endTime ||
      isVirtual !== initial.isVirtual ||
      meetingLink !== initial.meetingLink ||
      capacity !== initial.capacity
    );
  }, [title, description, eventType, venue, startTime, endTime, isVirtual, meetingLink, capacity]);

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
    let base: EventFormData;
    if (event) {
      base = {
        title: event.title,
        description: event.description || '',
        eventType: event.event_type,
        venue: event.venue || '',
        startTime: event.start_time ? event.start_time.substring(0, 16) : '',
        endTime: event.end_time ? event.end_time.substring(0, 16) : '',
        isVirtual: Boolean(event.is_virtual),
        meetingLink: event.meeting_link || '',
        capacity:
          event.capacity !== null && event.capacity !== undefined
            ? String(event.capacity)
            : '',
      };
    } else {
      base = {
        title: '',
        description: '',
        eventType: 'community_meeting',
        venue: '',
        startTime: '',
        endTime: '',
        isVirtual: false,
        meetingLink: '',
        capacity: '',
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and event ID / create_new)
    const draft = loadDraft<EventFormData>('event', event?.id, tenantId);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setDescription(draft.description ?? base.description);
      setEventType(draft.eventType ?? base.eventType);
      setVenue(draft.venue ?? base.venue);
      setStartTime(draft.startTime ?? base.startTime);
      setEndTime(draft.endTime ?? base.endTime);
      setIsVirtual(draft.isVirtual ?? base.isVirtual);
      setMeetingLink(draft.meetingLink ?? base.meetingLink);
      setCapacity(draft.capacity ?? base.capacity);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setDescription(base.description);
      setEventType(base.eventType);
      setVenue(base.venue);
      setStartTime(base.startTime);
      setEndTime(base.endTime);
      setIsVirtual(base.isVirtual);
      setMeetingLink(base.meetingLink);
      setCapacity(base.capacity);
      setDraftRestored(false);
    }
    setError(null);
  }, [event, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('event', event?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, event?.id, tenantId]);

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
    clearDraft('event', event?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('event', event?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setDescription(base.description);
      setEventType(base.eventType);
      setVenue(base.venue);
      setStartTime(base.startTime);
      setEndTime(base.endTime);
      setIsVirtual(base.isVirtual);
      setMeetingLink(base.meetingLink);
      setCapacity(base.capacity);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Validate startTime
      if (!startTime || !startTime.trim()) {
        setError('Please specify a valid start date and time.');
        setIsSubmitting(false);
        return;
      }

      const startDateObj = new Date(startTime);
      if (isNaN(startDateObj.getTime())) {
        setError('Please specify a valid start date and time.');
        setIsSubmitting(false);
        return;
      }

      // 2. Validate endTime if supplied
      let endDateIso: string | undefined = undefined;
      if (endTime && endTime.trim()) {
        const endDateObj = new Date(endTime);
        if (isNaN(endDateObj.getTime())) {
          setError('Please specify a valid end date and time.');
          setIsSubmitting(false);
          return;
        }

        if (endDateObj.getTime() <= startDateObj.getTime()) {
          setError('End date and time must be after the start date and time.');
          setIsSubmitting(false);
          return;
        }

        endDateIso = endDateObj.toISOString();
      }

      // 3. Validate capacity if supplied
      const parsedCapacity = capacity.trim() ? parseInt(capacity, 10) : undefined;
      if (parsedCapacity !== undefined && (isNaN(parsedCapacity) || parsedCapacity < 0)) {
        setError('Capacity must be a non-negative integer.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        venue: venue.trim() || undefined,
        start_time: startDateObj.toISOString(),
        end_time: endDateIso,
        is_virtual: isVirtual,
        meeting_link: meetingLink.trim() || undefined,
        capacity: parsedCapacity,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('event', event?.id, tenantId);
        onClose();
      } else {
        setError('Failed to save event. Please check the active tenant workspace and try again.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {event ? 'Edit Civic Event' : 'New Civic Event'}
              </h2>
              <p className="text-xs text-slate-500">Public meeting, town hall, or community workshop</p>
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
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Budget Town Hall, Ward Planning Session..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CivicEvent['event_type'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              >
                <option value="town_hall">Town Hall</option>
                <option value="public_hearing">Public Hearing</option>
                <option value="workshop">Workshop</option>
                <option value="volunteer">Volunteer Gathering</option>
                <option value="community_meeting">Community Meeting</option>
                <option value="other">Other Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Max RSVPs)</label>
              <input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Leave blank for unlimited"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Physical Location</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. City Council Chambers, Room 302..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Virtual / Online Event</span>
              <input
                type="checkbox"
                checked={isVirtual}
                onChange={(e) => setIsVirtual(e.target.checked)}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>
            {isVirtual && (
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... or zoom link"
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-900 focus:border-purple-500 focus:outline-hidden"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Agenda / Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide topics, speakers, agenda items, and what attendees should bring..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
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
              {isSubmitting ? 'Saving Event...' : event ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
