import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicMediaItem } from '../../types/content.types';
import { Image as ImageIcon, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface MediaFormData {
  title: string;
  caption: string;
  mediaType: CivicMediaItem['media_type'];
  url: string;
  thumbnailUrl: string;
  album: string;
  fileSize: string;
}

interface MediaEditorModalProps {
  mediaItem: CivicMediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    caption?: string;
    media_type: CivicMediaItem['media_type'];
    url: string;
    thumbnail_url?: string;
    album?: string;
    file_size?: number;
  }) => Promise<boolean>;
}

export const MediaEditorModal: React.FC<MediaEditorModalProps> = ({
  mediaItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<CivicMediaItem['media_type']>('image');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [album, setAlbum] = useState('');
  const [fileSize, setFileSize] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<MediaFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): MediaFormData => {
    return {
      title,
      caption,
      mediaType,
      url,
      thumbnailUrl,
      album,
      fileSize,
    };
  }, [title, caption, mediaType, url, thumbnailUrl, album, fileSize]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      caption !== initial.caption ||
      mediaType !== initial.mediaType ||
      url !== initial.url ||
      thumbnailUrl !== initial.thumbnailUrl ||
      album !== initial.album ||
      fileSize !== initial.fileSize
    );
  }, [title, caption, mediaType, url, thumbnailUrl, album, fileSize]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: MediaFormData;
    if (mediaItem) {
      base = {
        title: mediaItem.title,
        caption: mediaItem.caption || '',
        mediaType: mediaItem.media_type,
        url: mediaItem.url,
        thumbnailUrl: mediaItem.thumbnail_url || '',
        album: mediaItem.album || '',
        fileSize:
          mediaItem.file_size !== null && mediaItem.file_size !== undefined
            ? String(mediaItem.file_size)
            : '',
      };
    } else {
      base = {
        title: '',
        caption: '',
        mediaType: 'image',
        url: '',
        thumbnailUrl: '',
        album: '',
        fileSize: '',
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and media ID / create_new)
    const draft = loadDraft<MediaFormData>('media', mediaItem?.id, tenantId);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setCaption(draft.caption ?? base.caption);
      setMediaType(draft.mediaType ?? base.mediaType);
      setUrl(draft.url ?? base.url);
      setThumbnailUrl(draft.thumbnailUrl ?? base.thumbnailUrl);
      setAlbum(draft.album ?? base.album);
      setFileSize(draft.fileSize ?? base.fileSize);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setCaption(base.caption);
      setMediaType(base.mediaType);
      setUrl(base.url);
      setThumbnailUrl(base.thumbnailUrl);
      setAlbum(base.album);
      setFileSize(base.fileSize);
      setDraftRestored(false);
    }
    setError(null);
  }, [mediaItem, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('media', mediaItem?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, mediaItem?.id, tenantId]);

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
    clearDraft('media', mediaItem?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('media', mediaItem?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setCaption(base.caption);
      setMediaType(base.mediaType);
      setUrl(base.url);
      setThumbnailUrl(base.thumbnailUrl);
      setAlbum(base.album);
      setFileSize(base.fileSize);
    }
    setDraftRestored(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setError('Please provide a valid media URL.');
        setIsSubmitting(false);
        return;
      }

      // Check URL validity and protocol
      let validUrl = false;
      try {
        const parsed = new URL(trimmedUrl);
        validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ftp:';
      } catch {
        validUrl = false;
      }

      if (!validUrl) {
        setError('Please provide a valid media URL (e.g. https://example.com/photos/item.jpg).');
        setIsSubmitting(false);
        return;
      }

      // Optional thumbnail URL validation if provided
      let validThumbUrl: string | undefined = undefined;
      const trimmedThumb = thumbnailUrl.trim();
      if (trimmedThumb) {
        try {
          const parsedThumb = new URL(trimmedThumb);
          if (parsedThumb.protocol === 'http:' || parsedThumb.protocol === 'https:') {
            validThumbUrl = trimmedThumb;
          } else {
            setError('Please provide a valid thumbnail URL (e.g. https://example.com/photos/thumb.jpg).');
            setIsSubmitting(false);
            return;
          }
        } catch {
          setError('Please provide a valid thumbnail URL (e.g. https://example.com/photos/thumb.jpg).');
          setIsSubmitting(false);
          return;
        }
      }

      const parsedSize = fileSize.trim() ? parseInt(fileSize, 10) : undefined;
      if (parsedSize !== undefined && (isNaN(parsedSize) || parsedSize < 0)) {
        setError('File size must be a non-negative integer.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        title: title.trim(),
        caption: caption.trim() || undefined,
        media_type: mediaType,
        url: trimmedUrl,
        thumbnail_url: validThumbUrl,
        album: album.trim() || undefined,
        file_size: parsedSize,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('media', mediaItem?.id, tenantId);
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mediaItem ? 'Edit Media Asset' : 'Add Media Asset'}
              </h2>
              <p className="text-xs text-slate-500">Civic gallery photo, video, or audio recording</p>
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
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Park Beautification Opening Day..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as CivicMediaItem['media_type'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document / Slide</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Album / Collection</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="e.g. Community Projects 2026"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Media URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mediaType === 'video'
                  ? 'https://www.youtube.com/watch?v=..., Facebook video, or MP4 URL'
                  : 'https://example.com/photos/item.jpg'
              }
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thumbnail URL <span className="text-slate-400 font-normal">(Optional preview)</span>
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://example.com/photos/thumb.jpg"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Caption / Credits</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Photo by Jane Doe / District Environmental Council"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
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
              {isSubmitting ? 'Saving...' : mediaItem ? 'Save Changes' : 'Add Media Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
