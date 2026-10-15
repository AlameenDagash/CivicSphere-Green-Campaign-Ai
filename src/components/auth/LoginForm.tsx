import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Mail, Lock, User, ArrowRight, CheckCircle2, ShieldCheck, Database, AlertCircle } from 'lucide-react';
import { ErrorAlert } from '../common/ErrorAlert';
import { SupabaseConfigModal } from '../common/SupabaseConfigModal';
import { CandidateSplashScreen } from './CandidateSplashScreen';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { signIn, signUp, sendOtp, isLoading, error, clearError, isSupabaseConfigured } = useAuth();
  const { reloadMemberships } = useTenant();

  const [mode, setMode] = useState<'password' | 'otp' | 'signup'>('password');
  const [showSplash, setShowSplash] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState<string>('/tenant/dashboard');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Sign-up fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signupConfirmationMsg, setSignupConfirmationMsg] = useState<string | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setOtpSent(false);
    setSignupConfirmationMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setValidationError('Email address is required.');
      return;
    }

    if (mode === 'signup') {
      const cleanName = fullName.trim();
      if (!cleanName) {
        setValidationError('Full Name is required.');
        return;
      }
      if (!password) {
        setValidationError('Password is required.');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }

      const result = await signUp(cleanEmail, password, cleanName);

      if (result.error) {
        // Error is set in AuthContext or returned
        return;
      }

      if (result.requiresEmailConfirmation) {
        setSignupConfirmationMsg(
          'Account created successfully! Please check your email to verify your account, then sign in.'
        );
        return;
      }

      // Successful signup with session and membership provisioned!
      // Hydrate tenant memberships and route to /tenant/learning as public_user
      if (reloadMemberships) {
        await reloadMemberships();
      }

      setPendingRedirectUrl('/tenant/learning');
      setShowSplash(true);
      return;
    }

    if (mode === 'otp') {
      const { success } = await sendOtp(cleanEmail);
      if (success) {
        setOtpSent(true);
      }
    } else {
      if (!password) return;
      const { success } = await signIn(cleanEmail, password);
      if (success) {
        // Hydrate memberships to determine role-based landing destination
        let targetDest = '/tenant/dashboard';
        try {
          if (reloadMemberships) {
            const userMems = await reloadMemberships();
            const isOwner = userMems.some((m) =>
              ['platform_owner', 'super_admin', 'admin'].includes(m.role)
            );
            const isContentMgr = userMems.some((m) =>
              ['content_learning_manager', 'manager_content_learning', 'content_manager'].includes(m.role)
            );
            const isOpsMgr = userMems.some((m) =>
              ['operations_rewards_manager', 'manager_operations_rewards', 'rewards_manager'].includes(m.role)
            );

            if (isOwner) {
              targetDest = '/dashboard';
            } else if (isContentMgr) {
              targetDest = '/tenant/content';
            } else if (isOpsMgr) {
              targetDest = '/tenant/rewards';
            } else {
              targetDest = '/tenant/dashboard';
            }
          }
        } catch (e) {
          console.warn('Could not determine post-login role destination:', e);
        }

        setPendingRedirectUrl(targetDest);
        setShowSplash(true);
      }
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    if (onSuccess) {
      onSuccess();
    } else {
      navigate(pendingRedirectUrl, { replace: true });
    }
  };

  return (
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

      {/* Main Auth Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-xs">
        {/* System Connection Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-slate-600 font-medium">
              {isSupabaseConfigured ? 'Secure Authentication Connected' : 'Configuration Required'}
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

        {error && (
          <div className="mb-5">
            <ErrorAlert
              title="Authentication Failure"
              message={error}
              onRetry={clearError}
            />
          </div>
        )}

        {validationError && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {signupConfirmationMsg && (
          <div className="mb-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Verification Email Sent</span>
            </div>
            <p className="text-emerald-700 leading-relaxed">
              {signupConfirmationMsg}
            </p>
            <button
              type="button"
              onClick={() => {
                setSignupConfirmationMsg(null);
                setMode('password');
              }}
              className="mt-1 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
            >
              Return to Sign In
            </button>
          </div>
        )}

        {otpSent && (
          <div className="mb-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Magic link sent successfully</span>
            </div>
            <p className="text-emerald-700">
              Please check your inbox at <strong className="font-mono">{email}</strong> to sign in.
            </p>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-slate-100 p-1 mb-5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'password'}
            onClick={() => {
              setMode('password');
              clearError();
              setValidationError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'password'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'otp'}
            onClick={() => {
              setMode('otp');
              clearError();
              setValidationError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'otp'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              clearError();
              setValidationError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Auth / Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Citizen"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
              {mode === 'signup' ? 'Email Address' : 'Work / Civic Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                id="auth-email"
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

          {(mode === 'password' || mode === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                />
              </div>
              {mode === 'password' && (
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800 transition-shadow bg-slate-50/30"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !email.trim() ||
              ((mode === 'password' || mode === 'signup') && !password) ||
              (mode === 'signup' && (!fullName.trim() || !confirmPassword))
            }
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <span>
              {isLoading
                ? mode === 'signup'
                  ? 'Creating Account...'
                  : 'Authenticating...'
                : mode === 'signup'
                ? 'Create Public Learner Account'
                : mode === 'password'
                ? 'Sign In to CivicSphere'
                : 'Send Magic Link'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Security notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Protected by Enterprise Encryption & Secure Data Isolation</span>
        </div>
      </div>

      {/* Informational Guidance for Verified Onboarding */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white/70 p-4 text-xs text-slate-600 space-y-2">
        <h4 className="font-semibold text-slate-800">
          CivicSphere Learner Onboarding
        </h4>
        <p className="text-slate-500 leading-relaxed">
          New accounts are registered as public learners and automatically provisioned with active participation access in their designated workspace.
        </p>
      </div>

      {/* Supabase Connection Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      {/* Candidate Presentation Splash Screen */}
      {showSplash && (
        <CandidateSplashScreen onComplete={handleSplashComplete} />
      )}
    </div>
  );
};

