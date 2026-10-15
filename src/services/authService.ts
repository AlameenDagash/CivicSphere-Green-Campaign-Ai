/**
 * CivicSphere AI — Authentication Service
 * 
 * Interacts with Supabase Auth and the `profiles` table.
 * Adheres to Supabase Auth lifecycle and RLS constraints.
 */

import { getSupabaseClient } from '../lib/supabase';
import type { Profile } from '../types/database.types';
import type { SignUpResult } from '../types/auth.types';
import type { User, Session } from '@supabase/supabase-js';

export const DEFAULT_CIVICSPHERE_APP_URL =
  'https://ais-dev-jkvy3coh2lvuurr5sfik5d-399133865126.europe-west2.run.app';

export const DEFAULT_PASSWORD_RESET_REDIRECT =
  'https://ais-dev-jkvy3coh2lvuurr5sfik5d-399133865126.europe-west2.run.app/reset-password';

/**
 * Resolves the password recovery redirect URL.
 * Explicitly prevents window.location.origin from resolving to an aistudio.google.com
 * or iframe host URL, falling back to the CivicSphere deployed application URL.
 */
export function getPasswordResetRedirectUrl(): string {
  // 1. Configurable through environment variable
  const envRedirect =
    import.meta.env.VITE_AUTH_RESET_REDIRECT_URL ||
    import.meta.env.VITE_APP_URL;

  if (envRedirect && typeof envRedirect === 'string' && envRedirect.trim()) {
    const trimmed = envRedirect.trim();
    if (trimmed.endsWith('/reset-password')) {
      return trimmed;
    }
    return `${trimmed.replace(/\/+$/, '')}/reset-password`;
  }

  // 2. Safe check of window.location.origin, strictly excluding any aistudio.google.com or sandbox origins
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (
      !origin.includes('aistudio.google.com') &&
      !origin.includes('googleusercontent.com') &&
      origin !== 'null' &&
      origin.startsWith('https://ais-')
    ) {
      return `${origin}/reset-password`;
    }
  }

  // 3. Current CivicSphere development fallback
  return DEFAULT_PASSWORD_RESET_REDIRECT;
}

export async function getCurrentSession(): Promise<{ session: Session | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { session: null, error: 'Supabase client not initialized' };
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (err: unknown) {
    return { session: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, session: null, error: 'Supabase client is not configured.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (err: unknown) {
    return {
      user: null,
      session: null,
      error: err instanceof Error ? err.message : 'Authentication request failed.',
    };
  }
}

/**
 * Registers a new user account with Supabase Auth, updates their profile name,
 * and calls public.provision_public_user_membership() with NO arguments.
 * 
 * Rules:
 * - Does NOT send tenant_id.
 * - Does NOT send role.
 * - Does NOT directly insert into tenant_memberships.
 * - Returns requiresEmailConfirmation flag if no active session is returned by Supabase.
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  fullName: string
): Promise<SignUpResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      user: null,
      session: null,
      membershipId: null,
      requiresEmailConfirmation: false,
      error: 'Supabase client is not configured.',
    };
  }

  const cleanEmail = email.trim();
  const cleanName = fullName.trim();

  try {
    // 1. Call Supabase Auth signUp
    const { data, error: signUpError } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (signUpError) {
      return {
        user: null,
        session: null,
        membershipId: null,
        requiresEmailConfirmation: false,
        error: signUpError.message,
      };
    }

    const createdUser = data.user;
    const currentSession = data.session;

    if (!createdUser) {
      return {
        user: null,
        session: null,
        membershipId: null,
        requiresEmailConfirmation: false,
        error: 'Registration failed to create a valid user account.',
      };
    }

    // 2. Check if email confirmation is required (user created but no active session)
    if (!currentSession) {
      return {
        user: createdUser,
        session: null,
        membershipId: null,
        requiresEmailConfirmation: true,
        error: null,
      };
    }

    // 3. Update profile full_name if established mechanism is available
    if (cleanName) {
      try {
        await updateUserProfile(createdUser.id, { full_name: cleanName });
      } catch (profErr) {
        console.warn('Could not update user full_name on profile:', profErr);
      }
    }

    // 4. Authoritative provisioning of public user membership for Tenant A
    // Calls public.provision_public_user_membership() with NO arguments.
    const { data: memId, error: rpcError } = await client.rpc(
      'provision_public_user_membership'
    );

    if (rpcError) {
      console.error('Error in provision_public_user_membership:', rpcError);
      return {
        user: createdUser,
        session: currentSession,
        membershipId: null,
        requiresEmailConfirmation: false,
        error: `Account created, but public membership setup failed: ${rpcError.message}`,
      };
    }

    return {
      user: createdUser,
      session: currentSession,
      membershipId: typeof memId === 'string' ? memId : String(memId ?? ''),
      requiresEmailConfirmation: false,
      error: null,
    };
  } catch (err: unknown) {
    return {
      user: null,
      session: null,
      membershipId: null,
      requiresEmailConfirmation: false,
      error: err instanceof Error ? err.message : 'Registration request failed.',
    };
  }
}


export function getAppBaseUrl(): string {
  const envAppUrl = import.meta.env.VITE_APP_URL;
  if (envAppUrl && typeof envAppUrl === 'string' && envAppUrl.trim()) {
    return envAppUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (
      !origin.includes('aistudio.google.com') &&
      !origin.includes('googleusercontent.com') &&
      origin !== 'null' &&
      origin.startsWith('https://ais-')
    ) {
      return origin;
    }
  }

  return DEFAULT_CIVICSPHERE_APP_URL;
}

export async function signInWithOtp(
  email: string,
  redirectTo?: string
): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase client is not configured.' };
  }

  const finalRedirect = redirectTo || getAppBaseUrl();

  try {
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: finalRedirect,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'OTP request failed.' };
  }
}

export async function signOutUser(): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: null };

  try {
    const { error } = await client.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Sign out failed.' };
  }
}

/**
 * Sends a password reset email via Supabase Auth with a redirect to the application's reset page.
 * Uses DEFAULT_PASSWORD_RESET_REDIRECT ("https://ais-dev-jkvy3coh2lvuurr5sfik5d-399133865126.europe-west2.run.app/reset-password")
 * by default, avoiding aistudio.google.com 403 errors.
 */
export async function requestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const finalRedirectTo = redirectTo || getPasswordResetRedirectUrl();

  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: finalRedirectTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Password reset request failed.',
    };
  }
}

/**
 * Updates the authenticated user's password using the active recovery session.
 */
export async function updateUserPassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update password.',
    };
  }
}

/**
 * Loads user profile from the authoritative `profiles` table.
 */
export async function fetchUserProfile(userId: string): Promise<{ profile: Profile | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }

    if (!data) {
      // User might be newly registered before trigger executes; return null without error
      return { profile: null, error: null };
    }

    return { profile: data as Profile, error: null };
  } catch (err: unknown) {
    return {
      profile: null,
      error: err instanceof Error ? err.message : 'Failed to query profile.',
    };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ profile: Profile | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      return { profile: null, error: error.message };
    }

    return { profile: data as Profile, error: null };
  } catch (err: unknown) {
    return {
      profile: null,
      error: err instanceof Error ? err.message : 'Failed to update profile.',
    };
  }
}
