'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Scan,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/digitalization', label: 'Digitalization', icon: Scan },
  { href: '/analytics', label: 'AI Analytics', icon: BarChart3 },
];


const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
  const isDigitizer = role === 'digitizer';

  // For Digitizer, only show Digitalization page
  const visibleNavItems = isDigitizer
    ? navItems.filter((item) => item.href === '/digitalization')
    : navItems;

  const visibleBottomItems = isDigitizer ? [] : bottomItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar-bg border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="fade-in">
                <h1 className="text-sm font-bold text-white leading-tight">The Work Wear</h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  {isDigitizer ? 'DIGITIZER PORTAL' : 'ORDER MANAGEMENT'}
                </p>
              </div>
            )}
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-sidebar-active text-sidebar-text-active shadow-sm'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-slate-200'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pb-4 space-y-1 border-t border-sidebar-border pt-4">
          {visibleBottomItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? 'bg-sidebar-active text-sidebar-text-active'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-slate-200'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* User Info & Logout */}
          {session?.user && (
            <div className={`mt-3 px-3 py-2 rounded-xl bg-sidebar-hover ${collapsed ? 'flex justify-center' : ''}`}>
              {!collapsed && (
                <p className="text-xs text-slate-400 truncate mb-2">
                  {session.user.email}
                </p>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>Logout</span>}
              </button>
            </div>
          )}

          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center py-2 text-sidebar-text hover:text-slate-200 transition-colors mt-1"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Developer Credit Branding */}
          {!collapsed && (
            <div className="pt-2 text-center border-t border-sidebar-border/40">
              <a
                href="https://remotelyavailable.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors tracking-wide inline-flex items-center gap-1"
              >
                <span>Built by</span>
                <span className="font-medium text-slate-400 hover:text-blue-400 underline underline-offset-2">remotelyavailable.com</span>
              </a>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
