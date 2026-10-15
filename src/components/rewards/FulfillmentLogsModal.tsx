import React, { useState, useEffect } from 'react';
import type { FulfillmentLog } from '../../types/database.types';
import { fetchFulfillmentLogs } from '../../services/rewardsService';
import { History, ShieldCheck, Clock, MapPin, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface FulfillmentLogsModalProps {
  tenantId: string;
  requestId: string;
  rewardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FulfillmentLogsModal: React.FC<FulfillmentLogsModalProps> = ({
  tenantId,
  requestId,
  rewardTitle,
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<FulfillmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !requestId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchFulfillmentLogs(tenantId, requestId).then(({ logs: fetchedLogs, error: fetchErr }) => {
      if (!isMounted) return;
      if (fetchErr) {
        setError(fetchErr);
      } else {
        setLogs(fetchedLogs);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, tenantId, requestId]);

  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Approved</span>;
      case 'moved_to_processing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Processing</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Rejected</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">{action}</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Fulfillment Audit Trail</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{rewardTitle}</p>
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

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" message="Loading audit history..." />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No audit logs recorded for this claim request.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-800 shadow-xs" />
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      {getActionBadge(log.action)}
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    {log.tracking_reference && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px] bg-white p-1.5 rounded-md border border-slate-200/80">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ref: {log.tracking_reference}</span>
                      </div>
                    )}

                    {log.notes && (
                      <p className="text-slate-600 text-xs italic">
                        "{log.notes}"
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                      Logged by system actor: <span className="font-mono">{log.actor_id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
