import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { activeTenant, isPlatformOwner, isContentLearningManager, isOperationsRewardsManager } = useTenant();
  const { t } = useLanguage();

  const canAccessPlatform = isPlatformOwner || isContentLearningManager || isOperationsRewardsManager;
  const homeDestination = canAccessPlatform ? '/dashboard' : '/tenant/dashboard';

  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbLabel = (segment: string): string => {
    switch (segment) {
      case 'dashboard':
        return t('nav.dashboard');
      case 'profile':
        return t('nav.profile');
      case 'tenant':
        return activeTenant ? activeTenant.name : t('tenant.workspace');
      case 'content':
        return t('content.title');
      case 'learning':
        return t('learning.title');
      case 'rewards':
        return t('rewards.title');
      case 'users':
        return t('users.title');
      case 'settings':
        return t('settings.title');
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  if (pathnames.length === 0) return null;

  return (
    <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center text-xs text-slate-500 py-2 sm:py-3 gap-y-1">
      <Link
        to={homeDestination}
        className="hover:text-slate-900 transition-colors font-medium text-slate-600 shrink-0"
      >
        CivicSphere
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = getBreadcrumbLabel(value);

        return (
          <React.Fragment key={to}>
            <span className="mx-1.5 sm:mx-2 text-slate-300" aria-hidden="true">
              /
            </span>
            {isLast ? (
              <span className="text-slate-900 font-semibold truncate max-w-[140px] sm:max-w-[200px]" aria-current="page">
                {label}
              </span>
            ) : (
              <Link to={to} className="hover:text-slate-900 transition-colors truncate max-w-[110px] sm:max-w-[150px]">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
