'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/leads', label: 'Leads', icon: '◎' },
  { href: '/kunden', label: 'Kunden', icon: '◈' },
  { href: '/projekte', label: 'Projekte', icon: '📋' },
  { href: '/todos', label: 'Todos', icon: '☐' },
  { href: '/provisionen', label: 'Provisionen', icon: '◆' },
  { href: '/info-center', label: 'Info Center', icon: '◫' },
];

const adminItems = [
  { href: '/admin/services', label: 'Services', icon: '⚙' },
  { href: '/admin/promotions', label: 'Aktionen', icon: '✦' },
  { href: '/admin/users', label: 'Benutzer', icon: '◇' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Auto-close sidebar on navigation
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'bg-bd-card border-r border-bd-border flex flex-col h-screen',
          // Desktop: static sidebar
          'hidden md:flex md:w-60 md:sticky md:top-0',
          // Mobile: overlay drawer
          isOpen && '!flex fixed inset-y-0 left-0 z-50 w-72 shadow-2xl'
        )}
      >
        {/* Mobile close button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-bd-border">
          <div>
            <h1 className="font-heading text-lg font-bold text-bd-accent">Brady Digital</h1>
            <p className="text-[10px] text-bd-text-muted">SalesTool</p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-bd-card-hover text-bd-text-muted hover:text-bd-text text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden md:block p-5 border-b border-bd-border">
          <h1 className="font-heading text-xl font-bold text-bd-accent">Brady Digital</h1>
          <p className="text-xs text-bd-text-muted mt-0.5">SalesTool</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-bd-accent-dim text-bd-accent border border-bd-border-accent'
                  : 'text-bd-text-body hover:bg-bd-card-hover hover:text-bd-text'
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] uppercase tracking-wider text-bd-text-muted font-semibold">Admin</span>
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-bd-accent-dim text-bd-accent border border-bd-border-accent'
                      : 'text-bd-text-body hover:bg-bd-card-hover hover:text-bd-text'
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-bd-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-bd-accent/20 text-bd-accent flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[11px] text-bd-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-bd-text-muted hover:text-red-400 transition-colors py-2"
          >
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
