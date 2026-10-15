/**
 * CivicSphere AI — Database Types & Domain Models
 * Derived from the authoritative Supabase database foundation.
 * 
 * Rules:
 * - Do NOT alter or recreate tables.
 * - Adhere to Row Level Security and tenant boundaries.
 */

export type TenantRole =
  | 'content_learning_manager'
  | 'manager_content_learning'
  | 'content_manager'
  | 'operations_rewards_manager'
  | 'manager_operations_rewards'
  | 'rewards_manager'
  | 'platform_owner'
  | 'super_admin'
  | 'admin'
  | 'member'
  | 'public_user';

export type PlanFeatureKey =
  | 'academy'
  | 'rewards'
  | 'ai_assistant'
  | 'video'
  | 'quiz_after_video'
  | 'watch_to_earn'
  | 'video_rewards'
  | 'certificates'
  | 'badges';

export type SubscriptionPlanCode = 'basic' | 'professional' | 'enterprise';

export type MembershipStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'inactive';

// ==========================================
// 1. FOUNDATION TABLES
// ==========================================

export interface Profile {
  id: string; // references auth.users.id
  email?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone?: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole | string;
  status: MembershipStatus;
  created_at: string;
  updated_at?: string | null;
  // Optional joined data
  tenant?: Tenant;
}

export interface TenantSettings {
  id?: string;
  tenant_id: string;
  allow_public_registration?: boolean;
  require_email_verification?: boolean;
  default_language?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface TenantBranding {
  id?: string;
  tenant_id: string;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  created_at?: string;
  updated_at?: string | null;
}

// ==========================================
// 2. GEOGRAPHY TABLES
// ==========================================

export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface StateRegion {
  id: string;
  country_id: string;
  code: string;
  name: string;
}

export interface LGA {
  id: string;
  state_id: string;
  code?: string;
  name: string;
}

export interface Jurisdiction {
  id: string;
  name: string;
  type?: string;
}

export interface TenantLocation {
  id: string;
  tenant_id: string;
  country_id?: string | null;
  state_id?: string | null;
  lga_id?: string | null;
  jurisdiction_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  // Joined relation names when loaded
  country?: Country | null;
  state?: StateRegion | null;
  lga?: LGA | null;
  jurisdiction?: Jurisdiction | null;
}

// ==========================================
// 3. SUBSCRIPTION TABLES
// ==========================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: SubscriptionPlanCode | string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: PlanFeatureKey | string;
  created_at?: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  plan?: SubscriptionPlan;
}

export interface TenantFeatureOverride {
  id: string;
  tenant_id: string;
  feature_key: PlanFeatureKey | string;
  is_enabled: boolean;
  created_at?: string;
}

// ==========================================
// 4. OPERATIONS & REWARDS TABLES (Stage 4)
// ==========================================

export type RewardCategory =
  | 'merchandise'
  | 'voucher'
  | 'experience'
  | 'civic_perk'
  | 'recognition';

export type RewardRequestStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'fulfilled'
  | 'rejected'
  | 'cancelled';

export type PointsLedgerEntryType =
  | 'course_completion'
  | 'event_attendance'
  | 'activity_participation'
  | 'survey_response'
  | 'reward_redemption'
  | 'manual_adjustment'
  | 'refund';

export type FulfillmentAction =
  | 'approved'
  | 'moved_to_processing'
  | 'dispatched'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export type NotificationType =
  | 'operational'
  | 'reward'
  | 'learning'
  | 'announcement'
  | 'system';

export interface Reward {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  points_cost: number;
  category: RewardCategory | string;
  image_url: string | null;
  inventory_count: number | null; // null = unlimited inventory
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardBudget {
  id: string;
  tenant_id: string;
  fiscal_period: string;
  total_points_budget: number;
  allocated_points: number;
  is_closed: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardRequest {
  id: string;
  tenant_id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: RewardRequestStatus;
  delivery_instructions: string | null;
  rejection_reason: string | null;
  idempotency_key: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  reward?: Reward | null;
  profile?: Profile | null;
}

export interface PointsLedgerEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  amount: number;
  entry_type: PointsLedgerEntryType | string;
  reference_table: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  description: string;
  issued_by: string | null;
  created_at: string;
}

export interface FulfillmentLog {
  id: string;
  tenant_id: string;
  request_id: string;
  actor_id: string;
  action: FulfillmentAction;
  notes: string | null;
  tracking_reference: string | null;
  created_at: string;
  // Optional joined actor profile
  actor_profile?: Profile | null;
}

export interface CivicNotification {
  id: string;
  tenant_id: string;
  user_id: string | null; // null = tenant broadcast
  title: string;
  message: string;
  type: NotificationType | string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

// ==========================================
// COMPOSITE TENANT CONTEXT PAYLOAD
// ==========================================

export interface ActiveTenantContext {
  tenant: Tenant;
  membership: TenantMembership;
  role: TenantRole | string;
  branding?: TenantBranding | null;
  settings?: TenantSettings | null;
  subscription?: TenantSubscription | null;
  features: Set<string>;
  location?: TenantLocation | null;
}
