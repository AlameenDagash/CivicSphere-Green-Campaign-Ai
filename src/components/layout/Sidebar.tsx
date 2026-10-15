import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  LayoutDashboard,
  Building2,
  FileText,
  GraduationCap,
  Gift,
  Users,
  Settings,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const {
    activeTenant,
    roleDisplayName,
    isContentLearningManager,
    isOperationsRewardsManager,
    isPlatformOwner,
    subscription,
    branding,
  } = useTenant();

  const planCode = subscription?.plan?.code;
  const planName = subscription?.plan?.name || (planCode ? planCode.toUpperCase() : 'Standard');

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
      isActive
        ? 'bg-slate-900 text-white font-semibold shadow-xs ring-1 ring-slate-900/20'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/60'
    }`;

  const content = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Active Tenant / Scope Card */}
        {activeTenant ? (
          <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {t('sidebar.activeTenantContext')}
              </span>
              <span className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/70 tabular-nums">
                {planName}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xs ring-1 ring-slate-900/10 shrink-0 font-bold text-xs">
                {activeTenant.name.charAt(0)}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {activeTenant.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {activeTenant.slug}
                </div>
              </div>
            </div>

            {/* Unboxed Role Metadata */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('sidebar.assignedRole')}</span>
              <span className="font-semibold text-slate-800">{roleDisplayName}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3.5 text-xs text-slate-500 shadow-xs">
            <div className="font-semibold text-slate-800">{t('sidebar.personalScope')}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{t('sidebar.selectTenantPrompt')}</div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="space-y-4">
          {/* Platform Dashboard & Personal Profile */}
          {isPlatformOwner || isContentLearningManager || isOperationsRewardsManager ? (
            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('dashboard.platform')}
              </div>
              <nav className="space-y-0.5" aria-label="Platform Navigation">
                <NavLink to="/dashboard" className={navItemClass} onClick={onMobileClose}>
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>{t('nav.dashboard')}</span>
                </NavLink>
                <NavLink to="/profile" className={navItemClass} onClick={onMobileClose}>
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{t('nav.profile')}</span>
                </NavLink>
              </nav>
            </div>
          ) : (
            <div>
              <nav className="space-y-0.5" aria-label="Personal Navigation">
                <NavLink to="/profile" className={navItemClass} onClick={onMobileClose}>
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>{t('nav.profile')}</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Tenant-Specific Workspace */}
          {activeTenant && (
            <>
              <div>
                <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('sidebar.domainNavigation')}
                </div>
                <nav className="space-y-0.5" aria-label="Tenant Navigation">
                  <NavLink to="/tenant/dashboard" className={navItemClass} onClick={onMobileClose}>
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{t('sidebar.overview')}</span>
                  </NavLink>
                </nav>
              </div>

              {/* Module A: Content & Learning Manager Domain */}
              <div>
                <div className="px-3 mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('nav.contentLearning')}
                  </span>
                  {isContentLearningManager && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      {t('state.active')}
                    </span>
                  )}
                </div>
                <nav className="space-y-0.5" aria-label="Content & Learning Navigation">
                  <NavLink to="/tenant/content" className={navItemClass} onClick={onMobileClose}>
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{t('sidebar.projectsMedia')}</span>
                  </NavLink>
                  <NavLink to="/tenant/learning" className={navItemClass} onClick={onMobileClose}>
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>{t('sidebar.academyQuizzes')}</span>
                  </NavLink>
                </nav>
              </div>

              {/* Module B: Operations & Rewards / Civic Rewards */}
              <div>
                <div className="px-3 mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isOperationsRewardsManager || isPlatformOwner ? t('nav.operationsRewards') : t('sidebar.civicRewards')}
                  </span>
                  {isOperationsRewardsManager && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      {t('state.active')}
                    </span>
                  )}
                </div>
                <nav className="space-y-0.5" aria-label="Operations & Rewards Navigation">
                  <NavLink to="/tenant/rewards" className={navItemClass} onClick={onMobileClose}>
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>
                      {isOperationsRewardsManager || isPlatformOwner ? t('nav.operationsRewards') : t('sidebar.civicRewards')}
                    </span>
                  </NavLink>
                  {(isOperationsRewardsManager || isPlatformOwner) && (
                    <NavLink to="/tenant/users" className={navItemClass} onClick={onMobileClose}>
                      <Users className="w-4 h-4 shrink-0" />
                      <span>{t('sidebar.memberDirectory')}</span>
                    </NavLink>
                  )}
                </nav>
              </div>

              {/* Tenant Settings — Restricted strictly to Platform Owner */}
              {isPlatformOwner && (
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('nav.settings')}
                  </div>
                  <nav className="space-y-0.5" aria-label="Tenant Administration">
                    <NavLink to="/tenant/settings" className={navItemClass} onClick={onMobileClose}>
                      <Settings className="w-4 h-4 shrink-0" />
                      <span>{t('sidebar.tenantSettings')}</span>
                    </NavLink>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer / User Info */}
      <div className="pt-3 border-t border-slate-200/80">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 shadow-2xs hover:bg-slate-100/70 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white font-bold text-xs shrink-0 shadow-2xs">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="truncate text-left flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {profile?.full_name || t('nav.civicMember')}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {roleDisplayName || t('sidebar.member')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-sm flex"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col border-r border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">CivicSphere AI</span>
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {content}
            </div>
          </div>
          <div className="flex-1" onClick={onMobileClose} />
        </div>
      )}
    </>
  );
};
