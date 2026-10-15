import React, { useState, useEffect } from 'react';
import {
  getSupabaseCredentials,
  saveRuntimeCredentials,
  clearRuntimeCredentials,
  testSupabaseConnection,
  ConnectionTestResult,
} from '../../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, XCircle, RefreshCw, X, Shield } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const credentials = getSupabaseCredentials();
  const [url, setUrl] = useState(credentials.url || '');
  const [anonKey, setAnonKey] = useState('');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getSupabaseCredentials();
      setUrl(current.url || '');
      setAnonKey('');
      setSaveSuccess(false);
      if (current.isConfigured) {
        handleTest();
      }
    }
  }, [isOpen]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) return;
    saveRuntimeCredentials(url.trim(), anonKey.trim());
    setSaveSuccess(true);
    handleTest();
    if (onConfigSaved) onConfigSaved();
  };

  const handleClear = () => {
    clearRuntimeCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    setSaveSuccess(false);
    if (onConfigSaved) onConfigSaved();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-config-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Database className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 id="supabase-config-title" className="text-base font-semibold text-slate-900">
                Supabase Connection Status
              </h3>
              <p className="text-xs text-slate-500">
                Verified database source of truth
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close connection modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Security Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Security Protocol:</strong> Use only your Supabase <strong>public anon key</strong>. Privileged <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">service_role</code> keys must never be used in client applications.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label htmlFor="supabase-url" className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                id="supabase-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 font-mono"
              />
            </div>

            <div>
              <label htmlFor="supabase-anon" className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                id="supabase-anon"
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder={credentials.isConfigured ? '••••••••••••••••••••••••••••••••' : 'Enter anon API key'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 font-mono"
              />
              <span className="block mt-1 text-[11px] text-slate-500">
                Status: {credentials.isConfigured ? `Active (${credentials.source === 'env' ? 'Environment Configuration' : 'Local Workspace Storage'})` : 'Unconfigured'}
              </span>
            </div>
          </div>

          {/* Save notification */}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Configuration saved. Testing live database connectivity...</span>
            </div>
          )}

          {/* Diagnostic Test Output */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                testResult.ok
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-red-50/70 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{testResult.message}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                <div>
                  <span className="text-slate-500">Auth Service: </span>
                  <span className="font-semibold">{testResult.authHealthy ? 'Ready' : 'Failed'}</span>
                </div>
                <div>
                  <span className="text-slate-500">PostgreSQL DB: </span>
                  <span className="font-semibold">{testResult.dbAccessible ? 'Accessible' : 'Unavailable'}</span>
                </div>
              </div>

              {testResult.tablesVerified && testResult.tablesVerified.length > 0 && (
                <div className="pt-1">
                  <span className="text-slate-500 block">Verified Schema Tables:</span>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-mono text-slate-700">
                    {testResult.tablesVerified.map((tbl) => (
                      <span key={tbl} className="bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                        {tbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {testResult.error && (
                <p className="text-[11px] text-red-700 pt-1 border-t border-red-200 font-mono">
                  Error: {testResult.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
          >
            Clear Stored Config
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || (!credentials.isConfigured && (!url || !anonKey))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!url || !anonKey}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
            >
              Apply Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
