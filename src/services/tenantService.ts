/**
 * CivicSphere AI — Tenant Service
 * 
 * Interacts with:
 * - `tenant_memberships`
 * - `tenants`
 * - `tenant_branding`
 * - `tenant_settings`
 * - `tenant_locations` (plus geography tables)
 * 
 * Strict RLS compliance: queries scoped to authenticated user's active memberships.
 */

import { getSupabaseClient } from '../lib/supabase';
import type {
  Tenant,
  TenantMembership,
  TenantBranding,
  TenantSettings,
  TenantLocation,
} from '../types/database.types';

/**
 * Loads all active memberships for the authenticated user.
 * Queries public.tenant_memberships for exact auth.uid() where status = 'active',
 * and resolves the associated tenant records.
 */
export async function fetchUserMemberships(userId: string): Promise<{
  memberships: TenantMembership[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { memberships: [], error: 'Supabase client not initialized' };
  }

  try {
    // 1. Query public.tenant_memberships for authenticated user ID where status is 'active'
    const { data: memRows, error: memError } = await client
      .from('tenant_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memError) {
      console.error('Error fetching tenant memberships:', memError);
      return { memberships: [], error: memError.message };
    }

    if (!memRows || memRows.length === 0) {
      return { memberships: [], error: null };
    }

    // 2. Load associated tenants for all retrieved active memberships
    const tenantIds = Array.from(
      new Set(memRows.map((r: any) => r.tenant_id).filter(Boolean))
    );

    const tenantsMap = new Map<string, Tenant>();

    if (tenantIds.length > 0) {
      const { data: tenantsData, error: tenantsError } = await client
        .from('tenants')
        .select('*')
        .in('id', tenantIds);

      if (!tenantsError && tenantsData) {
        for (const t of tenantsData) {
          tenantsMap.set(t.id, t as Tenant);
        }
      } else {
        // Fallback: load tenant individually if batch query has constraints
        await Promise.all(
          tenantIds.map(async (tid) => {
            const { tenant } = await fetchTenantById(tid);
            if (tenant) {
              tenantsMap.set(tid, tenant);
            }
          })
        );
      }
    }

    // 3. Transform into clean TenantMembership[] with associated tenant attached
    const transformed: TenantMembership[] = memRows.map((row: any) => {
      const associatedTenant = tenantsMap.get(row.tenant_id);

      const tenant: Tenant = associatedTenant || {
        id: row.tenant_id,
        name: row.tenant_name || 'CivicSphere Tenant',
        slug: row.tenant_slug || row.tenant_id,
        description: row.tenant_description || null,
        is_active: true,
        created_at: row.created_at || new Date().toISOString(),
      };

      return {
        id: row.id,
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        role: row.role,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at || null,
        tenant,
      };
    });

    return { memberships: transformed, error: null };
  } catch (err: unknown) {
    console.error('Unexpected error in fetchUserMemberships:', err);
    return {
      memberships: [],
      error: err instanceof Error ? err.message : 'Failed to query tenant memberships.',
    };
  }
}

/**
 * Loads detailed tenant information by ID.
 * Respects RLS: user must be an active member of this tenant.
 */
export async function fetchTenantById(tenantId: string): Promise<{
  tenant: Tenant | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { tenant: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      return { tenant: null, error: error.message };
    }

    return { tenant: data as Tenant, error: null };
  } catch (err: unknown) {
    return {
      tenant: null,
      error: err instanceof Error ? err.message : 'Failed to query tenant.',
    };
  }
}

/**
 * Loads tenant branding configuration.
 */
export async function fetchTenantBranding(tenantId: string): Promise<{
  branding: TenantBranding | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { branding: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenant_branding')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      return { branding: null, error: error.message };
    }

    return { branding: data as TenantBranding, error: null };
  } catch (err: unknown) {
    return {
      branding: null,
      error: err instanceof Error ? err.message : 'Failed to query branding.',
    };
  }
}

/**
 * Loads tenant settings.
 */
export async function fetchTenantSettings(tenantId: string): Promise<{
  settings: TenantSettings | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { settings: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      return { settings: null, error: error.message };
    }

    return { settings: data as TenantSettings, error: null };
  } catch (err: unknown) {
    return {
      settings: null,
      error: err instanceof Error ? err.message : 'Failed to query tenant settings.',
    };
  }
}

/**
 * Loads tenant location and associated geographic entities.
 */
export async function fetchTenantLocation(tenantId: string): Promise<{
  location: TenantLocation | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { location: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenant_locations')
      .select(`
        *,
        country:countries (id, code, name),
        state:states (id, code, name),
        lga:lgas (id, code, name),
        jurisdiction:jurisdictions (id, name, type)
      `)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      return { location: null, error: error.message };
    }

    return { location: data as TenantLocation, error: null };
  } catch (err: unknown) {
    return {
      location: null,
      error: err instanceof Error ? err.message : 'Failed to query tenant location.',
    };
  }
}

/**
 * Authoritatively provisions an active public_user membership for the authenticated user
 * in CivicSphere Test A by calling the database RPC `provision_public_user_membership()` with ZERO parameters.
 * 
 * Rules:
 * - Security-definer server-side RPC fixes tenant to CivicSphere Test A and role to 'public_user'.
 * - No client parameters or role overrides.
 * - Returns membership ID string or error.
 */
export async function provisionPublicUserMembership(): Promise<{
  membershipId: string | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { membershipId: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client.rpc('provision_public_user_membership');
    if (error) {
      console.error('Error invoking provision_public_user_membership:', error);
      return { membershipId: null, error: error.message };
    }

    return {
      membershipId: typeof data === 'string' ? data : String(data ?? ''),
      error: null,
    };
  } catch (err: unknown) {
    return {
      membershipId: null,
      error: err instanceof Error ? err.message : 'Failed to provision public membership.',
    };
  }
}

