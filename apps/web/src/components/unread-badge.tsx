'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fetchUnreadCount, NOTIFICATIONS_CHANGED } from '@/lib/data/notifications';
import { createClient } from '@/lib/supabase/browser';

/** Jumlah notifikasi belum dibaca. Dimuat ulang tiap pindah halaman dan setelah notifikasi diubah. */
export function useUnreadCount(userId: string) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const n = await fetchUnreadCount(createClient(), userId);
      if (!cancelled && n !== null) setCount(n);
    };
    void load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [userId, pathname]);

  return count;
}

export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-bg">
      {count > 99 ? '99+' : count}
    </span>
  );
}
