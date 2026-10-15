/**
 * CivicSphere AI — Application Entry & Routing
 * 
 * Controlled Application Implementation V1
 * Establishes:
 * - Application shell
 * - Supabase Auth session & profile hydration
 * - Tenant context & multi-tenant isolation
 * - Protected routes
 * - Technical role separation (Content & Learning vs Operations & Rewards)
 * - Subscription entitlements architecture
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { TenantDashboardPage } from './pages/tenant/TenantDashboardPage';
import { ContentModulePage } from './pages/tenant/ContentModulePage';
import { LearningModulePage } from './pages/tenant/LearningModulePage';
import { RewardsModulePage } from './pages/tenant/RewardsModulePage';
import { UsersModulePage } from './pages/tenant/UsersModulePage';
import { SettingsModulePage } from './pages/tenant/SettingsModulePage';

/**
 * Dynamic Root & Fallback Redirect
 * Directs unauthenticated users to /login,
 * platform owners & managers to /dashboard,
 * and standard members to /tenant/dashboard.
 */
function RootRedirect() {
  const { user, isInitialized, isLoading: isAuthLoading } = useAuth();
  const {
    isLoading: isTenantLoading,
    isPlatformOwner,
    isContentLearningManager,
    isOperationsRewardsManager,
  } = useTenant();

  if (!isInitialized || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Initializing workspace..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isTenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Verifying workspace permissions..." size="lg" />
      </div>
    );
  }

  if (isPlatformOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  if (isContentLearningManager) {
    return <Navigate to="/tenant/content" replace />;
  }
  if (isOperationsRewardsManager) {
    return <Navigate to="/tenant/rewards" replace />;
  }
  return <Navigate to="/tenant/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <TenantProvider>
            <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root redirects to role-appropriate home */}
            <Route
              path="/"
              element={<RootRedirect />}
            />

            {/* Protected Platform Overview Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'platform_owner',
                    'content_learning_manager',
                    'operations_rewards_manager',
                  ]}
                >
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Protected Tenant Workspace Routes */}
            <Route
              path="/tenant"
              element={<Navigate to="/tenant/dashboard" replace />}
            />

            <Route
              path="/tenant/dashboard"
              element={
                <ProtectedRoute requireTenant>
                  <AppShell>
                    <TenantDashboardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Domain A: Content & Learning Manager */}
            <Route
              path="/tenant/content"
              element={
                <ProtectedRoute requireTenant>
                  <AppShell>
                    <ContentModulePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tenant/learning"
              element={
                <ProtectedRoute requireTenant>
                  <AppShell>
                    <LearningModulePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Domain B: Operations & Rewards Manager */}
            <Route
              path="/tenant/rewards"
              element={
                <ProtectedRoute requireTenant>
                  <AppShell>
                    <RewardsModulePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tenant/users"
              element={
                <ProtectedRoute
                  requireTenant
                  allowedRoles={['operations_rewards_manager', 'platform_owner']}
                >
                  <AppShell>
                    <UsersModulePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Tenant Administration */}
            <Route
              path="/tenant/settings"
              element={
                <ProtectedRoute
                  requireTenant
                  allowedRoles={['platform_owner']}
                >
                  <AppShell>
                    <SettingsModulePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-All & Fallback */}
            <Route
              path="*"
              element={<RootRedirect />}
            />
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);
}
