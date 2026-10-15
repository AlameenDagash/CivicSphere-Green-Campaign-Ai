import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateUserProfile } from '../services/authService';
import { User, Mail, Shield, Calendar, CheckCircle2, AlertCircle, Save, Building2 } from 'lucide-react';
import { ErrorAlert } from '../components/common/ErrorAlert';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { memberships, activeTenant, roleDisplayName } = useTenant();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const { error } = await updateUserProfile(user.id, {
      full_name: fullName.trim() || null,
      phone_number: phoneNumber.trim() || null,
    });

    setIsSaving(false);

    if (error) {
      setSaveError(error);
    } else {
      setSaveSuccess(true);
      await refreshProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {t('profile.subtitle')}
        </p>
      </div>

      {saveError && (
        <ErrorAlert
          title={t('profile.updateFailed')}
          message={saveError}
          onRetry={() => setSaveError(null)}
        />
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('profile.updateSuccess')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Read-Only Auth Identifiers */}
        <div className="md:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-slate-900 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h2 className="mt-3 text-sm font-bold text-slate-900 truncate max-w-full">
                {fullName || t('dashboard.civicLeader')}
              </h2>
              <span className="text-xs text-slate-500 font-mono truncate max-w-full">
                {user?.email}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[11px]">{t('profile.accountId')}:</span>
                <span className="font-mono text-[11px] text-slate-700 break-all select-all">
                  {user?.id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('profile.accountCreated')}:</span>
                <span className="text-slate-700 font-mono text-[11px]">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : t('state.active')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('profile.primaryOrg')}:</span>
                <span className="text-slate-800 font-medium">
                  {activeTenant ? activeTenant.name : t('dashboard.noMemberships')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">{t('profile.currentRole')}:</span>
                <span className="text-slate-800 font-medium">
                  {roleDisplayName}
                </span>
              </div>
            </div>
          </div>

          {/* Memberships Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-3">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{t('profile.activeMemberships')} ({memberships.length})</span>
            </div>
            <div className="space-y-2 text-xs">
              {memberships.map((m) => (
                <div key={m.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-800">{m.tenant?.name || m.tenant_id}</div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {m.role.replace(/_/g, ' ')} · {m.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Information */}
        <div className="md:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              {t('profile.details')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="profile-fullname" className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('profile.fullName')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="profile-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('profile.fullName')}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('profile.email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
                <span className="block mt-1 text-[11px] text-slate-400">
                  {t('profile.emailVerifiedNotice')}
                </span>
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('profile.phone')}
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? t('action.saving') : t('action.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
