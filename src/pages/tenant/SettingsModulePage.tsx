import React from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useEntitlements } from '../../hooks/useEntitlements';
import { BASELINE_PLAN_FEATURES } from '../../services/subscriptionService';
import {
  Settings,
  Paintbrush,
  MapPin,
  Sparkles,
  Sliders,
  CheckCircle2,
  XCircle,
  Building2,
  Info,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const SettingsModulePage: React.FC = () => {
  const {
    activeTenant,
    branding,
    settings,
    location,
    subscription,
    isLoading,
  } = useTenant();

  const { t } = useLanguage();
  const { activeFeatures, planName, planCode } = useEntitlements();

  if (isLoading || !activeTenant) {
    return <LoadingSpinner message={t('state.loading')} />;
  }

  const allPossibleFeatures = [
    'academy',
    'rewards',
    'ai_assistant',
    'video',
    'quiz_after_video',
    'watch_to_earn',
    'video_rewards',
    'certificates',
    'badges',
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>{t('settings.tenantAdmin')}</span>
          <span aria-hidden="true">·</span>
          <span>{activeTenant.name}</span>
        </div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
          {t('settings.title')}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Tenant Branding */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Paintbrush className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('settings.brandingConfig')}
            </h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.brandingConfigDesc')}
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.orgName')}</span>
              <span className="font-semibold text-slate-800">{activeTenant.name}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.slugIdentifier')}</span>
              <span className="font-mono text-slate-800">{activeTenant.slug}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.logoUrl')}</span>
              <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                {branding?.logo_url || t('common.none')}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.primaryColor')}</span>
              <div className="flex items-center gap-2">
                {branding?.primary_color && (
                  <span
                    className="w-3.5 h-3.5 rounded border border-slate-300"
                    style={{ backgroundColor: branding.primary_color }}
                  />
                )}
                <span className="font-mono text-slate-700">
                  {branding?.primary_color || 'Default Slate (#0F172A)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.typographyFont')}</span>
              <span className="font-medium text-slate-700">
                {branding?.font_family || 'Plus Jakarta Sans'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Regional Hierarchy & Geography */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('settings.geographicJurisdiction')}
            </h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.geographicJurisdictionDesc')}
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.country')}</span>
              <span className="font-semibold text-slate-800">
                {location?.country?.name || 'Nigeria'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.state')}</span>
              <span className="font-semibold text-slate-800">
                {location?.state?.name || 'Federal Capital Territory'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.lga')}</span>
              <span className="font-semibold text-slate-800">
                {location?.lga?.name || 'Municipal Area Council'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.jurisdictionType')}</span>
              <span className="font-semibold text-slate-800">
                {location?.jurisdiction?.name || 'Local Government Authority'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">{t('settings.physicalAddress')}</span>
              <span className="text-slate-700 truncate max-w-[200px]">
                {location?.address_line1 || 'Civic Administrative Complex'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Subscription Plans & Entitlements Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('settings.entitlementsMatrix')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-700 font-mono">
            {planName} ({subscription?.status || t('state.active')})
          </span>
        </div>

        <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            {t('settings.entitlementsMatrixNotice')}
          </p>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">{t('settings.featureCapability')}</th>
                <th className="py-2.5 px-3 text-center">{t('settings.basicTier')}</th>
                <th className="py-2.5 px-3 text-center">{t('settings.professionalTier')}</th>
                <th className="py-2.5 px-3 text-center">{t('settings.enterpriseTier')}</th>
                <th className="py-2.5 px-3 text-center font-bold text-slate-700">{t('settings.activeTenantStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allPossibleFeatures.map((featKey) => {
                const inBasic = BASELINE_PLAN_FEATURES.basic.includes(featKey as any);
                const inPro = BASELINE_PLAN_FEATURES.professional.includes(featKey as any);
                const inEnt = BASELINE_PLAN_FEATURES.enterprise.includes(featKey as any);
                const isActiveForTenant = activeFeatures.includes(featKey);

                return (
                  <tr key={featKey} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 font-mono">
                      {featKey}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {inBasic ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {inPro ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {inEnt ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isActiveForTenant ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('settings.enabled')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('settings.locked')}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
