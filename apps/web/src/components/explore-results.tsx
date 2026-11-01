'use client';

import Link from 'next/link';
import { useState } from 'react';

import { categoryLabel, DEVICE_PAGE, searchDevicePage, searchUserPage, USER_PAGE, type DeviceItem, type UserRow } from '@/lib/data/devices';
import { createClient } from '@/lib/supabase/browser';

export function DeviceCard({ device }: { device: DeviceItem }) {
  return (
    <Link
      href={`/devices/${device.id}`}
      className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
    >
      {device.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={device.imageUrl} alt={`Foto ${device.name}`} width={56} height={56} loading="lazy" className="h-14 w-14 rounded-md object-cover" />
      ) : (
        <span aria-hidden className="h-14 w-14 rounded-md bg-line" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold">{device.name}</span>
        <span className="text-sm text-muted">{device.brand}</span>
        <span className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">{categoryLabel(device.category)}</span>
      </span>
    </Link>
  );
}

export function UserCard({ user }: { user: UserRow }) {
  return (
    <Link href={`/users/${user.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-line">
          {user.displayName.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{user.displayName}</span>
        <span className="block truncate text-sm text-muted">@{user.username}</span>
      </span>
    </Link>
  );
}

function LoadMoreList<T>({
  initial,
  pageSize,
  getKey,
  fetchMore,
  render,
}: {
  initial: T[];
  pageSize: number;
  getKey: (item: T) => string;
  fetchMore: (offset: number) => Promise<{ items: T[]; error: boolean }>;
  render: (item: T) => React.ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    setFailed(false);
    const page = await fetchMore(items.length);
    setLoading(false);
    if (page.error) return setFailed(true);
    setItems((prev) => {
      const seen = new Set(prev.map(getKey));
      return [...prev, ...page.items.filter((i) => !seen.has(getKey(i)))];
    });
    setDone(page.items.length < pageSize);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={getKey(i)}>{render(i)}</li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="text-sm text-accent">
          Gagal memuat hasil berikutnya. Coba lagi.
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

export function DeviceResults({ initial, q, category }: { initial: DeviceItem[]; q: string; category: string | null }) {
  return (
    <LoadMoreList
      initial={initial}
      pageSize={DEVICE_PAGE}
      getKey={(d) => d.id}
      fetchMore={(offset) => searchDevicePage(createClient(), { q, category, offset })}
      render={(d) => <DeviceCard device={d} />}
    />
  );
}

export function UserResults({ initial, q }: { initial: UserRow[]; q: string }) {
  return (
    <LoadMoreList
      initial={initial}
      pageSize={USER_PAGE}
      getKey={(u) => u.id}
      fetchMore={(offset) => searchUserPage(createClient(), q, offset)}
      render={(u) => <UserCard user={u} />}
    />
  );
}
