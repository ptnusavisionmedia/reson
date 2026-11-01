'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { completeOnboarding, markIntroSeen, saveSoundProfile } from '@/app/actions';
import type { SoundProfileInput } from '@shared/validation/soundProfile';

import { SmallButton } from './composer/fields';
import { SoundQuizForm } from './sound-quiz-form';

const PAGES = [
  { title: 'Kenali selera', body: 'Jawab beberapa pertanyaan singkat tentang musik dan suara yang kamu suka. Tidak perlu paham istilah audio.' },
  { title: 'Temukan teman satu selera', body: 'Reson mencocokkan pendengar dengan selera serupa, lengkap dengan alasan yang bisa kamu pahami.' },
  { title: 'Bagikan cerita', body: 'Baca pengalaman orang lain, lalu bagikan ulasan dan setup milikmu sendiri.' },
];

/** Tiga layar pengenalan. "Lewati" langsung ke kuis. */
export function IntroFlow() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = PAGES[page];
  const last = page === PAGES.length - 1;

  async function finish() {
    if (busy) return;
    setBusy(true);
    await markIntroSeen(); // non-kritis
    router.replace('/sound-quiz');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button type="button" onClick={finish} disabled={busy} className="min-h-11 px-2 text-muted">
          Lewati
        </button>
      </div>
      <div key={page} className="flex flex-col gap-3 py-8 text-center">
        <h1 className="text-2xl font-semibold">{current.title}</h1>
        <p className="text-muted">{current.body}</p>
      </div>
      <p className="text-center text-muted" aria-label={`Halaman ${page + 1} dari ${PAGES.length}`}>
        {PAGES.map((_, i) => (i === page ? '● ' : '○ ')).join('')}
      </p>
      <div className="flex gap-2">
        {page > 0 && <SmallButton onClick={() => setPage(page - 1)}>Kembali</SmallButton>}
        <button
          type="button"
          onClick={last ? finish : () => setPage(page + 1)}
          disabled={busy}
          className="min-h-11 flex-1 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60"
        >
          {last ? 'Mulai' : 'Lanjut'}
        </button>
      </div>
    </div>
  );
}

/** Kuis saat onboarding: simpan lalu ke hasil. Boleh dilewati. */
export function OnboardingQuiz({ initial }: { initial: SoundProfileInput | null }) {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function skip() {
    if (skipping) return;
    setSkipping(true);
    setError(null);
    const res = await completeOnboarding();
    if (res.error !== undefined) {
      setSkipping(false);
      return setError(res.error);
    }
    router.replace('/home');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <SoundQuizForm
        initial={initial}
        submitLabel="Lihat hasil"
        onSubmit={async (value) => {
          const res = await saveSoundProfile(value);
          if (res.error !== undefined) return res.error;
          router.replace('/quiz-result');
          return null;
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      {/* Kuis boleh dilewati; Match akan mengajak melengkapinya nanti. */}
      <SmallButton onClick={skip} disabled={skipping}>
        {skipping ? 'Memproses…' : 'Lewati, isi nanti'}
      </SmallButton>
    </div>
  );
}

export function FinishOnboardingButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await completeOnboarding();
    if (res.error !== undefined) {
      setBusy(false);
      return setError(res.error);
    }
    router.replace('/home');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={go} disabled={busy} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
        {busy ? 'Memproses…' : 'Mulai jelajah'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

/** Ubah Sound Profile dari pengaturan/profil. */
export function EditSoundProfile({ initial }: { initial: SoundProfileInput | null }) {
  const router = useRouter();
  return (
    <SoundQuizForm
      initial={initial}
      submitLabel="Simpan"
      onSubmit={async (value) => {
        const res = await saveSoundProfile(value);
        if (res.error !== undefined) return res.error;
        router.push('/profile');
        router.refresh();
        return null;
      }}
    />
  );
}
