import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { MatchList } from '@/components/match-list';
import { fetchMatchPage, MATCH_LABELS, refreshMatches } from '@/lib/data/match';
import { createClient } from '@/lib/supabase/server';
import { soundProfileSchema } from '@shared/validation/soundProfile';

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ label?: string }> }) {
  const { label: rawLabel } = await searchParams;
  const label = MATCH_LABELS.find((l) => l === rawLabel) ?? null;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?returnTo=%2Fmatch');

  const header = (
    <>
      <h1 className="text-2xl font-semibold">Match</h1>
      <p className="mt-2 text-muted">
        Pendengar dengan selera yang mirip denganmu. Ini kecocokan selera, bukan ukuran keahlian, dan belum tentu kamu menyukai perangkat yang sama.
      </p>
    </>
  );

  // Server memutuskan perlu hitung ulang atau tidak; hasil dibaca lewat get_my_matches yang tervalidasi.
  const status = await refreshMatches(supabase, false);
  if (status === 'no_profile') {
    return (
      <>
        {header}
        <div className="mt-6">
          <EmptyState
            title="Lengkapi Sound Profile"
            message="Jawab kuis singkat agar kami bisa mencarikan pendengar dengan selera mirip."
            href="/settings/sound-profile"
            actionLabel="Buka kuis"
          />
        </div>
      </>
    );
  }
  if (status === 'disabled') {
    return (
      <>
        {header}
        <div className="mt-6">
          <EmptyState
            title="Match dinonaktifkan"
            message="Kamu menyembunyikan Sound Profile, jadi tidak ikut Match. Aktifkan lagi lewat Ubah Sound Profile."
            href="/settings/sound-profile"
            actionLabel="Ubah Sound Profile"
          />
        </div>
      </>
    );
  }

  const [page, snd] = await Promise.all([
    fetchMatchPage(supabase, label, 0),
    supabase.from('sound_profiles').select('genres, bass, vocals, treble, contexts, discoverable').eq('user_id', auth.user.id).maybeSingle(),
  ]);
  const me = snd.data ? soundProfileSchema.safeParse(snd.data) : null;
  if (status === 'error' || page.error || !me?.success) {
    return (
      <>
        {header}
        <div className="mt-6">
          <EmptyState title="Gagal memuat" message="Tidak bisa memuat Match. Muat ulang halaman untuk mencoba lagi." />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>{header}</div>
      <nav aria-label="Filter kecocokan" className="flex flex-wrap gap-2">
        {[null, ...MATCH_LABELS].map((l) => {
          const selected = l === label;
          return (
            <Link
              key={l ?? 'all'}
              href={l ? `/match?label=${encodeURIComponent(l)}` : '/match'}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-11 items-center rounded-md bg-surface px-4 text-sm ${selected ? 'border-2 border-accent' : 'border border-line-strong'}`}
            >
              {selected ? `✓ ${l ?? 'Semua'}` : (l ?? 'Semua')}
            </Link>
          );
        })}
      </nav>
      {/* key memuat ID hasil: setelah "Perbarui hasil", daftar dimulai ulang dari data server terbaru */}
      <MatchList key={`${label ?? 'all'}:${page.items.map((i) => i.candidateId).join(',')}`} label={label} initial={page.items} me={me.data} />
    </div>
  );
}
