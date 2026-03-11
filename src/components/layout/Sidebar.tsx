'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/leads', label: 'Leads', icon: '◎' },
  { href: '/kunden', label: 'Kunden', icon: '◈' },
  { href: '/provisionen', label: 'Provisionen', icon: '◆' },
  { href: '/dokumente', label: 'Dokumente', icon: '◫' },
];

const adminItems = [
  { href: '/admin/services', label: 'Services', icon: '⚙' },
  { href: '/admin/users', label: 'Benutzer', icon: '◇' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 bg-bd-card border-r border-bd-border flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-bd-border">
        <h1 className="font-heading text-xl font-bold text-bd-accent">Brady Digital</h1>
        <p className="text-xs text-bd-text-muted mt-0.5">SalesTool</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
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
          className="w-full text-xs text-bd-text-muted hover:text-red-400 transition-colors py-1.5"
        >
          Abmelden
        </button>
      </div>
    </aside>
  );
}
