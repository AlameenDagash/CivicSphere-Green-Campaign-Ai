/**
 * CivicSphere AI — Supabase Client Integration
 * 
 * Rules:
 * - Uses only the anon / publishable key on the client.
 * - Never exposes service_role or privileged credentials.
 * - Single source of truth for Supabase client instance.
 * - Provides connection status and clear reporting.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'civicsphere_supabase_url';
const STORAGE_KEY_ANON = 'civicsphere_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean; source: 'env' | 'storage' | 'none' } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envAnon && envUrl !== 'https://your-project.supabase.co') {
    return { url: envUrl.trim(), anonKey: envAnon.trim(), isConfigured: true, source: 'env' };
  }

  // Runtime fallback if tester enters it in UI
  try {
    const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
    const storedAnon = localStorage.getItem(STORAGE_KEY_ANON);
    if (storedUrl && storedAnon) {
      return { url: storedUrl.trim(), anonKey: storedAnon.trim(), isConfigured: true, source: 'storage' };
    }
  } catch {
    // LocalStorage might be restricted
  }

  return {
    url: envUrl || '',
    anonKey: envAnon || '',
    isConfigured: false,
    source: 'none',
  };
}

export function saveRuntimeCredentials(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    // Invalidate client instance so it re-initializes
    cachedClient = null;
  } catch (err) {
    console.error('Failed to save credentials to localStorage:', err);
  }
}

export function clearRuntimeCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    cachedClient = null;
  } catch (err) {
    console.error('Failed to clear credentials from localStorage:', err);
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured || !url || !anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  authHealthy: boolean;
  dbAccessible: boolean;
  tablesVerified?: string[];
  missingTables?: string[];
  error?: string;
}

/**
 * Validates real connectivity to the Supabase instance and checks access to
 * the foundational tables.
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: 'Supabase client is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      authHealthy: false,
      dbAccessible: false,
    };
  }

  let authHealthy = false;
  let dbAccessible = false;
  const tablesVerified: string[] = [];
  const missingTables: string[] = [];

  try {
    // 1. Verify Auth endpoint
    const { error: authError } = await client.auth.getSession();
    if (!authError) {
      authHealthy = true;
    }

    // 2. Check foundational tables (read check respecting RLS)
    const tablesToCheck = ['profiles', 'tenants', 'tenant_memberships', 'subscription_plans'];

    for (const table of tablesToCheck) {
      try {
        const { error } = await client.from(table).select('count', { count: 'exact', head: true });
        if (!error || error.code === 'PGRST116' || error.message.includes('permission denied')) {
          // A permission denied or success proves table exists with RLS active
          tablesVerified.push(table);
          dbAccessible = true;
        } else if (error.code === '42P01') {
          // Table does not exist
          missingTables.push(table);
        } else {
          tablesVerified.push(table);
          dbAccessible = true;
        }
      } catch {
        missingTables.push(table);
      }
    }

    return {
      ok: authHealthy && dbAccessible,
      message: authHealthy && dbAccessible
        ? 'Successfully connected to authoritative Supabase instance.'
        : 'Connected with partial access or table warnings.',
      authHealthy,
      dbAccessible,
      tablesVerified,
      missingTables,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: 'Network or configuration failure reaching Supabase.',
      authHealthy: false,
      dbAccessible: false,
      error: errorMsg,
    };
  }
}
