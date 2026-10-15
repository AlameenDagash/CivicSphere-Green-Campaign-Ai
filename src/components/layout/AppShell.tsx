import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { FloatingNavigation } from './FloatingNavigation';
import { useTenant } from '../../contexts/TenantContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { branding, activeTenant } = useTenant();

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50/40 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50 font-sans relative selection:bg-emerald-900 selection:text-white">
      {/* Sophisticated civic ambient backdrop lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-emerald-100/25 via-slate-100/15 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Top Bar adhering to Top Bar Contract */}
      <Header onToggleMobileMenu={() => setMobileMenuOpen(true)} />

      {/* Main Workspace Frame */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 pb-24 sm:pb-16 min-w-0">
            {/* Breadcrumb Trail */}
            <Breadcrumbs />

            {/* Dynamic Content */}
            <div className="mt-2 min-w-0">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Navigation Dock */}
      <FloatingNavigation />
    </div>
  );
};
