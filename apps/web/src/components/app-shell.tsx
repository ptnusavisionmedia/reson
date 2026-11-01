import { LogOut } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { signOut } from '@/app/actions';

import { BottomNav, SideNav } from './nav';

/** Kerangka halaman masuk: sidebar (desktop), rail (tablet), bottom nav (HP). */
export function AppShell({ username, children }: { username: string | null; children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-line p-3 md:flex">
        <div className="flex flex-col gap-6">
          <Link href="/home" className="px-3 pt-3 font-mono text-sm tracking-widest text-accent">
            <span className="lg:hidden">R</span>
            <span className="hidden lg:inline">RESON</span>
          </Link>
          <SideNav />
        </div>
        <div className="flex flex-col gap-1">
          {username && <p className="hidden truncate px-3 text-sm text-muted lg:block">@{username}</p>}
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Keluar"
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-muted hover:bg-surface hover:text-fg"
            >
              <LogOut size={20} aria-hidden />
              <span className="hidden lg:inline">Keluar</span>
            </button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
