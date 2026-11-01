'use client';

import { Bell, Compass, House, Sparkles, User, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge, useUnreadCount } from './unread-badge';

const ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/home', label: 'Beranda', Icon: House },
  { href: '/communities', label: 'Community', Icon: Users },
  { href: '/match', label: 'Match', Icon: Sparkles },
  { href: '/explore', label: 'Jelajah', Icon: Compass },
  { href: '/profile', label: 'Profil', Icon: User },
];

function useActive() {
  const pathname = usePathname();
  // /profile membuka /users/{id}; tab Profil ikut aktif di halaman profil mana pun.
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === '/profile' && pathname.startsWith('/users/'));
}

/** Sidebar penuh (≥1024px) dan rail ikon (768–1023px). */
export function SideNav({ userId }: { userId: string }) {
  const isActive = useActive();
  const unread = useUnreadCount(userId);
  const items = [...ITEMS, { href: '/notifications', label: 'Notifikasi', Icon: Bell }];
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {items.map(({ href, label, Icon }) => {
        const active = isActive(href);
        const isBell = href === '/notifications';
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={isBell && unread > 0 ? `${label}, ${unread} belum dibaca` : label}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 transition-colors ${
              active ? 'border border-accent bg-surface text-fg' : 'border border-transparent text-muted hover:bg-surface hover:text-fg'
            }`}
          >
            <Icon size={20} aria-hidden />
            <span className="hidden lg:inline">{label}</span>
            {isBell && <span className="hidden lg:contents"><Badge count={unread} /></span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom navigation di layar < 768px. */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-surface md:hidden">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? 'text-accent' : 'text-muted'}`}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Lonceng di bilah atas (HP): bottom nav sudah penuh dengan lima tab. */
export function MobileBell({ userId }: { userId: string }) {
  const unread = useUnreadCount(userId);
  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
      className="relative flex h-11 w-11 items-center justify-center rounded-md text-fg"
    >
      <Bell size={22} aria-hidden />
      {unread > 0 && (
        <span aria-hidden className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-bg">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
