/**
 * CivicSphere AI — Auth Context Provider
 * 
 * Manages Supabase Auth session, user state, profile hydration,
 * and auth state transitions.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';
import {
  fetchUserProfile,
  signInWithEmailPassword,
  signInWithOtp as apiSignInOtp,
  signOutUser,
  requestPasswordReset as apiRequestPasswordReset,
  updateUserPassword as apiUpdateUserPassword,
  getPasswordResetRedirectUrl,
  signUpWithEmailPassword,
} from '../services/authService';
import type { Profile } from '../types/database.types';
import type { SignUpResult } from '../types/auth.types';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isSupabaseConfigured: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  sendOtp: (email: string) => Promise<{ success: boolean; error: string | null }>;
  requestPasswordReset: (email: string, redirectTo?: string) => Promise<{ success: boolean; error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  resetPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const { isConfigured } = getSupabaseCredentials();

  // Load user profile from `profiles` table
  const loadProfile = useCallback(async (userId: string) => {
    const { profile: loadedProfile, error: profileErr } = await fetchUserProfile(userId);
    if (profileErr) {
      console.warn('Could not fetch user profile:', profileErr);
    }
    setProfile(loadedProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    let isMounted = true;

    // 1. Initial session load
    client.auth.getSession().then(({ data: { session: initialSession }, error: sessionError }) => {
      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        loadProfile(initialSession.user.id).finally(() => {
          if (isMounted) {
            setIsLoading(false);
            setIsInitialized(true);
          }
        });
      } else {
        setIsLoading(false);
        setIsInitialized(true);
      }
    });

    // 2. Subscribe to auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setIsPasswordRecovery(false);
      }

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password?: string): Promise<{ success: boolean; error: string | null }> => {
    setError(null);
    setIsLoading(true);

    if (!password) {
      // Magic link fallback
      const { error: otpErr } = await apiSignInOtp(email);
      setIsLoading(false);
      if (otpErr) {
        setError(otpErr);
        return { success: false, error: otpErr };
      }
      return { success: true, error: null };
    }

    const { user: authedUser, session: authedSession, error: authErr } = await signInWithEmailPassword(email, password);
    setIsLoading(false);

    if (authErr) {
      setError(authErr);
      return { success: false, error: authErr };
    }

    setUser(authedUser);
    setSession(authedSession);
    if (authedUser) {
      await loadProfile(authedUser.id);
    }
    return { success: true, error: null };
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    setError(null);
    setIsLoading(true);

    const result = await signUpWithEmailPassword(email, password, fullName);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return result;
    }

    if (result.session && result.user) {
      setUser(result.user);
      setSession(result.session);
      await loadProfile(result.user.id);
    }

    return result;
  }, [loadProfile]);

  const sendOtp = useCallback(async (email: string): Promise<{ success: boolean; error: string | null }> => {
    setError(null);
    setIsLoading(true);
    const { error: otpErr } = await apiSignInOtp(email);
    setIsLoading(false);
    if (otpErr) {
      setError(otpErr);
      return { success: false, error: otpErr };
    }
    return { success: true, error: null };
  }, []);

  const requestPasswordReset = useCallback(async (email: string, redirectTo?: string): Promise<{ success: boolean; error: string | null }> => {
    setError(null);
    setIsLoading(true);
    const targetRedirect = redirectTo || getPasswordResetRedirectUrl();
    const { success, error: resetErr } = await apiRequestPasswordReset(email, targetRedirect);
    setIsLoading(false);
    if (resetErr) {
      setError(resetErr);
      return { success: false, error: resetErr };
    }
    return { success: true, error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error: string | null }> => {
    setError(null);
    setIsLoading(true);
    const { success, error: updateErr } = await apiUpdateUserPassword(newPassword);
    setIsLoading(false);
    if (updateErr) {
      setError(updateErr);
      return { success: false, error: updateErr };
    }
    setIsPasswordRecovery(false);
    return { success: true, error: null };
  }, []);

  const resetPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    await signOutUser();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    error,
    isSupabaseConfigured: isConfigured,
    isPasswordRecovery,
    signIn,
    signUp,
    sendOtp,
    requestPasswordReset,
    updatePassword,
    signOut,
    refreshProfile,
    clearError,
    resetPasswordRecovery,
  }), [user, session, profile, isLoading, isInitialized, error, isConfigured, isPasswordRecovery, signIn, signUp, sendOtp, requestPasswordReset, updatePassword, signOut, refreshProfile, clearError, resetPasswordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
