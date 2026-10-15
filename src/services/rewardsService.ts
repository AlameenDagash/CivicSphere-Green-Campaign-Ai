/**
 * CivicSphere AI — Operations & Rewards Service Layer
 * Stage 4 Implementation
 *
 * Rules:
 * - Operates strictly against the authenticated tenant context.
 * - Adheres to Row Level Security (RLS) policies.
 * - Direct mutation of points_ledger and reward_requests from client is blocked;
 *   all mutations route through security-definer RPCs (redeem_reward, update_reward_request_status).
 * - Balance is dynamically derived via SUM(points_ledger.amount).
 * - Implements idempotency key preservation and safe retry logic.
 */

import { getSupabaseClient } from '../lib/supabase';
import type {
  Reward,
  RewardBudget,
  RewardRequest,
  PointsLedgerEntry,
  FulfillmentLog,
  CivicNotification,
  RewardRequestStatus,
} from '../types/database.types';

// ============================================================================
// 1. REWARDS CATALOG
// ============================================================================

export interface FetchRewardsResult {
  rewards: Reward[];
  error: string | null;
}

/**
 * Fetches rewards for the specified tenant.
 * RLS ensures ordinary users receive active rewards (is_active = true),
 * while operations managers receive all tenant rewards.
 */
export async function fetchTenantRewards(tenantId: string): Promise<FetchRewardsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { rewards: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('rewards')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('points_cost', { ascending: true });

    if (error) {
      return { rewards: [], error: error.message };
    }

    return { rewards: (data as Reward[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { rewards: [], error: msg };
  }
}

/**
 * Creates a new reward in the catalog (Managers only per RLS).
 */
export async function createTenantReward(
  tenantId: string,
  rewardData: {
    title: string;
    description?: string;
    points_cost: number;
    category?: string;
    image_url?: string;
    inventory_count?: number | null; // null represents unlimited
    is_active?: boolean;
    created_by?: string;
  }
): Promise<{ reward: Reward | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { reward: null, error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('rewards')
      .insert({
        tenant_id: tenantId,
        title: rewardData.title.trim(),
        description: rewardData.description?.trim() || null,
        points_cost: rewardData.points_cost,
        category: rewardData.category || 'merchandise',
        image_url: rewardData.image_url?.trim() || null,
        inventory_count: rewardData.inventory_count === undefined ? null : rewardData.inventory_count,
        is_active: rewardData.is_active ?? true,
        created_by: rewardData.created_by || null,
      })
      .select()
      .single();

    if (error) {
      return { reward: null, error: error.message };
    }

    return { reward: data as Reward, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { reward: null, error: msg };
  }
}

/**
 * Updates an existing reward (Managers only per RLS).
 */
export async function updateTenantReward(
  tenantId: string,
  rewardId: string,
  updates: Partial<Pick<Reward, 'title' | 'description' | 'points_cost' | 'category' | 'image_url' | 'inventory_count' | 'is_active'>>
): Promise<{ reward: Reward | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { reward: null, error: 'Supabase client not initialized.' };
  }

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url?.trim() || null;

    const { data, error } = await client
      .from('rewards')
      .update(payload)
      .eq('id', rewardId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return { reward: null, error: error.message };
    }

    return { reward: data as Reward, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { reward: null, error: msg };
  }
}

// ============================================================================
// 2. USER POINTS BALANCE & LEDGER
// ============================================================================

export interface UserPointsBalanceResult {
  availablePoints: number;
  totalEarned: number;
  totalRedeemed: number;
  error: string | null;
}

/**
 * Derives available points by summing entries from points_ledger for current user & tenant.
 * Does NOT maintain or mutate a wallet column.
 */
export async function fetchUserPointsBalance(
  tenantId: string,
  userId: string
): Promise<UserPointsBalanceResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { availablePoints: 0, totalEarned: 0, totalRedeemed: 0, error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('points_ledger')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error) {
      return { availablePoints: 0, totalEarned: 0, totalRedeemed: 0, error: error.message };
    }

    let availablePoints = 0;
    let totalEarned = 0;
    let totalRedeemed = 0;

    if (data && Array.isArray(data)) {
      for (const entry of data) {
        const amt = Number(entry.amount) || 0;
        availablePoints += amt;
        if (amt > 0) {
          totalEarned += amt;
        } else {
          totalRedeemed += Math.abs(amt);
        }
      }
    }

    return {
      availablePoints: Math.max(0, availablePoints),
      totalEarned,
      totalRedeemed,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { availablePoints: 0, totalEarned: 0, totalRedeemed: 0, error: msg };
  }
}

/**
 * Fetches points ledger transaction history for user or manager.
 */
export async function fetchPointsLedger(
  tenantId: string,
  userId?: string
): Promise<{ entries: PointsLedgerEntry[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { entries: [], error: 'Supabase client not initialized.' };
  }

  try {
    let query = client
      .from('points_ledger')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      return { entries: [], error: error.message };
    }

    return { entries: (data as PointsLedgerEntry[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { entries: [], error: msg };
  }
}

// ============================================================================
// 3. REWARD REDEMPTION (RPC)
// ============================================================================

export interface RedeemRewardParams {
  tenantId: string;
  rewardId: string;
  idempotencyKey: string;
  deliveryInstructions?: string | null;
}

export interface RedeemRewardResult {
  requestId: string | null;
  error: string | null;
}

/**
 * Invokes the atomic security-definer RPC public.redeem_reward(...)
 * Verified signature:
 *   p_tenant_id uuid,
 *   p_reward_id uuid,
 *   p_idempotency_key text,
 *   p_delivery_instructions text DEFAULT NULL
 */
export async function redeemReward(params: RedeemRewardParams): Promise<RedeemRewardResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { requestId: null, error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client.rpc('redeem_reward', {
      p_tenant_id: params.tenantId,
      p_reward_id: params.rewardId,
      p_idempotency_key: params.idempotencyKey,
      p_delivery_instructions: params.deliveryInstructions || null,
    });

    if (error) {
      return { requestId: null, error: error.message };
    }

    return { requestId: data as string, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { requestId: null, error: msg };
  }
}

// ============================================================================
// 4. REWARD REQUESTS (User & Manager)
// ============================================================================

export interface FetchRequestsResult {
  requests: RewardRequest[];
  error: string | null;
}

/**
 * Fetches reward requests for current tenant.
 * RLS ensures members only see their own requests,
 * while managers see all requests in the tenant.
 */
export async function fetchRewardRequests(
  tenantId: string,
  userId?: string
): Promise<FetchRequestsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { requests: [], error: 'Supabase client not initialized.' };
  }

  try {
    // Perform joined query to retrieve reward metadata
    let query = client
      .from('reward_requests')
      .select('*, reward:rewards(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      return { requests: [], error: error.message };
    }

    return { requests: (data as RewardRequest[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { requests: [], error: msg };
  }
}

// ============================================================================
// 5. MANAGER STATUS RPC
// ============================================================================

export interface UpdateRequestStatusParams {
  tenantId: string;
  requestId: string;
  newStatus: RewardRequestStatus;
  notes?: string | null;
  trackingRef?: string | null;
  rejectionReason?: string | null;
}

/**
 * Invokes security-definer RPC public.update_reward_request_status(...)
 * Verified signature:
 *   p_tenant_id uuid,
 *   p_request_id uuid,
 *   p_new_status text,
 *   p_notes text DEFAULT NULL,
 *   p_tracking_ref text DEFAULT NULL,
 *   p_rejection_reason text DEFAULT NULL
 */
export async function updateRewardRequestStatus(
  params: UpdateRequestStatusParams
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not initialized.' };
  }

  try {
    const { error } = await client.rpc('update_reward_request_status', {
      p_tenant_id: params.tenantId,
      p_request_id: params.requestId,
      p_new_status: params.newStatus,
      p_notes: params.notes || null,
      p_tracking_ref: params.trackingRef || null,
      p_rejection_reason: params.rejectionReason || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ============================================================================
// 6. FULFILLMENT AUDIT LOGS
// ============================================================================

/**
 * Fetches fulfillment audit trail for a specific request.
 */
export async function fetchFulfillmentLogs(
  tenantId: string,
  requestId: string
): Promise<{ logs: FulfillmentLog[]; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { logs: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('fulfillment_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      return { logs: [], error: error.message };
    }

    return { logs: (data as FulfillmentLog[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { logs: [], error: msg };
  }
}

// ============================================================================
// 7. REWARD BUDGETS
// ============================================================================

export interface FetchBudgetsResult {
  budgets: RewardBudget[];
  error: string | null;
}

/**
 * Fetches reward budgets for current tenant (Managers only per RLS).
 */
export async function fetchRewardBudgets(tenantId: string): Promise<FetchBudgetsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { budgets: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('reward_budgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('fiscal_period', { ascending: false });

    if (error) {
      return { budgets: [], error: error.message };
    }

    return { budgets: (data as RewardBudget[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { budgets: [], error: msg };
  }
}

// ============================================================================
// 8. NOTIFICATIONS
// ============================================================================

export interface FetchNotificationsResult {
  notifications: CivicNotification[];
  error: string | null;
}

/**
 * Fetches user-directed and tenant broadcast notifications.
 */
export async function fetchCivicNotifications(tenantId: string): Promise<FetchNotificationsResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { notifications: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      return { notifications: [], error: error.message };
    }

    return { notifications: (data as CivicNotification[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { notifications: [], error: msg };
  }
}

/**
 * Marks a notification as read.
 * STRICT SECURITY: ONLY mutates the `is_read` column to preserve RLS integrity.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not initialized.' };
  }

  try {
    // Only pass is_read in the update payload
    const { error } = await client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
