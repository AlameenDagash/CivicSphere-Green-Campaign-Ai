import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, signOut, user, isInitialized, isLoading: isAuthLoading, isPasswordRecovery } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check if recovery session or token is active in client
    const verifyRecoverySession = async () => {
      const client = getSupabaseClient();
      if (!client) {
        if (isMounted) setHasCheckedSession(true);
        return;
      }

      // Check current session
      const { data } = await client.auth.getSession();
      const hash = window.location.hash;
      const search = window.location.search;
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get('code');

      // If PKCE code is present and session not yet established, attempt exchange
      if (code && !data.session) {
        try {
          const { data: exchangeData, error: exchangeErr } =
            await client.auth.exchangeCodeForSession(code);
          if (!exchangeErr && exchangeData?.session && isMounted) {
            setIsSessionValid(true);
            setHasCheckedSession(true);
            return;
          }
        } catch (err) {
          console.warn('Code exchange attempt:', err);
        }
      }

      const hasRecoveryIndicator =
        hash.includes('type=recovery') ||
        hash.includes('access_token') ||
        Boolean(code) ||
        isPasswordRecovery ||
        Boolean(user || data.session);

      if (isMounted) {
        setIsSessionValid(Boolean(hasRecoveryIndicator));
        setHasCheckedSession(true);
      }
    };

    if (isInitialized) {
      verifyRecoverySession();
    }

    const client = getSupabaseClient();
    if (client) {
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED'))) {
          setIsSessionValid(true);
          setHasCheckedSession(true);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isInitialized, isPasswordRecovery, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setUpdateError(null);

    // 1. Basic validation
    if (!newPassword) {
      setValidationError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setValidationError('Password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match. Please verify both entries.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { success, error } = await updatePassword(newPassword);

      if (success) {
        setIsSuccess(true);
        // Clear sensitive inputs from component state
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setUpdateError(error || 'Failed to update password. Your recovery session may have expired.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToSignIn = async () => {
    // Cleanly sign out of temporary recovery session so user signs in freshly
    await signOut();
    navigate('/login');
  };

  if (!isInitialized || !hasCheckedSession || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Verifying recovery authorization..." size="lg" />
      </div>
    );
  }

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
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Set New Password
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a new secure password for your CivicSphere user account.
            </p>
          </div>

          {validationError && (
            <div className="mb-5">
              <ErrorAlert
                title="Input Validation"
                message={validationError}
                onRetry={() => setValidationError(null)}
              />
            </div>
          )}

          {updateError && (
            <div className="mb-5">
              <ErrorAlert
                title="Password Update Failed"
                message={updateError}
                onRetry={() => setUpdateError(null)}
              />
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Password Updated Successfully</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Your password has been changed successfully. You can now access your account with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReturnToSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : !isSessionValid && !user ? (
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Recovery Session Not Detected</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  This page must be opened through the password reset link sent to your registered email address. The recovery token may have expired or already been utilized.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/forgot-password"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                >
                  <span>Request a New Reset Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="reset-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="block mt-1 text-[11px] text-slate-400">
                  Minimum 6 characters.
                </span>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newPassword || !confirmPassword}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <span>{isSubmitting ? 'Updating password...' : 'Update Password'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-3 border-t border-slate-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel and Return to Sign In</span>
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
      </div>
    </div>
  );
};
