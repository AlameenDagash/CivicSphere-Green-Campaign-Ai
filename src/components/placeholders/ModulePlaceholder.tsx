import React from 'react';
import { LucideIcon, Lock, Sparkles, Layers, ShieldCheck, Database } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useEntitlements } from '../../hooks/useEntitlements';
import type { PlanFeatureKey } from '../../types/database.types';

interface ModulePlaceholderProps {
  title: string;
  icon: LucideIcon;
  domain: 'content_learning' | 'operations_rewards';
  stage: string;
  description: string;
  plannedFeatures: string[];
  requiredFeatureKeys?: PlanFeatureKey[];
  relatedTables?: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  icon: Icon,
  domain,
  stage,
  description,
  plannedFeatures,
  requiredFeatureKeys = [],
  relatedTables = [],
}) => {
  const {
    activeTenant,
    roleDisplayName,
    isContentLearningManager,
    isOperationsRewardsManager,
    isPlatformOwner,
  } = useTenant();

  const { hasFeature, planName } = useEntitlements();

  const isResponsibleRole =
    domain === 'content_learning'
      ? (isContentLearningManager || isPlatformOwner)
      : (isOperationsRewardsManager || isPlatformOwner);

  const roleName =
    domain === 'content_learning'
      ? 'Content & Learning Manager'
      : 'Operations & Rewards Manager';

  // Check if tenant's subscription entitles this feature
  const missingEntitlements = requiredFeatureKeys.filter((key) => !hasFeature(key));
  const isEntitled = missingEntitlements.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Main Architecture Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Stage Status Badge and Role Verification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Release Lifecycle
            </span>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{stage} Scope</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Foundation verified. Implementation scheduled for subsequent stage.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Governing Manager Role
            </span>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{roleName}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isResponsibleRole
                ? `Your active role (${roleDisplayName}) is authorized to administer this domain.`
                : `Public/read-only view. Administrative operations restricted to ${roleName}. (Your role: ${roleDisplayName}).`}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Subscription Entitlement
            </span>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{planName}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isEntitled
                ? 'All required feature entitlements active in subscription plan.'
                : `Plan requires features: ${missingEntitlements.join(', ')}.`}
            </p>
          </div>
        </div>

        {/* Planned Functional Specifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Planned Domain Capabilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plannedFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs text-slate-700"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module Integration Ready */}
        {relatedTables.length > 0 && (
          <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Workspace Feature Capabilities</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Integrated operational components for this module:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {relatedTables.map((tbl) => (
                <span
                  key={tbl}
                  className="font-mono text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                >
                  {tbl}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Workspace Feature Notice */}
        <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200/60 text-xs text-blue-900 leading-relaxed">
          <strong>CivicSphere Module Notice:</strong> This section is actively linked to your organization workspace. Interactive management controls and extended features will become available as curriculum items and activities are published.
        </div>
      </div>
    </div>
  );
};
