'use client';

import Link from 'next/link';
import { useState } from 'react';

import { markAllNotificationsRead, markNotificationRead } from '@/app/actions';
import {
  fetchNotificationsPage,
  NOTIFICATION_PAGE,
  NOTIFICATIONS_CHANGED,
  notificationTarget,
  notificationText,
  type NotificationItem,
} from '@/lib/data/notifications';
import { createClient } from '@/lib/supabase/browser';
import { timeAgo } from '@utils/time';

const changed = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export function NotificationList({ userId, initial }: { userId: string; initial: NotificationItem[] }) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < NOTIFICATION_PAGE);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const hasUnread = items.some((n) => !n.readAt);

  async function markRead(n: NotificationItem) {
    setError(null);
    if (n.readAt) return;
    // Tandai lebih dulu agar tampilan langsung berubah; kembalikan bila server menolak.
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)));
    const res = await markNotificationRead(n.id);
    if (res.error !== undefined) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: null } : i)));
      return setError(res.error);
    }
    changed();
  }

  async function markAll() {
    setError(null);
    const res = await markAllNotificationsRead();
    if (res.error !== undefined) return setError(res.error);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.readAt ? i : { ...i, readAt: now })));
    changed();
  }

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    setFailed(false);
    const page = await fetchNotificationsPage(createClient(), userId, items.length);
    setLoading(false);
    if (page.error) return setFailed(true);
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
    });
    setDone(page.items.length < NOTIFICATION_PAGE);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line px-6 py-12 text-center">
        <h2 className="text-lg font-semibold">Belum ada notifikasi</h2>
        <p className="mt-2 text-muted">Kamu akan diberi tahu saat ada yang mengikuti, mengomentari, atau membalas komentarmu.</p>
      </div>
    );
  }

  const cardClass = (n: NotificationItem) =>
    `flex w-full flex-col gap-1 rounded-lg bg-surface p-4 text-left transition-colors ${n.readAt ? 'border border-line hover:border-line-strong' : 'border-2 border-accent'}`;

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite" className="flex flex-col gap-2">
        {hasUnread && (
          <div>
            <button type="button" onClick={markAll} className="min-h-11 rounded-md border border-line-strong px-4">
              Tandai semua dibaca
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
        {unavailable && <p className="rounded-md border border-line bg-surface p-3 text-sm">{unavailable}</p>}
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((n) => {
          const target = notificationTarget(n);
          const body = (
            <>
              {!n.readAt && <span className="text-sm font-bold text-accent">Baru</span>}
              <span>{notificationText(n)}</span>
              <span className="text-sm text-muted" suppressHydrationWarning>
                {timeAgo(n.createdAt)}
              </span>
            </>
          );
          return (
            <li key={n.id}>
              {target.kind === 'link' ? (
                <Link href={target.href} onClick={() => void markRead(n)} className={cardClass(n)}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void markRead(n);
                    setUnavailable(target.message);
                  }}
                  className={cardClass(n)}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {failed && (
        <p role="alert" className="text-sm text-accent">
          Gagal memuat notifikasi berikutnya. Coba lagi.
        </p>
      )}
      {done ? (
        <p className="py-4 text-center text-sm text-muted">Sudah sampai akhir.</p>
      ) : (
        <button type="button" onClick={loadMore} disabled={loading} className="min-h-11 rounded-md border border-line-strong px-5 disabled:opacity-60">
          {loading ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
    </div>
  );
}
