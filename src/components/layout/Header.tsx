import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { TenantSwitcher } from './TenantSwitcher';
import { LanguageSelector } from '../common/LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { Menu, LogOut, Sparkles } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { activeTenant, isContentLearningManager, isOperationsRewardsManager, isPlatformOwner } = useTenant();
  const { t } = useLanguage();

  // Platform Dashboard is restricted to platform developer/owner and tenant managers
  const canAccessPlatformDashboard = isPlatformOwner || isContentLearningManager || isOperationsRewardsManager;
  const homeDestination = canAccessPlatformDashboard ? '/dashboard' : '/tenant/dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
      active
        ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-2 sm:px-6 backdrop-blur-md shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-hidden shrink-0 min-h-[36px] min-w-[36px]"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link
          to={homeDestination}
          className="group flex items-center gap-1.5 sm:gap-2.5 text-slate-900 hover:text-slate-800 transition-colors min-w-0"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xs ring-1 ring-slate-900/10 shrink-0 group-hover:shadow-sm transition-all">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <span className="text-xs sm:text-base font-bold tracking-tight text-slate-900 truncate">
            <span className="hidden min-[380px]:inline sm:hidden">CivicSphere</span>
            <span className="hidden sm:inline">CivicSphere AI</span>
          </span>
        </Link>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-600">
        {canAccessPlatformDashboard && (
          <Link
            to="/dashboard"
            className={navLinkClass(isActive('/dashboard'))}
          >
            {t('nav.dashboard')}
          </Link>
        )}

        {activeTenant && (
          <>
            <Link
              to="/tenant/dashboard"
              className={navLinkClass(isActive('/tenant/dashboard'))}
            >
              {t('sidebar.overview')}
            </Link>

            {/* Content & Learning Navigation */}
            <Link
              to="/tenant/content"
              className={navLinkClass(isActive('/tenant/content') || isActive('/tenant/learning'))}
              title="Content, Activities, Academy and Quizzes"
            >
              {t('nav.contentLearning')}
            </Link>

            {/* Operations & Rewards Navigation */}
            <Link
              to="/tenant/rewards"
              className={navLinkClass(isActive('/tenant/rewards') || isActive('/tenant/users'))}
              title="Rewards, Points, Members and Fulfillment"
            >
              {t('nav.operationsRewards')}
            </Link>

            {isPlatformOwner && (
              <Link
                to="/tenant/settings"
                className={navLinkClass(isActive('/tenant/settings'))}
              >
                {t('nav.settings')}
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Language Selector (EN | HA) */}
        <LanguageSelector />

        {/* Multi-Tenant Switcher */}
        {user && <TenantSwitcher />}

        {/* Profile & Sign Out */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Link
              to="/profile"
              className="flex items-center justify-center p-1 sm:px-2 sm:py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] sm:min-w-0 shrink-0"
              title={profile?.full_name ? `${t('nav.profile')} (${profile.full_name})` : t('nav.profile')}
              aria-label={t('nav.profile')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[11px] shrink-0 ring-1 ring-slate-900/10">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                {profile?.full_name || t('nav.civicMember')}
              </span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 min-h-[36px] min-w-[36px]"
              title={t('nav.signOut')}
              aria-label={t('nav.signOut')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs whitespace-nowrap"
          >
            {t('nav.signIn')}
          </Link>
        )}
      </div>
    </header>
  );
};
