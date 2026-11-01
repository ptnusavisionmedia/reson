import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { DeviceResults, UserResults } from '@/components/explore-results';
import { PostFeed } from '@/components/post-feed';
import { DEVICE_CATEGORIES, searchDevicePage, searchUserPage } from '@/lib/data/devices';
import { fetchFeedPage, type PostType } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';

type Tab = 'devices' | 'posts' | 'users';
const TABS: { id: Tab; label: string }[] = [
  { id: 'devices', label: 'Perangkat' },
  { id: 'posts', label: 'Post' },
  { id: 'users', label: 'Pengguna' },
];
const POST_TYPES: { id: PostType; label: string }[] = [
  { id: 'discussion', label: 'Diskusi' },
  { id: 'question', label: 'Pertanyaan' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Showcase' },
];

function Chip({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'page' : undefined}
      className={`flex min-h-11 items-center rounded-md bg-surface px-4 text-sm ${selected ? 'border-2 border-accent' : 'border border-line-strong'}`}
    >
      {selected ? `✓ ${label}` : label}
    </Link>
  );
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; category?: string; type?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = TABS.find((t) => t.id === sp.tab)?.id ?? 'devices';
  const q = (sp.q ?? '').trim().slice(0, 100);
  const category = DEVICE_CATEGORIES.find((c) => c.id === sp.category)?.id ?? null;
  const postType = POST_TYPES.find((t) => t.id === sp.type)?.id ?? null;

  const href = (over: Partial<{ tab: Tab; category: string | null; type: string | null }>) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    p.set('tab', t);
    if (q) p.set('q', q);
    const c = 'category' in over ? over.category : category;
    const ty = 'type' in over ? over.type : postType;
    if (t === 'devices' && c) p.set('category', c);
    if (t === 'posts' && ty) p.set('type', ty);
    return `/explore?${p.toString()}`;
  };

  const supabase = await createClient();
  let results: React.ReactNode;
  if (tab === 'devices') {
    const page = await searchDevicePage(supabase, { q, category, offset: 0 });
    results = page.error ? (
      <EmptyState title="Gagal memuat" message="Tidak bisa memuat perangkat. Muat ulang halaman untuk mencoba lagi." />
    ) : page.items.length === 0 ? (
      <EmptyState title="Perangkat tidak ditemukan" message="Katalog dikurasi admin. Coba awalan nama lain." />
    ) : (
      <DeviceResults key={`${q}:${category}`} initial={page.items} q={q} category={category} />
    );
  } else if (tab === 'posts') {
    const source = { kind: 'search', q, type: postType ?? undefined } as const;
    const page = await fetchFeedPage(supabase, source, null);
    results = page.error ? (
      <EmptyState title="Gagal memuat" message="Tidak bisa memuat post. Muat ulang halaman untuk mencoba lagi." />
    ) : (
      <PostFeed
        key={`${q}:${postType}`}
        source={source}
        initial={page.items}
        empty={<EmptyState title="Tidak ada post" message={q ? 'Tidak ada judul yang diawali kata itu.' : 'Belum ada post.'} />}
      />
    );
  } else if (!q) {
    results = <EmptyState title="Cari pengguna" message="Ketik awal username untuk mencari." />; // tanpa kata kunci, daftar pengguna tidak ditampilkan
  } else {
    const page = await searchUserPage(supabase, q, 0);
    results = page.error ? (
      <EmptyState title="Gagal memuat" message="Tidak bisa memuat pengguna. Muat ulang halaman untuk mencoba lagi." />
    ) : page.items.length === 0 ? (
      <EmptyState title="Pengguna tidak ditemukan" message="Tidak ada username yang diawali kata itu." />
    ) : (
      <UserResults key={q} initial={page.items} q={q} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Jelajah</h1>

      <form action="/explore" method="get" role="search" className="flex flex-col gap-2">
        <input type="hidden" name="tab" value={tab} />
        {category && tab === 'devices' && <input type="hidden" name="category" value={category} />}
        {postType && tab === 'posts' && <input type="hidden" name="type" value={postType} />}
        <label htmlFor="q" className="text-sm text-muted">
          Cari
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={tab === 'devices' ? 'Nama perangkat' : tab === 'posts' ? 'Judul post' : 'Username'}
            className="min-h-11 flex-1 rounded-md border border-line-strong bg-surface px-3 text-fg"
          />
          <button type="submit" className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg">
            Cari
          </button>
        </div>
        <p className="text-xs text-muted">Pencarian berdasarkan awal kata, bukan pencarian teks penuh.</p>
      </form>

      <nav aria-label="Jenis hasil" className="flex gap-2">
        {TABS.map((t) => (
          <Chip key={t.id} href={href({ tab: t.id })} label={t.label} selected={tab === t.id} />
        ))}
      </nav>

      {tab === 'devices' && (
        <nav aria-label="Kategori perangkat" className="flex flex-wrap gap-2">
          <Chip href={href({ category: null })} label="Semua kategori" selected={category === null} />
          {DEVICE_CATEGORIES.map((c) => (
            <Chip key={c.id} href={href({ category: c.id })} label={c.label} selected={category === c.id} />
          ))}
        </nav>
      )}
      {tab === 'posts' && (
        <nav aria-label="Jenis post" className="flex flex-wrap gap-2">
          <Chip href={href({ type: null })} label="Semua jenis" selected={postType === null} />
          {POST_TYPES.map((t) => (
            <Chip key={t.id} href={href({ type: t.id })} label={t.label} selected={postType === t.id} />
          ))}
        </nav>
      )}

      {results}
    </div>
  );
}
