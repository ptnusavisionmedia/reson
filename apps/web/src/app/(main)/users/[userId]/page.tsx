import Link from 'next/link';
import { z } from 'zod';

import { EmptyState } from '@/components/empty-state';
import { FollowButton } from '@/components/follow-button';
import { BlockControls } from '@/components/settings-client';
import { PostFeed } from '@/components/post-feed';
import { describeProfile } from '@/lib/data/match';
import { fetchFeedPage } from '@/lib/data/posts';
import { createClient } from '@/lib/supabase/server';
import { soundProfileSchema } from '@shared/validation/soundProfile';

const TABS = [
  { id: 'all', label: 'Post' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Setup' },
] as const;

export default async function UserPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { userId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.id === rawTab)?.id ?? 'all';

  // Akun suspended/deleting tidak dikembalikan RLS, jadi tampil sama dengan "tidak ditemukan".
  const missing = <EmptyState title="Akun tidak tersedia" message="Akun ini tidak ditemukan atau sudah tidak aktif." href="/home" actionLabel="Kembali ke Beranda" />;
  if (!z.uuid().safeParse(userId).success) return missing;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id ?? '';

  const [prof, snd, follow, block] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, bio, avatar_path, follower_count, following_count').eq('id', userId).maybeSingle(),
    supabase.from('sound_profiles').select('genres, bass, vocals, treble, contexts, discoverable').eq('user_id', userId).maybeSingle(),
    supabase.from('follows').select('following_id').eq('follower_id', me).eq('following_id', userId).maybeSingle(),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', userId).maybeSingle(),
  ]);
  if (prof.error) return <EmptyState title="Gagal memuat" message="Tidak bisa memuat profil. Muat ulang halaman untuk mencoba lagi." />;
  if (!prof.data) return missing;

  const p = prof.data;
  const isSelf = p.id === me;
  const sound = snd.data ? soundProfileSchema.safeParse(snd.data) : null;
  const avatar = p.avatar_path ? supabase.storage.from('avatars').getPublicUrl(p.avatar_path).data.publicUrl : null;

  const source = { kind: 'author', authorId: p.id, type: tab === 'all' ? undefined : tab } as const;
  const first = await fetchFeedPage(supabase, source, null);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={`Foto ${p.display_name}`} width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-line text-2xl">
              {p.display_name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{p.display_name}</h1>
            <p className="text-muted">@{p.username}</p>
          </div>
        </div>
        {p.bio && <p className="whitespace-pre-wrap break-words">{p.bio}</p>}
        <p className="text-sm text-muted">
          {p.follower_count} pengikut • {p.following_count} mengikuti
        </p>
        {!isSelf && <FollowButton targetId={p.id} initialFollowing={!!follow.data} />}
        {!isSelf && <BlockControls targetId={p.id} initialBlocked={!!block.data} />}
        {isSelf && (
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/settings/profile', label: 'Ubah profil' },
              { href: '/settings/sound-profile', label: 'Ubah Sound Profile' },
              { href: '/saved', label: 'Tersimpan' },
              { href: '/settings', label: 'Pengaturan' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-11 items-center rounded-md border border-line-strong px-4 text-sm">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {sound?.success && (
        <section aria-labelledby="sound" className="rounded-lg border border-line bg-surface p-4">
          <h2 id="sound" className="mb-2 font-semibold">
            Sound Profile
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {describeProfile(sound.data).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Jenis konten" className="flex gap-2">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <Link
              key={t.id}
              href={t.id === 'all' ? `/users/${p.id}` : `/users/${p.id}?tab=${t.id}`}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-md bg-surface px-4 text-sm ${selected ? 'border-2 border-accent' : 'border border-line-strong'}`}
            >
              {selected ? `✓ ${t.label}` : t.label}
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
          empty={<EmptyState title={tab === 'review' ? 'Belum ada review' : tab === 'showcase' ? 'Belum ada setup' : 'Belum ada post'} />}
        />
      )}
    </div>
  );
}
