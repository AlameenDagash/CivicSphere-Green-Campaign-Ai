import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useEntitlements } from '../../hooks/useEntitlements';
import {
  Building2,
  ShieldCheck,
  Sparkles,
  MapPin,
  FileText,
  GraduationCap,
  Gift,
  Users,
  Settings,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderGit2,
  Zap,
  Calendar,
  Megaphone,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchContentDomainSummary } from '../../services/contentService';
import type { ContentDomainSummary } from '../../types/content.types';

export const TenantDashboardPage: React.FC = () => {
  const {
    activeTenant,
    roleDisplayName,
    isContentLearningManager,
    isOperationsRewardsManager,
    isPlatformOwner,
    branding,
    settings,
    location,
    subscription,
    isLoading,
  } = useTenant();

  const { activeFeatures, planName, planCode } = useEntitlements();
  const { t } = useLanguage();
  const [contentSummary, setContentSummary] = useState<ContentDomainSummary | null>(null);

  useEffect(() => {
    if (activeTenant?.id) {
      fetchContentDomainSummary(activeTenant.id).then((summary) => {
        setContentSummary(summary);
      });
    }
  }, [activeTenant?.id]);

  if (isLoading || !activeTenant) {
    return <LoadingSpinner message={t('state.loading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Tenant Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={activeTenant.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-lg sm:text-xl shrink-0">
                {activeTenant.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
                <span>{t('tenant.workspace')}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeTenant.slug}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 break-words">
                {activeTenant.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed break-words">
                {activeTenant.description || 'Public administration and civic engagement workspace.'}
              </p>
            </div>
          </div>

          {isPlatformOwner && (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <Link
                to="/tenant/settings"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t('tenant.settings')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Manager Role & Segregation Status Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {t('tenant.segregation')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-700">
            {roleDisplayName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Box 1: Content & Learning Manager Responsibilities */}
          <div
            className="p-5 rounded-2xl border border-emerald-300/60 shadow-[0_8px_16px_-4px_rgba(16,185,129,0.1)] border-t-2 border-t-white/80 dark:border-t-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight">{t('tenant.contentLearningDomain')}</span>
              {isContentLearningManager && (
                <span className="font-semibold text-white bg-emerald-600 shadow-xs px-2.5 py-0.5 rounded-full text-[10px]">{t('tenant.yourAssignedRole')}</span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90">
              {t('tenant.contentLearningDesc')}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Link
                to="/tenant/content"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              >
                <span>{t('sidebar.projectsMedia')}</span>
                <ArrowRight className="text-white w-3.5 h-3.5" />
              </Link>
              <Link
                to="/tenant/learning"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              >
                <span>{t('sidebar.academyQuizzes')}</span>
                <ArrowRight className="text-white w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Box 2: Operations & Rewards Manager Responsibilities */}
          <div
            className="p-5 rounded-2xl border border-emerald-300/60 shadow-[0_8px_16px_-4px_rgba(16,185,129,0.1)] border-t-2 border-t-white/80 dark:border-t-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight">{t('tenant.operationsRewardsDomain')}</span>
              {isOperationsRewardsManager && (
                <span className="font-semibold text-white bg-emerald-600 shadow-xs px-2.5 py-0.5 rounded-full text-[10px]">{t('tenant.yourAssignedRole')}</span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90">
              {t('tenant.operationsRewardsDesc')}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Link
                to="/tenant/rewards"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              >
                <span>{isOperationsRewardsManager || isPlatformOwner ? t('tenant.rewardsBudget') : t('sidebar.civicRewards')}</span>
                <ArrowRight className="text-white w-3.5 h-3.5" />
              </Link>
              {(isOperationsRewardsManager || isPlatformOwner) && (
                <Link
                  to="/tenant/users"
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
                >
                  <span>{t('tenant.memberDirectory')}</span>
                  <ArrowRight className="text-white w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content & Learning Domain Operations — 8 Functional Sub-Domains */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {t('tenant.contentOperationsHeading')}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t('tenant.contentOperationsDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/tenant/content"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md hover:shadow-lg transition-all duration-200 rounded-lg px-4 py-2 text-xs font-medium"
            >
              <span>{t('tenant.openContentHub')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/tenant/learning"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-950 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-100 border border-emerald-300/60 dark:border-emerald-700/60 shadow-xs hover:shadow-md transition-all duration-200 rounded-lg px-4 py-2 text-xs font-medium"
            >
              <span>{t('tenant.openAcademy')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 8 Sub-Domain Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Projects */}
          <Link
            to="/tenant/content?tab=projects"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.projectsCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.projects')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.projectsDesc')}</p>
            </div>
          </Link>

          {/* 2. Activities */}
          <Link
            to="/tenant/content?tab=activities"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.activitiesCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.activities')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.activitiesDesc')}</p>
            </div>
          </Link>

          {/* 3. Events */}
          <Link
            to="/tenant/content?tab=events"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.eventsCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.events')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.eventsDesc')}</p>
            </div>
          </Link>

          {/* 4. Announcements */}
          <Link
            to="/tenant/content?tab=announcements"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <Megaphone className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.announcementsCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.announcements')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.announcementsDesc')}</p>
            </div>
          </Link>

          {/* 5. Documents */}
          <Link
            to="/tenant/content?tab=documents"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.documentsCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.documents')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.documentsDesc')}</p>
            </div>
          </Link>

          {/* 6. Photos & Media */}
          <Link
            to="/tenant/content?tab=media"
            className="group p-4 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 border-t border-white/90 dark:border-white/10 bg-gradient-to-br from-emerald-100/90 via-emerald-50/70 to-teal-100/60 dark:from-emerald-950/70 dark:via-emerald-900/40 dark:to-teal-950/50 shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),_0_4px_8px_-4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-800 dark:text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),_0_2px_4px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/25 group-hover:text-emerald-950 dark:group-hover:text-white transition-colors">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100 bg-emerald-500/20 dark:bg-emerald-900/60 border border-emerald-400/50 dark:border-emerald-600/50 px-2 py-0.5 rounded-full">
                {contentSummary ? contentSummary.mediaCount : '—'}
              </span>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm tracking-tight group-hover:text-emerald-950 dark:group-hover:text-emerald-200 transition-colors">{t('domain.media')}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] font-normal leading-snug opacity-90 mt-0.5 line-clamp-1">{t('domain.mediaDesc')}</p>
            </div>
          </Link>

          {/* 7. Academy Courses */}
          <Link
            to="/tenant/learning?tab=courses"
            className="group p-4 rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 border-2 border-slate-900/80 dark:border-slate-950 border-t border-emerald-400/30 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-100 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {contentSummary ? contentSummary.coursesCount : '—'}
                </span>
                <div className="bg-emerald-700/60 text-white border border-emerald-400/40 p-1.5 rounded-full inline-flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">{t('domain.courses')}</h3>
              <p className="text-emerald-200/90 text-xs mt-0.5 line-clamp-1">{t('domain.coursesDesc')}</p>
            </div>
          </Link>

          {/* 8. Lessons */}
          <Link
            to="/tenant/learning?tab=lessons"
            className="group p-4 rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 border-2 border-slate-900/80 dark:border-slate-950 border-t border-emerald-400/30 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-100 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  {contentSummary ? contentSummary.lessonsCount : '—'}
                </span>
                <div className="bg-emerald-700/60 text-white border border-emerald-400/40 p-1.5 rounded-full inline-flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">{t('domain.lessons')}</h3>
              <p className="text-emerald-200/90 text-xs mt-0.5 line-clamp-1">{t('domain.lessonsDesc')}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Subscription Entitlements & Geographic Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Entitlements */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                {t('settings.planAndEntitlements')}
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-700 font-mono">
              {planName}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.planAndEntitlementsDesc')}
          </p>

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('settings.activeEntitlements')}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeFeatures.map((feat) => (
                <span
                  key={feat}
                  className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{feat}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Context */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">
                {t('settings.geographicJurisdiction')}
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {t('settings.verifiedGeography')}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t('settings.geographicJurisdictionDesc')}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">{t('settings.country')}</span>
              <span className="font-semibold text-slate-800">
                {location?.country?.name || 'Nigeria'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">{t('settings.state')}</span>
              <span className="font-semibold text-slate-800">
                {location?.state?.name || 'Default State'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">{t('settings.lga')}</span>
              <span className="font-semibold text-slate-800">
                {location?.lga?.name || 'Default LGA'}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase">{t('settings.jurisdictionType')}</span>
              <span className="font-semibold text-slate-800">
                {location?.jurisdiction?.name || 'Local Government'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
