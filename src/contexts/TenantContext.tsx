/**
 * CivicSphere AI — Multi-Tenant Context Provider
 * 
 * Rules:
 * - Scoped strictly to active tenant memberships (`is_tenant_member` architecture).
 * - Never trusts browser-supplied tenant ID without database authorization.
 * - Enforces technical separation between Content & Learning Manager and Operations & Rewards Manager.
 * - Computes dynamic entitlements from plans, plan_features, and overrides.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import {
  fetchUserMemberships,
  fetchTenantById,
  fetchTenantBranding,
  fetchTenantSettings,
  fetchTenantLocation,
  provisionPublicUserMembership,
} from '../services/tenantService';
import {
  fetchTenantSubscription,
  fetchPlanFeatures,
  fetchTenantFeatureOverrides,
  resolveTenantEntitlements,
} from '../services/subscriptionService';
import type {
  Tenant,
  TenantMembership,
  TenantBranding,
  TenantSettings,
  TenantLocation,
  TenantSubscription,
  TenantRole,
  PlanFeatureKey,
} from '../types/database.types';

const STORAGE_ACTIVE_TENANT_ID = 'civicsphere_active_tenant_id';

export interface TenantContextValue {
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeMembership: TenantMembership | null;
  activeRole: TenantRole | string | null;
  branding: TenantBranding | null;
  settings: TenantSettings | null;
  location: TenantLocation | null;
  subscription: TenantSubscription | null;
  entitlements: Set<string>;
  hasEntitlement: (feature: PlanFeatureKey | string) => boolean;
  switchTenant: (tenantId: string) => Promise<boolean>;
  reloadTenantData: () => Promise<void>;
  reloadMemberships: (userId?: string) => Promise<TenantMembership[]>;
  isLoading: boolean;
  error: string | null;
  // Role checks
  isContentLearningManager: boolean;
  isOperationsRewardsManager: boolean;
  isPlatformOwner: boolean;
  isMember: boolean;
  roleDisplayName: string;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isInitialized: isAuthInitialized } = useAuth();

  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeMembership, setActiveMembership] = useState<TenantMembership | null>(null);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [location, setLocation] = useState<TenantLocation | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks user IDs that have been evaluated for auto-provisioning to avoid repeated RPC calls or loops
  const provisioningAttemptedRef = useRef<Set<string>>(new Set());

  // Load all tenant-specific resources once an active tenant is selected
  const loadActiveTenantResources = useCallback(async (tenantId: string, currentMembership: TenantMembership) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch tenant base if not populated from membership join
      let tenantData = currentMembership.tenant ?? null;
      if (!tenantData) {
        const { tenant: fetchedTenant, error: tenantErr } = await fetchTenantById(tenantId);
        if (tenantErr) console.warn('Could not fetch tenant detail:', tenantErr);
        tenantData = fetchedTenant;
      }
      setActiveTenant(tenantData);

      // 2. Fetch branding, settings, and location in parallel
      const [brandingRes, settingsRes, locationRes, subRes, overridesRes] = await Promise.all([
        fetchTenantBranding(tenantId),
        fetchTenantSettings(tenantId),
        fetchTenantLocation(tenantId),
        fetchTenantSubscription(tenantId),
        fetchTenantFeatureOverrides(tenantId),
      ]);

      setBranding(brandingRes.branding);
      setSettings(settingsRes.settings);
      setLocation(locationRes.location);
      setSubscription(subRes.subscription);

      // 3. Resolve subscription entitlements
      let planFeatures: any[] = [];
      if (subRes.subscription?.plan_id) {
        const pfRes = await fetchPlanFeatures(subRes.subscription.plan_id);
        planFeatures = pfRes.features;
      }

      const activePlanCode = subRes.subscription?.plan?.code ?? null;
      const computedEntitlements = resolveTenantEntitlements(
        activePlanCode,
        planFeatures,
        overridesRes.overrides
      );
      setEntitlements(computedEntitlements);
    } catch (err: unknown) {
      console.error('Error loading tenant context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenant data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Main effect: runs whenever authenticated user changes
  useEffect(() => {
    if (!isAuthInitialized) return;

    if (!user) {
      setMemberships([]);
      setActiveTenant(null);
      setActiveMembership(null);
      setBranding(null);
      setSettings(null);
      setLocation(null);
      setSubscription(null);
      setEntitlements(new Set());
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchUserMemberships(user.id).then(async ({ memberships: userMemberships, error: memError }) => {
      if (!isMounted) return;

      if (memError) {
        setError(memError);
        setIsLoading(false);
        return;
      }

      setMemberships(userMemberships);

      if (userMemberships.length === 0) {
        // If the authenticated user has no memberships and has not been provisioned in this session,
        // automatically invoke public.provision_public_user_membership() with ZERO parameters
        if (!provisioningAttemptedRef.current.has(user.id)) {
          provisioningAttemptedRef.current.add(user.id);
          const { error: provError } = await provisionPublicUserMembership();
          if (!provError && isMounted) {
            // Re-fetch memberships immediately after successful provisioning
            const { memberships: refreshedMemberships, error: refreshError } =
              await fetchUserMemberships(user.id);
            if (!refreshError && refreshedMemberships.length > 0) {
              setMemberships(refreshedMemberships);
              const selectedMembership = refreshedMemberships[0];
              setActiveMembership(selectedMembership);
              localStorage.setItem(STORAGE_ACTIVE_TENANT_ID, selectedMembership.tenant_id);
              await loadActiveTenantResources(selectedMembership.tenant_id, selectedMembership);
              return;
            }
          } else if (provError) {
            console.warn('Auto-provisioning membership for new user failed:', provError);
          }
        }

        // User has no active tenant memberships
        setActiveTenant(null);
        setActiveMembership(null);
        setIsLoading(false);
        return;
      }

      // Check saved preference or fallback to first active membership
      const savedTenantId = localStorage.getItem(STORAGE_ACTIVE_TENANT_ID);
      const selectedMembership =
        userMemberships.find((m) => m.tenant_id === savedTenantId) || userMemberships[0];

      setActiveMembership(selectedMembership);
      localStorage.setItem(STORAGE_ACTIVE_TENANT_ID, selectedMembership.tenant_id);

      await loadActiveTenantResources(selectedMembership.tenant_id, selectedMembership);
    });

    return () => {
      isMounted = false;
    };
  }, [user, isAuthInitialized, loadActiveTenantResources]);

  // Switch to another tenant (only if authorized)
  const switchTenant = useCallback(
    async (targetTenantId: string): Promise<boolean> => {
      const targetMembership = memberships.find((m) => m.tenant_id === targetTenantId);
      if (!targetMembership) {
        setError('Unauthorized: You are not an active member of this tenant.');
        return false;
      }

      localStorage.setItem(STORAGE_ACTIVE_TENANT_ID, targetTenantId);
      setActiveMembership(targetMembership);
      await loadActiveTenantResources(targetTenantId, targetMembership);
      return true;
    },
    [memberships, loadActiveTenantResources]
  );

  const reloadTenantData = useCallback(async () => {
    if (activeMembership?.tenant_id) {
      await loadActiveTenantResources(activeMembership.tenant_id, activeMembership);
    }
  }, [activeMembership, loadActiveTenantResources]);

  const reloadMemberships = useCallback(async (targetUserId?: string): Promise<TenantMembership[]> => {
    const effectiveUserId = targetUserId || user?.id;
    if (!effectiveUserId) return [];
    setIsLoading(true);
    setError(null);
    try {
      let { memberships: userMemberships, error: memError } = await fetchUserMemberships(effectiveUserId);
      if (memError) {
        setError(memError);
        return [];
      }

      if (userMemberships.length === 0 && !provisioningAttemptedRef.current.has(effectiveUserId)) {
        provisioningAttemptedRef.current.add(effectiveUserId);
        const { error: provError } = await provisionPublicUserMembership();
        if (!provError) {
          const { memberships: refreshed, error: refError } = await fetchUserMemberships(effectiveUserId);
          if (!refError) {
            userMemberships = refreshed;
          }
        } else {
          console.warn('Auto-provisioning membership in reloadMemberships failed:', provError);
        }
      }

      setMemberships(userMemberships);
      if (userMemberships.length > 0) {
        const savedTenantId = localStorage.getItem(STORAGE_ACTIVE_TENANT_ID);
        const selectedMembership =
          userMemberships.find((m) => m.tenant_id === savedTenantId) || userMemberships[0];
        setActiveMembership(selectedMembership);
        localStorage.setItem(STORAGE_ACTIVE_TENANT_ID, selectedMembership.tenant_id);
        await loadActiveTenantResources(selectedMembership.tenant_id, selectedMembership);
      } else {
        setActiveTenant(null);
        setActiveMembership(null);
      }
      return userMemberships;
    } finally {
      setIsLoading(false);
    }
  }, [user, loadActiveTenantResources]);

  const hasEntitlement = useCallback(
    (feature: PlanFeatureKey | string): boolean => {
      return entitlements.has(feature);
    },
    [entitlements]
  );

  // Derived role status & display
  const activeRole = activeMembership?.role ?? null;

  const isContentLearningManager =
    activeRole === 'content_learning_manager' ||
    activeRole === 'manager_content_learning' ||
    activeRole === 'content_manager';

  const isOperationsRewardsManager =
    activeRole === 'operations_rewards_manager' ||
    activeRole === 'manager_operations_rewards' ||
    activeRole === 'rewards_manager';

  const isPlatformOwner =
    activeRole === 'platform_owner' || activeRole === 'super_admin' || activeRole === 'admin';

  const isMember = activeRole === 'member' || (!isContentLearningManager && !isOperationsRewardsManager && !isPlatformOwner);

  const roleDisplayName = useMemo(() => {
    if (isPlatformOwner) return 'Platform Owner';
    if (isContentLearningManager) return 'Content & Learning Manager';
    if (isOperationsRewardsManager) return 'Operations & Rewards Manager';
    if (activeRole) {
      return activeRole
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return 'Public User';
  }, [isPlatformOwner, isContentLearningManager, isOperationsRewardsManager, activeRole]);

  const value = useMemo<TenantContextValue>(
    () => ({
      memberships,
      activeTenant,
      activeMembership,
      activeRole,
      branding,
      settings,
      location,
      subscription,
      entitlements,
      hasEntitlement,
      switchTenant,
      reloadTenantData,
      reloadMemberships,
      isLoading,
      error,
      isContentLearningManager,
      isOperationsRewardsManager,
      isPlatformOwner,
      isMember,
      roleDisplayName,
    }),
    [
      memberships,
      activeTenant,
      activeMembership,
      activeRole,
      branding,
      settings,
      location,
      subscription,
      entitlements,
      hasEntitlement,
      switchTenant,
      reloadTenantData,
      reloadMemberships,
      isLoading,
      error,
      isContentLearningManager,
      isOperationsRewardsManager,
      isPlatformOwner,
      isMember,
      roleDisplayName,
    ]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
