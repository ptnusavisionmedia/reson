'use client';

import Link from 'next/link';
import { useState } from 'react';

import { setBlock, setNotificationPrefs, submitReport } from '@/app/actions';
import type { NotificationKey, NotificationPreferences } from '@shared/validation/profile';

import { ConfirmDialog } from './confirm-dialog';
import { SmallButton } from './composer/fields';

const ROWS: { key: NotificationKey; label: string }[] = [
  { key: 'follow', label: 'Pengikut baru' },
  { key: 'comment', label: 'Komentar pada post saya' },
  { key: 'reply', label: 'Balasan komentar saya' },
];

/** Preferensi notifikasi dalam aplikasi; berubah seketika dan dikembalikan bila server menolak. */
export function NotificationPrefs({ initial }: { initial: NotificationPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(key: NotificationKey, value: boolean) {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setMessage(null);
    const res = await setNotificationPrefs(next);
    if (res.error !== undefined) {
      setPrefs(previous);
      setMessage(res.error);
    }
  }

  return (
    <fieldset className="rounded-lg border border-line bg-surface p-4">
      <legend className="px-1 font-semibold">Notifikasi dalam aplikasi</legend>
      {ROWS.map((r) => (
        <label key={r.key} className="flex min-h-11 items-center justify-between gap-4">
          <span>{r.label}</span>
          <input
            type="checkbox"
            role="switch"
            checked={prefs[r.key]}
            onChange={(e) => void toggle(r.key, e.target.checked)}
            className="h-6 w-6 accent-[#e77768]"
          />
        </label>
      ))}
      {message && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {message}
        </p>
      )}
    </fieldset>
  );
}

/** Blokir/buka blokir dan laporkan pengguna. */
export function BlockControls({ targetId, initialBlocked }: { targetId: string; initialBlocked: boolean }) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(block: boolean) {
    setBusy(true);
    setError(null);
    const res = await setBlock(targetId, block);
    setBusy(false);
    setOpen(false);
    if (res.error !== undefined) return setError(res.error);
    setBlocked(block);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <SmallButton onClick={() => (blocked ? void run(false) : setOpen(true))} disabled={busy}>
          {blocked ? 'Buka blokir' : 'Blokir'}
        </SmallButton>
        <Link href={`/report?targetType=user&targetId=${targetId}`} className="flex min-h-11 items-center rounded-md border border-line-strong px-4 text-sm">
          Laporkan pengguna
        </Link>
      </div>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={open}
        title="Blokir pengguna ini?"
        message="Kalian tidak akan saling melihat post dan komentar, dan tidak bisa saling mengikuti. Follow yang ada akan diputus."
        confirmLabel="Blokir"
        busy={busy}
        onConfirm={() => void run(true)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return <p className="text-sm text-muted">Blokir dibuka.</p>;
  return (
    <div className="flex flex-col gap-1">
      <SmallButton
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await setBlock(userId, false);
          setBusy(false);
          if (res.error !== undefined) return setError(res.error);
          setDone(true);
        }}
      >
        {busy ? 'Memproses…' : 'Buka blokir'}
      </SmallButton>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export const REPORT_REASONS = ['Spam atau promosi', 'Pelecehan atau ujaran kasar', 'Konten tidak pantas', 'Informasi menyesatkan', 'Lainnya'] as const;

const TYPE_LABEL = { post: 'post', comment: 'komentar', user: 'pengguna' } as const;

export function ReportForm({ targetType, targetId }: { targetType: 'post' | 'comment' | 'user'; targetId: string }) {
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line px-6 py-12 text-center">
        <h1 className="text-lg font-semibold">Laporan terkirim</h1>
        <p className="text-muted">Terima kasih. Moderator akan meninjaunya. Kamu tidak akan melihat hasil tinjauan orang lain.</p>
        <button type="button" onClick={() => history.back()} className="mx-auto min-h-11 rounded-md border border-line-strong px-5">
          Selesai
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!reason) return setError('Pilih alasan terlebih dahulu.');
    setBusy(true);
    setError(null);
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    const res = await submitReport(targetType, targetId, text);
    setBusy(false);
    if (res.error !== undefined) return setError(res.error);
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Laporkan {TYPE_LABEL[targetType]}</h1>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-muted">Pilih alasan yang paling sesuai.</legend>
        {REPORT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={reason === r}
            onClick={() => setReason(r)}
            className={`min-h-11 rounded-md bg-surface px-4 text-left ${reason === r ? 'border-2 border-accent' : 'border border-line-strong'}`}
          >
            {reason === r ? `✓ ${r}` : r}
          </button>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm text-muted">
          Keterangan tambahan (opsional)
        </label>
        <textarea id="note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="min-h-20 rounded-md border border-line-strong bg-surface p-3" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
        {busy ? 'Mengirim…' : 'Kirim laporan'}
      </button>
    </form>
  );
}
