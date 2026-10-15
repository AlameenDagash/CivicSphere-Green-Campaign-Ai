import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { Building2, ChevronDown, Check } from 'lucide-react';

export const TenantSwitcher: React.FC = () => {
  const {
    memberships,
    activeTenant,
    switchTenant,
    roleDisplayName,
    branding,
  } = useTenant();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (memberships.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Building2 className="w-3.5 h-3.5" />
        <span>No Tenant Context</span>
      </div>
    );
  }

  const handleSelect = async (tenantId: string) => {
    await switchTenant(tenantId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-slate-800 max-w-[95px] xs:max-w-[130px] sm:max-w-[200px] min-h-[36px] shrink-0"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {branding?.logo_url ? (
          <img
            src={branding.logo_url}
            alt=""
            referrerPolicy="no-referrer"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded object-cover shrink-0"
          />
        ) : (
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        )}
        <div className="flex flex-col text-left min-w-0">
          <span className="font-semibold text-slate-900 leading-tight truncate max-w-[55px] xs:max-w-[75px] sm:max-w-[130px]">
            {activeTenant?.name || 'Select Tenant'}
          </span>
          <span className="hidden xs:inline-block text-[10px] text-slate-400 leading-tight truncate max-w-[75px] sm:max-w-[130px]">
            {roleDisplayName}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5 sm:ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50 text-xs"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Active Tenant Memberships ({memberships.length})
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {memberships.map((m) => {
              const tenantName = m.tenant?.name || m.tenant_id;
              const isSelected = m.tenant_id === activeTenant?.id;
              const roleLabel = m.role
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m.tenant_id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-slate-50/80 font-semibold' : ''
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="text-slate-900 truncate">{tenantName}</div>
                    <div className="text-[10px] text-slate-400">{roleLabel}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
