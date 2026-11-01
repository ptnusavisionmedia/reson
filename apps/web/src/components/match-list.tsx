'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { forceRefreshMatches } from '@/app/actions';
import { buildExplanation, fetchMatchPage, MATCH_PAGE_SIZE, type MatchCard } from '@/lib/data/match';
import { createClient } from '@/lib/supabase/browser';
import type { SoundProfileInput } from '@shared/validation/soundProfile';

function Avatar({ url, name }: { url: string | null; name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />;
  return (
    <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-line">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function MatchItem({ card, me }: { card: MatchCard; me: SoundProfileInput }) {
  const { reasons, differences } = buildExplanation(card, me);
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar url={card.avatarUrl} name={card.displayName} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.displayName}</p>
          <p className="truncate text-sm text-muted">@{card.username}</p>
        </div>
        <span className="rounded-md border border-line px-2 py-0.5 text-xs text-muted">{card.label}</span>
      </div>
      {card.label === 'Kecocokan awal' && <p className="text-sm text-muted">Data masih sedikit, jadi ini baru perkiraan awal.</p>}
      {reasons.length > 0 && (
        <ul className="list-disc pl-5">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {differences.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted">Yang berbeda</p>
          <ul className="list-disc pl-5 text-sm text-muted">
            {differences.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      <Link href={`/users/${card.candidateId}`} className="flex min-h-11 items-center justify-center rounded-md border border-line-strong px-5">
        Lihat profil
      </Link>
    </article>
  );
}

/** Halaman pertama dari server; berikutnya dimuat bertahap. Tombol Perbarui dibatasi laju oleh server. */
export function MatchList({ label, initial, me }: { label: string | null; initial: MatchCard[]; me: SoundProfileInput }) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < MATCH_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    setFailed(false);
    const page = await fetchMatchPage(createClient(), label, items.length);
    setLoading(false);
    if (page.error) return setFailed(true);
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.candidateId));
      return [...prev, ...page.items.filter((i) => !seen.has(i.candidateId))];
    });
    setDone(page.items.length < MATCH_PAGE_SIZE);
  }

  function refresh() {
    if (pending) return;
    setNotice(null);
    startTransition(async () => {
      const res = await forceRefreshMatches();
      if (res.status === 'cooldown') setNotice('Hasil sudah diperbarui baru-baru ini. Coba lagi beberapa menit lagi.');
      else if (res.status === 'error') setNotice('Tidak bisa memperbarui sekarang. Coba lagi nanti.');
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={refresh} disabled={pending} className="min-h-11 rounded-md border border-line-strong px-4 disabled:opacity-60">
          {pending ? 'Memperbarui…' : 'Perbarui hasil'}
        </button>
        {notice && (
          <p role="status" className="text-sm text-muted">
            {notice}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-line px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">Belum ada kecocokan</h2>
          <p className="mt-2 text-muted">{label ? 'Tidak ada hasil dengan filter ini.' : 'Belum ada pendengar lain yang cocok untuk ditampilkan. Coba lagi nanti.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.candidateId}>
              <MatchItem card={c} me={me} />
            </li>
          ))}
        </ul>
      )}

      {failed && (
        <p role="alert" className="text-sm text-accent">
          Gagal memuat hasil berikutnya. Coba lagi.
        </p>
      )}
      {items.length > 0 &&
        (done ? (
          <p className="py-4 text-center text-sm text-muted">Sudah sampai akhir.</p>
        ) : (
          <button type="button" onClick={loadMore} disabled={loading} className="min-h-11 rounded-md border border-line-strong px-5 disabled:opacity-60">
            {loading ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        ))}
    </div>
  );
}
