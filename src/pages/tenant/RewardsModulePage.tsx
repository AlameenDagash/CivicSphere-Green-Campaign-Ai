import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Gift,
  Sparkles,
  ShieldCheck,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Package,
  Layers,
  PieChart,
  Bell,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { EmptyState } from '../../components/common/EmptyState';
import { RedemptionModal } from '../../components/rewards/RedemptionModal';
import { RewardEditorModal } from '../../components/rewards/RewardEditorModal';
import { RequestStatusModal } from '../../components/rewards/RequestStatusModal';
import { FulfillmentLogsModal } from '../../components/rewards/FulfillmentLogsModal';
import {
  fetchTenantRewards,
  createTenantReward,
  updateTenantReward,
  fetchUserPointsBalance,
  fetchPointsLedger,
  redeemReward,
  fetchRewardRequests,
  updateRewardRequestStatus,
  fetchRewardBudgets,
  fetchCivicNotifications,
  markNotificationAsRead,
} from '../../services/rewardsService';
import type {
  Reward,
  RewardBudget,
  RewardRequest,
  PointsLedgerEntry,
  CivicNotification,
  RewardRequestStatus,
} from '../../types/database.types';

export const RewardsModulePage: React.FC = () => {
  const { user } = useAuth();
  const {
    activeTenant,
    isOperationsRewardsManager,
    isPlatformOwner,
    hasEntitlement,
  } = useTenant();
  const { t } = useLanguage();

  // Primary active tab
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'my_claims' | 'ledger' | 'manager_queue' | 'manager_catalog' | 'budgets' | 'notifications'
  >('catalog');

  // Data states
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0);
  const [myRequests, setMyRequests] = useState<RewardRequest[]>([]);
  const [managerRequests, setManagerRequests] = useState<RewardRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PointsLedgerEntry[]>([]);
  const [budgets, setBudgets] = useState<RewardBudget[]>([]);
  const [notifications, setNotifications] = useState<CivicNotification[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [selectedRewardForRedemption, setSelectedRewardForRedemption] = useState<Reward | null>(null);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);

  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [isRewardEditorOpen, setIsRewardEditorOpen] = useState(false);

  const [statusModalRequest, setStatusModalRequest] = useState<RewardRequest | null>(null);
  const [statusModalTarget, setStatusModalTarget] = useState<RewardRequestStatus | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [auditLogRequestId, setAuditLogRequestId] = useState<string | null>(null);
  const [auditLogRewardTitle, setAuditLogRewardTitle] = useState<string>('');
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  const tenantId = activeTenant?.id;
  const userId = user?.id;
  const isManager = isOperationsRewardsManager || isPlatformOwner;

  // Subscription entitlement check
  const isRewardsEntitled = hasEntitlement('rewards');

  // --------------------------------------------------------------------------
  // Data Loading Routine
  // --------------------------------------------------------------------------
  const loadModuleData = useCallback(async () => {
    if (!tenantId) return;

    setError(null);
    try {
      // 1. Load catalog & points balance in parallel
      const promises: Promise<unknown>[] = [
        fetchTenantRewards(tenantId).then(({ rewards: r, error: rErr }) => {
          if (rErr) throw new Error(rErr);
          setRewards(r);
        }),
      ];

      if (userId) {
        promises.push(
          fetchUserPointsBalance(tenantId, userId).then((bal) => {
            if (bal.error) console.warn('Could not derive points balance:', bal.error);
            setUserBalance(bal.availablePoints);
            setTotalEarned(bal.totalEarned);
            setTotalRedeemed(bal.totalRedeemed);
          }),
          fetchRewardRequests(tenantId, userId).then(({ requests, error: reqErr }) => {
            if (reqErr) console.warn('Could not fetch user claims:', reqErr);
            setMyRequests(requests);
          }),
          fetchPointsLedger(tenantId, userId).then(({ entries, error: ledErr }) => {
            if (ledErr) console.warn('Could not fetch user ledger:', ledErr);
            setLedgerEntries(entries);
          }),
          fetchCivicNotifications(tenantId).then(({ notifications: notifs, error: notifErr }) => {
            if (notifErr) console.warn('Could not fetch notifications:', notifErr);
            setNotifications(notifs);
          })
        );
      }

      // If user is manager, also load manager queue & budgets
      if (isManager) {
        promises.push(
          fetchRewardRequests(tenantId).then(({ requests, error: mReqErr }) => {
            if (mReqErr) console.warn('Could not fetch manager claims queue:', mReqErr);
            setManagerRequests(requests);
          }),
          fetchRewardBudgets(tenantId).then(({ budgets: b, error: bErr }) => {
            if (bErr) console.warn('Could not fetch budgets:', bErr);
            setBudgets(b);
          })
        );
      }

      await Promise.all(promises);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, userId, isManager]);

  useEffect(() => {
    setIsLoading(true);
    loadModuleData();
  }, [loadModuleData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadModuleData();
  };

  // --------------------------------------------------------------------------
  // Redemption Flow Handler (Atomic RPC)
  // --------------------------------------------------------------------------
  const handleRedeemConfirm = async (
    rewardId: string,
    deliveryInstructions: string,
    idempotencyKey: string
  ): Promise<boolean> => {
    if (!tenantId) return false;

    const { requestId, error: redeemErr } = await redeemReward({
      tenantId,
      rewardId,
      idempotencyKey,
      deliveryInstructions,
    });

    if (redeemErr) {
      throw new Error(redeemErr);
    }

    if (requestId) {
      // Re-hydrate derived balance, requests, and inventory immediately
      await loadModuleData();
      return true;
    }
    return false;
  };

  // --------------------------------------------------------------------------
  // Manager CRUD Handlers
  // --------------------------------------------------------------------------
  const handleSaveReward = async (rewardData: {
    title: string;
    description?: string;
    points_cost: number;
    category?: string;
    image_url?: string;
    inventory_count?: number | null;
    is_active?: boolean;
  }): Promise<boolean> => {
    if (!tenantId) return false;

    if (editingReward) {
      const { error: updErr } = await updateTenantReward(tenantId, editingReward.id, rewardData);
      if (updErr) throw new Error(updErr);
    } else {
      const { error: crtErr } = await createTenantReward(tenantId, {
        ...rewardData,
        created_by: userId,
      });
      if (crtErr) throw new Error(crtErr);
    }

    await loadModuleData();
    return true;
  };

  const handleToggleRewardActive = async (reward: Reward) => {
    if (!tenantId || !isManager) return;
    try {
      const { error: togErr } = await updateTenantReward(tenantId, reward.id, {
        is_active: !reward.is_active,
      });
      if (togErr) {
        setError(togErr);
      } else {
        await loadModuleData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // --------------------------------------------------------------------------
  // Manager Status RPC Handler
  // --------------------------------------------------------------------------
  const handleConfirmStatusChange = async (params: {
    requestId: string;
    newStatus: RewardRequestStatus;
    notes?: string;
    trackingRef?: string;
    rejectionReason?: string;
  }): Promise<boolean> => {
    if (!tenantId) return false;

    const { success, error: stErr } = await updateRewardRequestStatus({
      tenantId,
      requestId: params.requestId,
      newStatus: params.newStatus,
      notes: params.notes,
      trackingRef: params.trackingRef,
      rejectionReason: params.rejectionReason,
    });

    if (stErr) throw new Error(stErr);

    if (success) {
      await loadModuleData();
      return true;
    }
    return false;
  };

  // --------------------------------------------------------------------------
  // Notification Toggle Handler
  // --------------------------------------------------------------------------
  const handleMarkNotificationRead = async (notifId: string) => {
    const { success, error: notifErr } = await markNotificationAsRead(notifId);
    if (!notifErr && success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    }
  };

  // --------------------------------------------------------------------------
  // Filtered Rewards for Catalog
  // --------------------------------------------------------------------------
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [rewards, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rewards.forEach((r) => set.add(r.category));
    return ['all', ...Array.from(set)];
  }, [rewards]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // --------------------------------------------------------------------------
  // Helper for Status Badges
  // --------------------------------------------------------------------------
  const renderStatusBadge = (status: RewardRequestStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <Truck className="w-3 h-3" /> Processing
          </span>
        );
      case 'fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Fulfilled
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return <span className="capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Live Points Balance Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
              {t('rewards.title')}
            </h1>
            {isManager && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Operations Manager
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 break-words">
            {t('rewards.subtitle')}
          </p>
        </div>

        {/* Action button cluster */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh Ledger and Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('action.refresh')}</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => {
                setEditingReward(null);
                setIsRewardEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('rewards.createReward')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Subscription Entitlement Notice (if plan does not include rewards) */}
      {!isRewardsEntitled && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <span className="font-bold">Subscription Notice:</span> The current tenant subscription tier does not include the full <code className="font-mono font-semibold">rewards</code> feature key. Catalog browsing remains active in preview mode.
          </div>
        </div>
      )}

      {/* 2. Key Metrics Bar (Derived Points Balance & Activity) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Available Points */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>{t('rewards.availablePoints')}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 font-mono">
              {userBalance.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">Pts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {t('rewards.derivedNotice')}
          </div>
        </div>

        {/* Total Earned */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>{t('rewards.totalEarned')}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {totalEarned.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">Pts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {t('rewards.earnedVia')}
          </div>
        </div>

        {/* Total Redeemed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>{t('rewards.totalRedeemed')}</span>
            <Gift className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {totalRedeemed.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase">Pts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {myRequests.length} {t('rewards.totalClaimsDesc')}
          </div>
        </div>
      </div>

      {/* 3. Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-px text-xs font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>{t('rewards.tabCatalog')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_claims')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'my_claims'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t('rewards.tabMyClaims')}</span>
          {myRequests.length > 0 && (
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {myRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('rewards.tabLedger')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{t('rewards.tabNotifications')}</span>
          {unreadNotificationCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        {/* Manager-Only Tabs */}
        {isManager && (
          <>
            <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />
            <button
              type="button"
              onClick={() => setActiveTab('manager_queue')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'manager_queue'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('rewards.tabClaimsQueue')}</span>
              {managerRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 text-[10px]">
                  {managerRequests.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manager_catalog')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'manager_catalog'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-slate-700" />
              <span>{t('rewards.tabManageCatalog')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('budgets')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'budgets'
                  ? 'border-slate-900 text-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-slate-700" />
              <span>{t('rewards.tabBudgets')}</span>
            </button>
          </>
        )}
      </div>

      {/* Global Error Banner */}
      {error && <ErrorAlert message={error} onRetry={() => loadModuleData()} />}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" message={t('state.loading')} />
        </div>
      ) : (
        <>
          {/* ================================================================ */}
          {/* TAB 1: REWARDS CATALOG */}
          {/* ================================================================ */}
          {activeTab === 'catalog' && (
            <div className="space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('rewards.searchPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'all' ? t('action.allCategories') : cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rewards Grid */}
              {filteredRewards.length === 0 ? (
                <EmptyState
                  title={t('rewards.emptyCatalog')}
                  description={
                    searchQuery || selectedCategory !== 'all'
                      ? t('empty.noResults')
                      : t('rewards.emptyCatalog')
                  }
                  actionLabel={isManager ? t('rewards.createReward') : undefined}
                  onAction={
                    isManager
                      ? () => {
                          setEditingReward(null);
                          setIsRewardEditorOpen(true);
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRewards.map((reward) => {
                    const canAfford = userBalance >= reward.points_cost;
                    const isOutOfStock =
                      reward.inventory_count !== null && reward.inventory_count <= 0;

                    return (
                      <div
                        key={reward.id}
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all"
                      >
                        <div>
                          {/* Image or Category Placeholder */}
                          <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-100 flex items-center justify-center">
                            {reward.image_url ? (
                              <img
                                src={reward.image_url}
                                alt={reward.title}
                                className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                <Gift className="w-8 h-8 text-amber-500/80" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                  {reward.category.replace('_', ' ')}
                                </span>
                              </div>
                            )}

                            {/* Category badge */}
                            <span className="absolute top-2.5 left-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs backdrop-blur-xs">
                              {reward.category.replace('_', ' ')}
                            </span>

                            {/* Stock badge */}
                            <span
                              className={`absolute top-2.5 right-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs ${
                                isOutOfStock
                                  ? 'bg-red-500/90 text-white'
                                  : reward.inventory_count === null
                                  ? 'bg-slate-900/80 text-white'
                                  : 'bg-white/90 text-slate-700'
                              }`}
                            >
                              {reward.inventory_count === null
                                ? t('rewards.unlimited')
                                : `${reward.inventory_count} ${t('rewards.inStock')}`}
                            </span>
                          </div>

                          {/* Title & Cost */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                              {reward.title}
                            </h3>
                            <div className="flex items-center gap-1 text-sm font-extrabold text-amber-600 font-mono shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{reward.points_cost.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Description */}
                          {reward.description && (
                            <p className="mt-2 text-xs text-slate-500 line-clamp-3">
                              {reward.description}
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Redeem Action */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-400">
                            {canAfford ? t('rewards.pointsAvailable') : t('rewards.insufficientPoints')}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRewardForRedemption(reward);
                              setIsRedemptionModalOpen(true);
                            }}
                            disabled={!canAfford || isOutOfStock}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                              canAfford && !isOutOfStock
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isOutOfStock ? t('rewards.outOfStock') : canAfford ? t('rewards.redeem') : t('rewards.insufficientPoints')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: USER REDEMPTION CLAIMS */}
          {/* ================================================================ */}
          {activeTab === 'my_claims' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{t('rewards.redemptionHistory')}</h2>
                  <p className="text-xs text-slate-500">
                    {t('rewards.redemptionHistoryDesc')}
                  </p>
                </div>
              </div>

              {myRequests.length === 0 ? (
                <EmptyState
                  title={t('rewards.emptyClaims')}
                  description={t('rewards.emptyClaims')}
                  actionLabel={t('rewards.tabCatalog')}
                  onAction={() => setActiveTab('catalog')}
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">{t('rewards.tableReward')}</th>
                          <th className="px-4 py-3">{t('rewards.tablePointsSpent')}</th>
                          <th className="px-4 py-3">{t('rewards.tableStatus')}</th>
                          <th className="px-4 py-3">{t('rewards.tableDeliveryNotes')}</th>
                          <th className="px-4 py-3">{t('rewards.tableClaimedDate')}</th>
                          <th className="px-4 py-3 text-right">{t('rewards.tableAuditTrail')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {req.reward?.title || req.reward_id}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-amber-600">
                              {req.points_spent} pts
                            </td>
                            <td className="px-4 py-3">{renderStatusBadge(req.status)}</td>
                            <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                              {req.rejection_reason ? (
                                <span className="text-red-600 font-medium">
                                  Reason: {req.rejection_reason}
                                </span>
                              ) : (
                                req.delivery_instructions || <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setAuditLogRequestId(req.id);
                                  setAuditLogRewardTitle(req.reward?.title || 'Civic Reward Claim');
                                  setIsAuditLogsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                              >
                                <History className="w-3 h-3" />
                                <span>History</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: IMMUTABLE POINTS LEDGER */}
          {/* ================================================================ */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('rewards.pointsLedgerHeading')}</h2>
                <p className="text-xs text-slate-500">
                  {t('rewards.pointsLedgerDesc')}
                </p>
              </div>

              {ledgerEntries.length === 0 ? (
                <EmptyState
                  title={t('rewards.emptyLedger')}
                  description={t('rewards.emptyLedger')}
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">{t('rewards.tableDescription')}</th>
                          <th className="px-4 py-3">{t('rewards.tableEntryType')}</th>
                          <th className="px-4 py-3">{t('rewards.tableAmount')}</th>
                          <th className="px-4 py-3">{t('rewards.tableIdempotency')}</th>
                          <th className="px-4 py-3">{t('rewards.tableTimestamp')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerEntries.map((entry) => {
                          const isCredit = entry.amount > 0;
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {entry.description}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 font-mono">
                                  {entry.entry_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold">
                                <span
                                  className={isCredit ? 'text-emerald-600' : 'text-red-600'}
                                >
                                  {isCredit ? `+${entry.amount}` : entry.amount} pts
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                                {entry.idempotency_key || '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                {new Date(entry.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: NOTIFICATIONS */}
          {/* ================================================================ */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('rewards.notificationsHeading')}</h2>
                <p className="text-xs text-slate-500">
                  {t('rewards.notificationsDesc')}
                </p>
              </div>

              {notifications.length === 0 ? (
                <EmptyState
                  title={t('empty.noAnnouncements')}
                  description={t('rewards.notificationsDesc')}
                />
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                        notif.is_read
                          ? 'border-slate-200 bg-white/70 text-slate-600'
                          : 'border-amber-200 bg-amber-50/50 shadow-2xs text-slate-900'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {notif.type}
                          </span>
                          {!notif.is_read && (
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                          )}
                          <span className="text-xs font-bold truncate">{notif.title}</span>
                        </div>
                        <p className="text-xs text-slate-600">{notif.message}</p>
                        <div className="text-[10px] font-mono text-slate-400">
                          {new Date(notif.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {notif.action_url && (
                          <a
                            href={notif.action_url}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(notif.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            {t('action.markRead')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5 (MANAGER): CLAIMS REVIEW QUEUE */}
          {/* ================================================================ */}
          {activeTab === 'manager_queue' && isManager && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {t('rewards.claimsQueueHeading')}
                </h2>
                <p className="text-xs text-slate-500">
                  {t('rewards.claimsQueueDesc')}
                </p>
              </div>

              {managerRequests.length === 0 ? (
                <EmptyState
                  title={t('rewards.emptyQueue')}
                  description={t('rewards.emptyQueue')}
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">{t('rewards.tableReward')}</th>
                          <th className="px-4 py-3">{t('rewards.tablePoints')}</th>
                          <th className="px-4 py-3">{t('rewards.tableMember')}</th>
                          <th className="px-4 py-3">{t('rewards.tableStatus')}</th>
                          <th className="px-4 py-3">{t('rewards.tableDeliveryNotes')}</th>
                          <th className="px-4 py-3">{t('rewards.tableSubmitted')}</th>
                          <th className="px-4 py-3 text-right">{t('rewards.tableActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {managerRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {req.reward?.title || req.reward_id}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-amber-600">
                              {req.points_spent} pts
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                              {req.user_id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3">{renderStatusBadge(req.status)}</td>
                            <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                              {req.delivery_instructions || <span className="text-slate-400 italic">{t('common.none')}</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {new Date(req.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* State Machine Permitted Actions */}
                                {req.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStatusModalRequest(req);
                                        setStatusModalTarget('approved');
                                        setIsStatusModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 text-[11px]"
                                    >
                                      {t('action.approve')}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStatusModalRequest(req);
                                        setStatusModalTarget('rejected');
                                        setIsStatusModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-red-50 text-red-700 font-semibold hover:bg-red-100 text-[11px]"
                                    >
                                      {t('action.reject')}
                                    </button>
                                  </>
                                )}

                                {req.status === 'approved' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStatusModalRequest(req);
                                        setStatusModalTarget('processing');
                                        setIsStatusModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 text-[11px]"
                                    >
                                      {t('action.dispatch')}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStatusModalRequest(req);
                                        setStatusModalTarget('cancelled');
                                        setIsStatusModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 text-[11px]"
                                    >
                                      {t('action.cancel')}
                                    </button>
                                  </>
                                )}

                                {req.status === 'processing' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStatusModalRequest(req);
                                      setStatusModalTarget('fulfilled');
                                      setIsStatusModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 text-[11px]"
                                  >
                                    {t('action.fulfill')}
                                  </button>
                                )}

                                {/* Audit Log Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuditLogRequestId(req.id);
                                    setAuditLogRewardTitle(req.reward?.title || 'Claim Request');
                                    setIsAuditLogsModalOpen(true);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                  title="View Fulfillment Logs"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6 (MANAGER): REWARDS CATALOG CRUD */}
          {/* ================================================================ */}
          {activeTab === 'manager_catalog' && isManager && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{t('rewards.manageItemsHeading')}</h2>
                  <p className="text-xs text-slate-500">
                    {t('rewards.manageItemsDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReward(null);
                    setIsRewardEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('rewards.addReward')}</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">{t('rewards.tableTitleCategory')}</th>
                        <th className="px-4 py-3">{t('rewards.tableCost')}</th>
                        <th className="px-4 py-3">{t('rewards.tableInventory')}</th>
                        <th className="px-4 py-3">{t('rewards.tableStatus')}</th>
                        <th className="px-4 py-3 text-right">{t('rewards.tableActions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rewards.map((reward) => (
                        <tr key={reward.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{reward.title}</div>
                            <div className="text-[11px] text-slate-400 capitalize">
                              {reward.category.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-amber-600">
                            {reward.points_cost} pts
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {reward.inventory_count === null ? (
                              <span className="text-slate-400 font-sans">{t('rewards.unlimited')}</span>
                            ) : (
                              `${reward.inventory_count} units`
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleRewardActive(reward)}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                reward.is_active
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {reward.is_active ? t('state.active') : t('state.hidden')}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReward(reward);
                                setIsRewardEditorOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              {t('action.edit')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 7 (MANAGER): BUDGET GOVERNANCE */}
          {/* ================================================================ */}
          {activeTab === 'budgets' && isManager && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('rewards.budgetsHeading')}</h2>
                <p className="text-xs text-slate-500">
                  {t('rewards.budgetsDesc')}
                </p>
              </div>

              {budgets.length === 0 ? (
                <EmptyState
                  title={t('rewards.budgetsHeading')}
                  description={t('rewards.budgetsDesc')}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {budgets.map((b) => {
                    const percentage =
                      b.total_points_budget > 0
                        ? Math.min(100, Math.round((b.allocated_points / b.total_points_budget) * 100))
                        : 0;

                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            Period: {b.fiscal_period}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.is_closed
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {b.is_closed ? 'Closed' : 'Active Period'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Allocated: {b.allocated_points.toLocaleString()} pts</span>
                            <span>Cap: {b.total_points_budget.toLocaleString()} pts</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Total allocated points cannot exceed the configured budget limit.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* DIALOG MODALS */}
      {/* ================================================================== */}
      {/* 1. Redemption Modal */}
      <RedemptionModal
        reward={selectedRewardForRedemption}
        isOpen={isRedemptionModalOpen}
        onClose={() => {
          setIsRedemptionModalOpen(false);
          setSelectedRewardForRedemption(null);
        }}
        availablePoints={userBalance}
        onRedeem={handleRedeemConfirm}
      />

      {/* 2. Manager Reward Editor Modal */}
      <RewardEditorModal
        reward={editingReward}
        isOpen={isRewardEditorOpen}
        onClose={() => {
          setIsRewardEditorOpen(false);
          setEditingReward(null);
        }}
        onSave={handleSaveReward}
      />

      {/* 3. Manager Status Transition Modal */}
      <RequestStatusModal
        request={statusModalRequest}
        targetStatus={statusModalTarget}
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setStatusModalRequest(null);
          setStatusModalTarget(null);
        }}
        onConfirm={handleConfirmStatusChange}
      />

      {/* 4. Fulfillment Audit Log Modal */}
      {auditLogRequestId && (
        <FulfillmentLogsModal
          tenantId={tenantId!}
          requestId={auditLogRequestId}
          rewardTitle={auditLogRewardTitle}
          isOpen={isAuditLogsModalOpen}
          onClose={() => {
            setIsAuditLogsModalOpen(false);
            setAuditLogRequestId(null);
          }}
        />
      )}
    </div>
  );
};
