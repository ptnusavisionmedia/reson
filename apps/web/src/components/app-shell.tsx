import { Settings } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BottomNav, MobileBell, SideNav } from './nav';
import { SignOutButton } from './sign-out-button';

/** Kerangka halaman masuk: sidebar (desktop), rail (tablet), bilah atas dan bottom nav (HP). */
export function AppShell({ userId, username, children }: { userId: string; username: string | null; children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-line p-3 md:flex">
        <div className="flex flex-col gap-6">
          <Link href="/home" className="px-3 pt-3 font-mono text-sm tracking-widest text-accent">
            <span className="lg:hidden">R</span>
            <span className="hidden lg:inline">RESON</span>
          </Link>
          <SideNav userId={userId} />
        </div>
        <div className="flex flex-col gap-1">
          {username && <p className="hidden truncate px-3 text-sm text-muted lg:block">@{username}</p>}
          <Link href="/settings" aria-label="Pengaturan" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-muted hover:bg-surface hover:text-fg">
            <Settings size={20} aria-hidden />
            <span className="hidden lg:inline">Pengaturan</span>
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line px-4 py-1 md:hidden">
          <Link href="/home" className="font-mono text-sm tracking-widest text-accent">
            RESON
          </Link>
          <div className="flex items-center">
            <Link href="/settings" aria-label="Pengaturan" className="flex h-11 w-11 items-center justify-center rounded-md text-fg">
              <Settings size={22} aria-hidden />
            </Link>
            <MobileBell userId={userId} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
