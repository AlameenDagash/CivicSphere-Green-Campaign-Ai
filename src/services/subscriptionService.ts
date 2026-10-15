/**
 * CivicSphere AI — Subscription & Entitlements Service
 * 
 * Interacts with:
 * - `subscription_plans`
 * - `plan_features`
 * - `tenant_subscriptions`
 * - `tenant_feature_overrides`
 * 
 * Baseline verified plan features:
 * - Basic: academy, rewards, ai_assistant
 * - Professional: academy, rewards, video, quiz_after_video, ai_assistant
 * - Enterprise: academy, rewards, video, quiz_after_video, ai_assistant, watch_to_earn, video_rewards, certificates, badges
 * 
 * NOTE: Pricing has NOT been finalized. No prices are invented or hardcoded.
 */

import { getSupabaseClient } from '../lib/supabase';
import type {
  SubscriptionPlan,
  PlanFeature,
  TenantSubscription,
  TenantFeatureOverride,
  PlanFeatureKey,
} from '../types/database.types';

export const BASELINE_PLAN_FEATURES: Record<string, PlanFeatureKey[]> = {
  basic: ['academy', 'rewards', 'ai_assistant'],
  professional: ['academy', 'rewards', 'video', 'quiz_after_video', 'ai_assistant'],
  enterprise: [
    'academy',
    'rewards',
    'video',
    'quiz_after_video',
    'ai_assistant',
    'watch_to_earn',
    'video_rewards',
    'certificates',
    'badges',
  ],
};

/**
 * Loads the active subscription for a specific tenant.
 * Joins plan information.
 */
export async function fetchTenantSubscription(tenantId: string): Promise<{
  subscription: TenantSubscription | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { subscription: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenant_subscriptions')
      .select(`
        id,
        tenant_id,
        plan_id,
        status,
        starts_at,
        ends_at,
        created_at,
        plan:subscription_plans (
          id,
          name,
          code,
          description,
          is_active
        )
      `)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      return { subscription: null, error: error.message };
    }

    if (!data) {
      return { subscription: null, error: null };
    }

    const transformed: TenantSubscription = {
      id: data.id,
      tenant_id: data.tenant_id,
      plan_id: data.plan_id,
      status: data.status,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      created_at: data.created_at,
      plan: Array.isArray(data.plan) ? data.plan[0] : data.plan,
    };

    return { subscription: transformed, error: null };
  } catch (err: unknown) {
    return {
      subscription: null,
      error: err instanceof Error ? err.message : 'Failed to query tenant subscription.',
    };
  }
}

/**
 * Loads dynamic plan features configured in `plan_features` table.
 */
export async function fetchPlanFeatures(planId: string): Promise<{
  features: PlanFeature[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { features: [], error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('plan_features')
      .select('*')
      .eq('plan_id', planId);

    if (error) {
      return { features: [], error: error.message };
    }

    return { features: (data as PlanFeature[]) || [], error: null };
  } catch (err: unknown) {
    return {
      features: [],
      error: err instanceof Error ? err.message : 'Failed to query plan features.',
    };
  }
}

/**
 * Loads tenant-specific feature overrides from `tenant_feature_overrides`.
 */
export async function fetchTenantFeatureOverrides(tenantId: string): Promise<{
  overrides: TenantFeatureOverride[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { overrides: [], error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('tenant_feature_overrides')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      return { overrides: [], error: error.message };
    }

    return { overrides: (data as TenantFeatureOverride[]) || [], error: null };
  } catch (err: unknown) {
    return {
      overrides: [],
      error: err instanceof Error ? err.message : 'Failed to query feature overrides.',
    };
  }
}

/**
 * Evaluates active entitlements by merging plan baseline, DB plan features,
 * and tenant-specific feature overrides.
 */
export function resolveTenantEntitlements(
  planCode?: string | null,
  dbPlanFeatures?: PlanFeature[],
  overrides?: TenantFeatureOverride[]
): Set<string> {
  const activeFeatures = new Set<string>();

  // 1. Add baseline features for plan code if recognized
  if (planCode) {
    const normalizedCode = planCode.toLowerCase().trim();
    const baseline = BASELINE_PLAN_FEATURES[normalizedCode];
    if (baseline) {
      baseline.forEach((feat) => activeFeatures.add(feat));
    }
  }

  // 2. Add features from plan_features table if present
  if (dbPlanFeatures && dbPlanFeatures.length > 0) {
    dbPlanFeatures.forEach((pf) => activeFeatures.add(pf.feature_key));
  }

  // 3. Apply tenant-specific overrides (can explicitly enable or disable)
  if (overrides && overrides.length > 0) {
    overrides.forEach((ov) => {
      if (ov.is_enabled) {
        activeFeatures.add(ov.feature_key);
      } else {
        activeFeatures.delete(ov.feature_key);
      }
    });
  }

  return activeFeatures;
}
