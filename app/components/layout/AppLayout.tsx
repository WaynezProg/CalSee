'use client';

/**
 * AppLayout Component
 *
 * Main layout wrapper with bottom navigation.
 * Provides consistent structure across all pages.
 */

import BottomNav from '@/app/components/navigation/BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className={hideNav ? '' : 'pb-20'}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
