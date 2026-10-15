import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CivicDocument } from '../../types/content.types';
import { FileText, X, AlertCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { saveDraft, loadDraft, clearDraft } from '../../utils/draftStorage';

interface DocumentFormData {
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileUrl: string;
  category: CivicDocument['category'];
  isPublic: boolean;
}

interface DocumentEditorModalProps {
  documentItem: CivicDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    file_name: string;
    file_type?: string;
    file_size?: number;
    file_url: string;
    category: CivicDocument['category'];
    is_public?: boolean;
  }) => Promise<boolean>;
}

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  documentItem,
  isOpen,
  onClose,
  onSave,
}) => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState<CivicDocument['category']>('public_notice');
  const [isPublic, setIsPublic] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Baseline reference to detect unsaved changes
  const initialDataRef = useRef<DocumentFormData | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Snapshot of current form state
  const getFormSnapshot = useCallback((): DocumentFormData => {
    return {
      title,
      description,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      category,
      isPublic,
    };
  }, [title, description, fileName, fileType, fileSize, fileUrl, category, isPublic]);

  // Check if current form has unsaved edits compared to baseline
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!initialDataRef.current) return false;
    const initial = initialDataRef.current;
    return (
      title !== initial.title ||
      description !== initial.description ||
      fileName !== initial.fileName ||
      fileType !== initial.fileType ||
      fileSize !== initial.fileSize ||
      fileUrl !== initial.fileUrl ||
      category !== initial.category ||
      isPublic !== initial.isPublic
    );
  }, [title, description, fileName, fileType, fileSize, fileUrl, category, isPublic]);

  // Modal open / close & Draft Restoration Lifecycle
  useEffect(() => {
    if (!isOpen) {
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      return;
    }

    // Baseline from props
    let base: DocumentFormData;
    if (documentItem) {
      base = {
        title: documentItem.title,
        description: documentItem.description || '',
        fileName: documentItem.file_name,
        fileType: documentItem.file_type || 'PDF',
        fileSize:
          documentItem.file_size !== null && documentItem.file_size !== undefined
            ? String(documentItem.file_size)
            : '',
        fileUrl: documentItem.file_url,
        category: documentItem.category,
        isPublic: documentItem.is_public,
      };
    } else {
      base = {
        title: '',
        description: '',
        fileName: '',
        fileType: 'PDF',
        fileSize: '',
        fileUrl: '',
        category: 'public_notice',
        isPublic: true,
      };
    }

    initialDataRef.current = base;

    // Check if temporary draft exists in sessionStorage (scoped by tenant and document ID / create_new)
    const draft = loadDraft<DocumentFormData>('document', documentItem?.id, tenantId);
    if (draft) {
      setTitle(draft.title ?? base.title);
      setDescription(draft.description ?? base.description);
      setFileName(draft.fileName ?? base.fileName);
      setFileType(draft.fileType ?? base.fileType);
      setFileSize(draft.fileSize ?? base.fileSize);
      setFileUrl(draft.fileUrl ?? base.fileUrl);
      setCategory(draft.category ?? base.category);
      setIsPublic(draft.isPublic ?? base.isPublic);
      setDraftRestored(true);
    } else {
      setTitle(base.title);
      setDescription(base.description);
      setFileName(base.fileName);
      setFileType(base.fileType);
      setFileSize(base.fileSize);
      setFileUrl(base.fileUrl);
      setCategory(base.category);
      setIsPublic(base.isPublic);
      setDraftRestored(false);
    }
    setError(null);
  }, [documentItem, isOpen, tenantId]);

  // Debounced auto-save of draft to sessionStorage (400ms)
  useEffect(() => {
    if (!isOpen || !initialDataRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const current = getFormSnapshot();
      if (hasUnsavedChanges()) {
        saveDraft('document', documentItem?.id, current, tenantId);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getFormSnapshot, hasUnsavedChanges, isOpen, documentItem?.id, tenantId]);

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
    clearDraft('document', documentItem?.id, tenantId);
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleDiscardDraftOnly = () => {
    clearDraft('document', documentItem?.id, tenantId);
    if (initialDataRef.current) {
      const base = initialDataRef.current;
      setTitle(base.title);
      setDescription(base.description);
      setFileName(base.fileName);
      setFileType(base.fileType);
      setFileSize(base.fileSize);
      setFileUrl(base.fileUrl);
      setCategory(base.category);
      setIsPublic(base.isPublic);
    }
    setDraftRestored(false);
  };

  const handleFileUrlChange = (newUrl: string) => {
    setFileUrl(newUrl);
    // If fileName is currently empty, try to auto-derive from recognizable URL path
    if (!fileName.trim() && newUrl.trim()) {
      try {
        const parsed = new URL(newUrl.trim());
        const pathname = parsed.pathname;
        const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1).trim();
        if (lastSegment && lastSegment.includes('.')) {
          // Clean filename (strip query or hash if any leftover, sanitize)
          const cleanName = decodeURIComponent(lastSegment.split('?')[0].split('#')[0]);
          if (cleanName) {
            setFileName(cleanName);
          }
        }
      } catch {
        // Not a standard absolute URL yet, check if path format like .../filename.ext
        const slashIdx = newUrl.lastIndexOf('/');
        if (slashIdx !== -1) {
          const candidate = newUrl.substring(slashIdx + 1).split('?')[0].split('#')[0].trim();
          if (candidate && candidate.includes('.')) {
            setFileName(candidate);
          }
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Validate file URL
      const trimmedUrl = fileUrl.trim();
      if (!trimmedUrl) {
        setError('Please provide a document URL.');
        setIsSubmitting(false);
        return;
      }

      // Check URL validity
      let validUrl = false;
      try {
        const parsed = new URL(trimmedUrl);
        validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'ftp:';
      } catch {
        validUrl = false;
      }

      if (!validUrl) {
        setError('Please provide a valid document URL (e.g. https://example.com/document.pdf).');
        setIsSubmitting(false);
        return;
      }

      // 2. Validate file name (or derive if still empty, with safe fallback)
      let resolvedFileName = fileName.trim();
      if (!resolvedFileName) {
        try {
          const parsed = new URL(trimmedUrl);
          const segment = parsed.pathname.substring(parsed.pathname.lastIndexOf('/') + 1);
          if (segment && segment.includes('.')) {
            resolvedFileName = decodeURIComponent(segment.split('?')[0].split('#')[0]);
          }
        } catch {
          // ignore
        }
      }

      // Safe fallback filename if one cannot be derived from the URL or input
      if (!resolvedFileName) {
        const ext = (fileType.trim() || 'pdf').toLowerCase().replace(/^\./, '');
        const cleanSlug = title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        resolvedFileName = `${cleanSlug || 'document'}.${ext}`;
      }

      const parsedSize = fileSize.trim() ? parseInt(fileSize, 10) : undefined;
      if (parsedSize !== undefined && (isNaN(parsedSize) || parsedSize < 0)) {
        setError('File size must be a non-negative integer.');
        setIsSubmitting(false);
        return;
      }

      const success = await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        file_name: resolvedFileName,
        file_type: fileType.trim() || undefined,
        file_size: parsedSize,
        file_url: trimmedUrl,
        category,
        is_public: isPublic,
      });

      if (success) {
        // Clear saved temporary draft upon successful database save
        clearDraft('document', documentItem?.id, tenantId);
        onClose();
      } else {
        setError('Failed to save document. Please check the active tenant workspace and try again.');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {documentItem ? 'Edit Civic Document' : 'Upload / Link Document'}
              </h2>
              <p className="text-xs text-slate-500">Official policy, bylaw, or community record</p>
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
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Municipal Environmental Policy..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CivicDocument['category'])}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="policy">Policy</option>
                <option value="bylaw">Bylaw</option>
                <option value="financial_report">Financial Report</option>
                <option value="public_notice">Public Notice</option>
                <option value="minutes">Minutes</option>
                <option value="form">Form</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                File Name <span className="text-slate-400 font-normal">(Auto-derived or custom)</span>
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="policy-2026.pdf"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => handleFileUrlChange(e.target.value)}
              placeholder="https://example.com/docs/policy.pdf or storage link"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">File Type</label>
              <input
                type="text"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="PDF, DOCX, XLSX"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">File Size (Bytes)</label>
              <input
                type="number"
                min="0"
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                placeholder="e.g. 1048576"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Summary of contents, effective date, or scope..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/60">
            <div>
              <span className="text-xs font-semibold text-slate-800">Public Document</span>
              <p className="text-[11px] text-slate-500">Accessible to all verified tenant members</p>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
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
              {isSubmitting ? 'Saving...' : documentItem ? 'Save Changes' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
