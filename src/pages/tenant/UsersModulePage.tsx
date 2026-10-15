import React, { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSupabaseClient } from '../../lib/supabase';
import { Users, Shield, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';

interface MemberRecord {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: {
    id?: string;
    full_name: string | null;
    avatar_url: string | null;
    phone?: string | null;
  } | null;
}

export const UsersModulePage: React.FC = () => {
  const { activeTenant, isOperationsRewardsManager, isPlatformOwner, roleDisplayName } = useTenant();
  const { t } = useLanguage();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchMembers = async () => {
    if (!activeTenant) return;
    setIsLoading(true);
    setError(null);

    const client = getSupabaseClient();
    if (!client) {
      setError('Supabase client is not initialized.');
      setIsLoading(false);
      return;
    }

    try {
      // Query memberships for active tenant (enforced by RLS)
      const { data, error: queryErr } = await client
        .from('tenant_memberships')
        .select(`
          id,
          user_id,
          role,
          status,
          created_at,
          profile:profiles (
            id,
            full_name,
            avatar_url,
            phone
          )
        `)
        .eq('tenant_id', activeTenant.id);

      if (queryErr) {
        setError(queryErr.message);
      } else {
        const transformed: MemberRecord[] = (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          role: row.role,
          status: row.status,
          created_at: row.created_at,
          profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
        }));
        setMembers(transformed);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query tenant members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeTenant?.id]);

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = m.profile?.full_name?.toLowerCase() || '';
    const phone = m.profile?.phone?.toLowerCase() || '';
    const role = m.role.toLowerCase();
    const userId = m.user_id.toLowerCase();
    const memId = m.id.toLowerCase();
    return name.includes(q) || phone.includes(q) || role.includes(q) || userId.includes(q) || memId.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>{t('rewards.title')}</span>
            <span aria-hidden="true">·</span>
            <span>{activeTenant?.name}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {t('users.title')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('users.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMembers}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t('users.refreshRoster')}</span>
        </button>
      </div>

      {error && (
        <ErrorAlert
          title={t('error.generic')}
          message={error}
          onRetry={fetchMembers}
        />
      )}

      {/* Main Roster Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredMembers.length} {filteredMembers.length === 1 ? t('users.member') : t('users.members')}
          </div>
        </div>

        {/* Members List */}
        {isLoading ? (
          <LoadingSpinner message={t('state.loading')} />
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">{t('users.noMembers')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMembers.map((member) => {
              const roleLabel = member.role
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs shrink-0 overflow-hidden">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt={member.profile.full_name || t('users.member')}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        member.profile?.full_name?.charAt(0).toUpperCase() || 'M'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {member.profile?.full_name || t('dashboard.civicLeader')}
                        </span>
                        {member.profile?.phone && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {member.profile.phone}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 font-mono break-all sm:break-normal">
                        {t('profile.accountId')}: {member.user_id.slice(0, 8)}... · {t('users.joined')} {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs self-start sm:self-center">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-slate-800">{roleLabel}</div>
                      <div className="text-[11px] text-emerald-600 capitalize flex items-center justify-start sm:justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{member.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
