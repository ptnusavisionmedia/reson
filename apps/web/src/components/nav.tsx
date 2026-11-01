'use client';

import { Compass, House, Sparkles, User, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/home', label: 'Beranda', Icon: House },
  { href: '/communities', label: 'Community', Icon: Users },
  { href: '/match', label: 'Match', Icon: Sparkles },
  { href: '/explore', label: 'Jelajah', Icon: Compass },
  { href: '/profile', label: 'Profil', Icon: User },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar penuh (≥1024px) dan rail ikon (768–1023px). */
export function SideNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 transition-colors ${
              active ? 'border border-accent bg-surface text-fg' : 'border border-transparent text-muted hover:bg-surface hover:text-fg'
            }`}
          >
            <Icon size={20} aria-hidden />
            <span className="hidden lg:inline">{label}</span>
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
