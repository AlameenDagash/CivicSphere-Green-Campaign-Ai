import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { user, profile, isSupabaseConfigured } = useAuth();
  const { t } = useLanguage();
  const {
    memberships,
    activeTenant,
    roleDisplayName,
    switchTenant,
    isLoading: isTenantLoading,
    subscription,
    location,
  } = useTenant();

  if (isTenantLoading) {
    return <LoadingSpinner message={t('state.loading')} />;
  }

  const planName = subscription?.plan?.name || (subscription?.plan?.code ? subscription.plan.code.toUpperCase() : 'Standard Plan');

  return (
    <div className="space-y-6">
      {/* Top Banner & Welcome */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>CivicSphere AI</span>
              <span aria-hidden="true">·</span>
              <span>{t('dashboard.platform')}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {t('dashboard.welcomeBack')}, {profile?.full_name || t('dashboard.civicLeader')}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {activeTenant ? (
                <>
                  {t('dashboard.activeOrg')}: <span className="font-semibold text-slate-700">{activeTenant.name}</span>
                  {roleDisplayName ? (
                    <>
                      {' · '}
                      <span className="text-slate-600">{roleDisplayName}</span>
                    </>
                  ) : null}
                </>
              ) : roleDisplayName ? (
                <>
                  {t('dashboard.role')}: <span className="font-semibold text-slate-700">{roleDisplayName}</span>
                </>
              ) : (
                <span className="text-slate-600">{t('dashboard.activeWorkspace')}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              {t('dashboard.manageProfile')}
            </Link>
            {activeTenant && (
              <Link
                to="/tenant/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
              >
                <span>{t('dashboard.enterWorkspace')} {activeTenant.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Key Metric & Context Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tenant Memberships */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('dashboard.activeTenants')}</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">
            {memberships.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {t('dashboard.verifiedAccess')}
          </div>
        </div>

        {/* Metric 2: Assigned Role */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('dashboard.currentRole')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900 truncate">
            {roleDisplayName}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {activeTenant ? activeTenant.name : t('dashboard.noMemberships')}
          </div>
        </div>

        {/* Metric 3: Active Subscription Tier */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('dashboard.subscriptionTier')}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900">
            {planName}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {t('dashboard.status')}: <span className="font-semibold text-emerald-600 capitalize">{subscription?.status || t('state.active')}</span>
          </div>
        </div>

        {/* Metric 4: Jurisdiction / Geography */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('dashboard.jurisdiction')}</span>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900 truncate">
            {location?.lga?.name || location?.state?.name || location?.country?.name || 'Global'}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {location?.jurisdiction?.name || t('settings.geographicJurisdiction')}
          </div>
        </div>
      </div>

      {/* Tenant Memberships Roster */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {t('dashboard.activeMemberships')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dashboard.verifiedAccess')}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {memberships.length} {memberships.length === 1 ? t('dashboard.organization') : t('dashboard.organizations')}
          </span>
        </div>

        {memberships.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">{t('dashboard.noMemberships')}</p>
            <p className="mt-1 text-slate-400">
              {t('dashboard.ensureProfile')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {memberships.map((membership) => {
              const tenant = membership.tenant;
              const isCurrent = tenant?.id === activeTenant?.id;
              const roleTitle = membership.role
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              return (
                <div
                  key={membership.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrent ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shrink-0">
                      {tenant?.name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {tenant?.name || membership.tenant_id}
                        </h3>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('dashboard.selected')}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{t('dashboard.role')}: <strong className="text-slate-700">{roleTitle}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>Slug: <code className="font-mono">{tenant?.slug || 'n/a'}</code></span>
                        <span aria-hidden="true">·</span>
                        <span>{t('dashboard.status')}: <strong className="capitalize text-emerald-600">{membership.status}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => switchTenant(membership.tenant_id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        {t('dashboard.setActive')}
                      </button>
                    )}
                    <Link
                      to="/tenant/dashboard"
                      onClick={() => {
                        if (!isCurrent) switchTenant(membership.tenant_id);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <span>{t('dashboard.openWorkspace')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Architecture Foundations Notice */}
      <div className="p-4 rounded-lg bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800">{t('dashboard.secureBoundary')}:</strong> {t('dashboard.secureBoundaryNotice')}
        </div>
      </div>
    </div>
  );
};
