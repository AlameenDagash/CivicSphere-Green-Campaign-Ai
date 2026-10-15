import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean;
  allowedRoles?: (
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
    | 'public_user'
  )[];
}

// Canonical normalization for role checking
function isRolePermitted(
  currentRole: string,
  allowedRoles: string[],
  isPlatformOwner: boolean,
  isContentLearningManager: boolean,
  isOperationsRewardsManager: boolean
): boolean {
  if (isPlatformOwner || currentRole === 'platform_owner' || currentRole === 'super_admin' || currentRole === 'admin') {
    return true;
  }

  for (const allowed of allowedRoles) {
    if (allowed === currentRole) return true;

    // Content & Learning Manager aliases
    if (
      (allowed === 'content_learning_manager' || allowed === 'manager_content_learning' || allowed === 'content_manager') &&
      isContentLearningManager
    ) {
      return true;
    }

    // Operations & Rewards Manager aliases
    if (
      (allowed === 'operations_rewards_manager' || allowed === 'manager_operations_rewards' || allowed === 'rewards_manager') &&
      isOperationsRewardsManager
    ) {
      return true;
    }
  }

  return false;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireTenant = false,
  allowedRoles,
}) => {
  const location = useLocation();
  const { user, profile, isInitialized: isAuthInitialized, isLoading: isAuthLoading } = useAuth();
  const {
    activeMembership,
    activeTenant,
    isLoading: isTenantLoading,
    memberships,
    roleDisplayName,
    isPlatformOwner,
    isContentLearningManager,
    isOperationsRewardsManager,
  } = useTenant();

  if (!isAuthInitialized || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Authenticating session..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated, wait for tenant context hydration before evaluating route restrictions
  if (isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Verifying workspace permissions..." size="lg" />
      </div>
    );
  }

  // Tenant-specific route check
  if (requireTenant) {

    if (memberships.length === 0 || !activeTenant || !activeMembership) {
      const displayName = profile?.full_name || user.email;
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full rounded-xl bg-white border border-slate-200 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No Active Organization Membership
            </h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Your account (<span className="font-semibold text-slate-700">{displayName}</span>) does not belong to an active organization or your membership is pending verification.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to={isPlatformOwner || isContentLearningManager || isOperationsRewardsManager ? '/dashboard' : '/profile'}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                {isPlatformOwner || isContentLearningManager || isOperationsRewardsManager
                  ? 'Return to Platform Dashboard'
                  : 'Manage Your Profile'}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Role-specific check if route demands it
    if (allowedRoles && allowedRoles.length > 0) {
      const currentRole = activeMembership.role;
      const hasPermission = isRolePermitted(
        currentRole,
        allowedRoles,
        isPlatformOwner,
        isContentLearningManager,
        isOperationsRewardsManager
      );

      if (!hasPermission) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full rounded-xl bg-white border border-slate-200 p-8 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Administrative Role Required
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                This section is reserved for team members with specific workspace administrative responsibilities.
              </p>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 text-left space-y-1">
                <div>
                  <span className="text-slate-400">Current Assigned Role: </span>
                  <span className="font-semibold text-slate-800">{roleDisplayName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Required Role: </span>
                  <span className="font-semibold text-slate-800">
                    {allowedRoles
                      .map((r) => r.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
                      .join(' or ')}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Please contact your organization administrator if you need access to this operational domain.
              </p>
              <div className="mt-6">
                <Link
                  to="/tenant/dashboard"
                  className="inline-flex px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Back to Workspace Dashboard
                </Link>
              </div>
            </div>
          </div>
        );
      }
    }
  } else if (allowedRoles && allowedRoles.length > 0) {
    // Non-tenant routes with role restrictions (e.g., /dashboard)
    const currentRole = activeMembership?.role || 'public_user';
    const hasPermission = isRolePermitted(
      currentRole,
      allowedRoles,
      isPlatformOwner,
      isContentLearningManager,
      isOperationsRewardsManager
    );

    if (!hasPermission) {
      return <Navigate to="/tenant/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
