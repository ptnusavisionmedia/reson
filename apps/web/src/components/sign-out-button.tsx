'use client';

import { LogOut } from 'lucide-react';

import { signOut } from '@/app/actions';
import { clearAllDrafts } from '@/lib/composer/draft';

/** Keluar: draf lokal dibersihkan dulu agar tidak bocor ke akun berikutnya di browser yang sama. */
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => clearAllDrafts()}>
      <button
        type="submit"
        aria-label="Keluar"
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-muted hover:bg-surface hover:text-fg"
      >
        <LogOut size={20} aria-hidden />
        <span className="hidden lg:inline">Keluar</span>
      </button>
    </form>
  );
}
