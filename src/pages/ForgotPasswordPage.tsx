import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Database, KeyRound } from 'lucide-react';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SupabaseConfigModal } from '../components/common/SupabaseConfigModal';
import { getPasswordResetRedirectUrl } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, isLoading, error, clearError, isSupabaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localLoading || isLoading) return;

    clearError();
    setIsSubmitted(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setLocalLoading(true);
    // Explicitly target the dedicated reset route using the deployed app URL
    const redirectUrl = getPasswordResetRedirectUrl();

    const { success } = await requestPasswordReset(trimmedEmail, redirectUrl);
    setLocalLoading(false);

    if (success) {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 font-sans">
      <div className="w-full max-w-md mx-auto">
        {/* Brand & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 text-white font-bold text-xl mb-4 shadow-sm">
            CS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CivicSphere AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Civic Public Information, Engagement & Rewards Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xs">
          {/* Header & Connection status */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-slate-600 font-medium">
                {isSupabaseConfigured ? 'Secure Authentication Ready' : 'Configuration Required'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <Database className="w-3 h-3" />
              <span>Connection</span>
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Recover Password
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered work or civic email address. We will send you a secure link to reset your account password.
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <ErrorAlert
                title="Recovery Request Failed"
                message={error}
                onRetry={clearError}
              />
            </div>
          )}

          {isSubmitted ? (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Password Reset Link Sent</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  If an account exists for <strong className="font-mono text-emerald-900">{email}</strong>, you will receive an email shortly with instructions and a link to choose a new password.
                </p>
                <p className="text-[11px] text-emerald-600 pt-1 border-t border-emerald-200/60">
                  Please check your spam or quarantine folder if the link does not arrive within a few minutes.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    clearError();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 py-1 transition-colors font-medium text-center"
                >
                  Didn't receive email? Try again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="recovery-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Work / Civic Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.gov"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={localLoading || isLoading || !email.trim()}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <span>{localLoading || isLoading ? 'Sending reset link...' : 'Send Reset Link'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-3 border-t border-slate-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}

          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Protected by Enterprise Encryption & Secure Data Isolation</span>
          </div>
        </div>

        {/* Supabase Connection Modal */}
        <SupabaseConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
        />
      </div>
    </div>
  );
};
