'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import NotificationBell from '@/components/ui/NotificationBell';
import { useEffect, useState } from 'react';
import { Menu, Shield } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
  const isDigitizer = role === 'digitizer';

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.push('/login');
    } else if (
      status === 'authenticated' &&
      isDigitizer &&
      (pathname === '/' || pathname === '/orders' || pathname.startsWith('/settings'))
    ) {
      router.push('/digitalization');
    }
  }, [status, isLoginPage, isDigitizer, pathname, router]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Login page — no sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not authenticated
  if (!session) {
    return null;
  }

  // Authenticated — show sidebar + content with top header bar
  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col min-w-0 transition-all duration-300">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {isDigitizer ? 'Digitizer Portal' : 'Order System'}
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Notification Bell — Admin only */}
            {!isDigitizer && <NotificationBell />}

            {!isDigitizer && <div className="h-6 w-px bg-slate-200" />}

            {/* User Profile Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {session.user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {session.user?.email}
                </p>
                <p className="text-[10px] font-medium text-slate-400 capitalize">
                  {isDigitizer ? 'Digitizer' : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
