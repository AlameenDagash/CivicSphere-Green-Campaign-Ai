import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { LoginForm } from '../components/auth/LoginForm';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const LoginPage: React.FC = () => {
  const { user, isInitialized, isLoading } = useAuth();
  const {
    isLoading: isTenantLoading,
    isPlatformOwner,
    isContentLearningManager,
    isOperationsRewardsManager,
  } = useTenant();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking authentication session..." size="lg" />
      </div>
    );
  }

  // If already authenticated, wait for tenant hydration then redirect role-appropriately
  if (user) {
    if (isTenantLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <LoadingSpinner message="Loading workspace profile..." size="lg" />
        </div>
      );
    }

    const stateFrom = (location.state as any)?.from?.pathname;
    let defaultDestination = '/tenant/dashboard';
    if (isPlatformOwner) {
      defaultDestination = '/dashboard';
    } else if (isContentLearningManager) {
      defaultDestination = '/tenant/content';
    } else if (isOperationsRewardsManager) {
      defaultDestination = '/tenant/rewards';
    } else {
      defaultDestination = '/tenant/dashboard';
    }

    // If stateFrom was /dashboard and user is not platform owner, safely fallback to tenant workspace
    const destination = (stateFrom === '/dashboard' && !isPlatformOwner)
      ? defaultDestination
      : (stateFrom || defaultDestination);

    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <LoginForm />
    </div>
  );
};
