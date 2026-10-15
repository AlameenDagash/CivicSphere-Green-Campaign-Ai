import React, { useState } from 'react';
import type { RewardRequest, RewardRequestStatus } from '../../types/database.types';
import {
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  ShieldAlert,
} from 'lucide-react';

interface RequestStatusModalProps {
  request: RewardRequest | null;
  targetStatus: RewardRequestStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: {
    requestId: string;
    newStatus: RewardRequestStatus;
    notes?: string;
    trackingRef?: string;
    rejectionReason?: string;
  }) => Promise<boolean>;
}

export const RequestStatusModal: React.FC<RequestStatusModalProps> = ({
  request,
  targetStatus,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [notes, setNotes] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
      setTrackingRef('');
      setRejectionReason('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !request || !targetStatus) return null;

  const isRejection = targetStatus === 'rejected';
  const isCancellation = targetStatus === 'cancelled';
  const isFulfillment = targetStatus === 'fulfilled';
  const isProcessing = targetStatus === 'processing';
  const isApproval = targetStatus === 'approved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRejection && !rejectionReason.trim()) {
      setErrorMessage('A rejection reason is required to inform the member.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await onConfirm({
        requestId: request.id,
        newStatus: targetStatus,
        notes: notes.trim() || undefined,
        trackingRef: trackingRef.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
      });

      if (success) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with status badge */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isApproval
                  ? 'bg-blue-100 text-blue-800'
                  : isProcessing
                  ? 'bg-purple-100 text-purple-800'
                  : isFulfillment
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isApproval && <Clock className="w-5 h-5" />}
              {isProcessing && <Truck className="w-5 h-5" />}
              {isFulfillment && <PackageCheck className="w-5 h-5" />}
              {(isRejection || isCancellation) && <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isApproval && 'Approve Claim Request'}
                {isProcessing && 'Move to Processing / Dispatch'}
                {isFulfillment && 'Mark Claim Fulfilled'}
                {isRejection && 'Reject Claim Request'}
                {isCancellation && 'Cancel Claim Request'}
              </h2>
              <p className="text-xs text-slate-500">Atomic status transition via verified RPC</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Request summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Reward:</span>
              <span className="font-semibold text-slate-900">{request.reward?.title || request.reward_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Points Spent:</span>
              <span className="font-bold text-amber-600">{request.points_spent} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Status:</span>
              <span className="font-semibold text-slate-700 capitalize">{request.status}</span>
            </div>
            {request.delivery_instructions && (
              <div className="pt-1.5 border-t border-slate-200/60 mt-1">
                <span className="text-slate-500 block mb-0.5">Instructions:</span>
                <span className="text-slate-700 italic">{request.delivery_instructions}</span>
              </div>
            )}
          </div>

          {/* Refund Notice for Rejections & Cancellations */}
          {(isRejection || isCancellation) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Automatic Point Refund:</span> The database RPC will automatically issue a <span className="font-semibold">{request.points_spent} points refund</span> back to the user's ledger and restore finite inventory.
              </div>
            </div>
          )}

          {/* Rejection Reason (Mandatory for rejections) */}
          {isRejection && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                placeholder="Explain why this request is rejected (e.g. invalid delivery address, item discontinued)..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {/* Tracking Reference (Useful for processing/fulfilled) */}
          {(isProcessing || isFulfillment) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tracking Reference / Voucher Code <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
                placeholder="e.g. FEDEX-982342 or PROMO-CIVIC-2026"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          )}

          {/* Manager Audit Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fulfillment Log Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes saved to immutable fulfillment_logs..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isRejection && !rejectionReason.trim())}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 ${
                isRejection || isCancellation
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isSubmitting
                ? 'Updating RPC...'
                : `Confirm Transition to ${targetStatus.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
