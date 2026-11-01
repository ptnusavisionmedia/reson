import Link from 'next/link';
import { z } from 'zod';

import { EmptyState } from '@/components/empty-state';
import { PostFeed } from '@/components/post-feed';
import { categoryLabel, fetchDevice } from '@/lib/data/devices';
import { fetchFeedPage } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';

export default async function DevicePage({ params, searchParams }: { params: Promise<{ deviceId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { deviceId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === 'showcase' ? 'showcase' : 'review';

  const missing = <EmptyState title="Perangkat tidak ditemukan" href="/explore" actionLabel="Kembali ke Jelajah" />;
  if (!z.uuid().safeParse(deviceId).success) return missing;

  const supabase = await createClient();
  const device = await fetchDevice(supabase, deviceId);
  if (!device) return missing;

  const source = { kind: 'device', deviceId, type: tab } as const;
  const first = await fetchFeedPage(supabase, source, null);
  const specs = Object.entries(device.specs);

  return (
    <div className="flex flex-col gap-5">
      {device.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={device.imageUrl} alt={`Foto ${device.name}`} className="aspect-[4/3] w-full rounded-lg bg-surface object-contain" />
      )}
      <p className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">{categoryLabel(device.category)}</p>
      <div>
        <h1 className="text-2xl font-semibold">{device.name}</h1>
        <p className="text-muted">{device.brand}</p>
      </div>

      <section aria-labelledby="specs" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="specs" className="mb-2 font-semibold">
          Spesifikasi
        </h2>
        {specs.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">Spesifikasi belum tersedia.</p>
        )}
        {device.sourceUrl ? (
          <a href={device.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex min-h-11 items-center text-accent">
            Lihat sumber
          </a>
        ) : (
          <p className="mt-2 text-sm text-muted">Belum ada sumber yang dicantumkan.</p>
        )}
        <p className="mt-1 text-sm text-muted">Tidak ada harga otomatis di Reson.</p>
      </section>

      <div>
        <Link href={`/posts/new?type=review&deviceId=${device.id}`} className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-medium text-bg">
          Tulis review
        </Link>
      </div>

      <nav aria-label="Jenis post terkait" className="flex gap-2">
        {(['review', 'showcase'] as const).map((t) => {
          const selected = tab === t;
          return (
            <Link
              key={t}
              href={t === 'review' ? `/devices/${device.id}` : `/devices/${device.id}?tab=showcase`}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-md bg-surface px-4 text-sm ${selected ? 'border-2 border-accent' : 'border border-line-strong'}`}
            >
              {selected ? '✓ ' : ''}
              {t === 'review' ? 'Review' : 'Setup terkait'}
            </Link>
          );
        })}
      </nav>

      {first.error ? (
        <EmptyState title="Gagal memuat" message="Tidak bisa memuat post. Muat ulang halaman untuk mencoba lagi." />
      ) : (
        <PostFeed
          key={tab}
          source={source}
          initial={first.items}
          empty={<EmptyState title={tab === 'review' ? 'Belum ada review' : 'Belum ada setup terkait'} message="Jadilah yang pertama menulisnya." />}
        />
      )}
    </div>
  );
}
