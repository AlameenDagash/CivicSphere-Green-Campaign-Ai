import React from 'react';
import { Database, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import type { SchemaTableStatus } from '../../types/content.types';

interface SchemaStatusBannerProps {
  tableName: string;
  tableStatus: SchemaTableStatus;
  errorMessage?: string;
  expectedColumns?: string[];
  onRetry?: () => void;
  className?: string;
}

export const SchemaStatusBanner: React.FC<SchemaStatusBannerProps> = ({
  tableName,
  tableStatus,
  errorMessage,
  expectedColumns = [],
  onRetry,
  className = '',
}) => {
  if (tableStatus === 'ready') return null;

  if (tableStatus === 'missing_table') {
    return (
      <div
        className={`rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 text-amber-900 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <span>Workspace Content Initializing</span>
              </h4>
              <span className="text-[11px] font-medium text-amber-700">
                Setup In Progress
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              This module's content storage is currently being initialized for your organization workspace.
            </p>
            {expectedColumns.length > 0 && (
              <div className="pt-1.5">
                <span className="font-semibold text-[11px] text-amber-900 block mb-1">
                  Required Table Schema Columns:
                </span>
                <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                  {expectedColumns.map((col) => (
                    <span
                      key={col}
                      className="px-1.5 py-0.5 rounded bg-white/80 border border-amber-200 text-amber-900"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {onRetry && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Availability</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (tableStatus === 'unauthorized') {
    return (
      <div
        className={`rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5 text-rose-900 ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-800 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5 text-xs">
            <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
              <span>Access Restricted</span>
            </h4>
            <p className="text-rose-800 leading-relaxed">
              {errorMessage || 'You do not have permission to view or manage these records under your current assigned role.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-red-200 bg-red-50/60 p-4 sm:p-5 text-red-900 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-800 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1.5 text-xs">
          <h4 className="text-sm font-bold text-red-950">Data Loading Error</h4>
          <p className="text-red-800 leading-relaxed">{errorMessage || 'An error occurred while loading records for this workspace.'}</p>
          {onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-900 bg-red-100 hover:bg-red-200 rounded-lg transition-colors border border-red-300 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
