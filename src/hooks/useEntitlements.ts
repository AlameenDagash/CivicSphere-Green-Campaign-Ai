/**
 * CivicSphere AI — Entitlements & Subscription Access Hook
 * 
 * Provides a clean abstraction over subscription plans, plan features,
 * and tenant feature overrides without hard-coding access rules in UI components.
 */

import { useTenant } from './useTenant';
import type { PlanFeatureKey } from '../types/database.types';

export interface UseEntitlementsResult {
  hasFeature: (key: PlanFeatureKey | string) => boolean;
  activeFeatures: string[];
  planName: string;
  planCode: string | null;
  subscriptionStatus: string | null;
  isEnterprise: boolean;
  isProfessional: boolean;
  isBasic: boolean;
}

export function useEntitlements(): UseEntitlementsResult {
  const { entitlements, subscription, hasEntitlement } = useTenant();

  const planCode = subscription?.plan?.code ?? null;
  const planName = subscription?.plan?.name ?? 'No Active Plan';
  const subscriptionStatus = subscription?.status ?? null;

  const isEnterprise = planCode === 'enterprise';
  const isProfessional = planCode === 'professional' || isEnterprise;
  const isBasic = planCode === 'basic' || isProfessional;

  return {
    hasFeature: hasEntitlement,
    activeFeatures: Array.from(entitlements),
    planName,
    planCode,
    subscriptionStatus,
    isEnterprise,
    isProfessional,
    isBasic,
  };
}
