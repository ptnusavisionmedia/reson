'use client';

import { useEffect, useRef, useState } from 'react';

import { signOut } from '@/app/actions';
import { resumeAccountDeletion, startAccountDeletion, STAGE_LABEL, type DeletionStage } from '@/lib/account/deletion';
import { createClient } from '@/lib/supabase/browser';

import { ConfirmDialog } from './confirm-dialog';
import { TextInput } from './composer/fields';

const CONFIRM_WORD = 'HAPUS';
const REAUTH_KEY = 'reson:deleteReauth';
const REAUTH_WINDOW_MS = 4 * 60 * 1000; // server mewajibkan sesi < 5 menit; sisakan jeda

type Reauth = { uid: string; startedAt: number };

function readReauth(): Reauth | null {
  try {
    const raw = sessionStorage.getItem(REAUTH_KEY);
    return raw ? (JSON.parse(raw) as Reauth) : null;
  } catch {
    return null;
  }
}
const writeReauth = (v: Reauth | null) => {
  try {
    if (v) sessionStorage.setItem(REAUTH_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(REAUTH_KEY);
  } catch {}
};

function Consequences() {
  return (
    <>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Yang akan dihapus</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
          <li>• Akunmu, profil, dan Sound Profile</li>
          <li>• Semua post dan fotomu (beserta komentar orang lain di post itu)</li>
          <li>• Komentar, like, simpanan, daftar perangkat, blokir, notifikasi, dan hasil Match</li>
          <li>• Hubungan ikuti, dan keanggotaan komunitas</li>
        </ul>
      </section>
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Yang tetap ada</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
          <li>• Balasan orang lain di komentar utamamu tetap tampil di bawah komentar yang telah dihapus, tanpa isi dan tanpa namamu.</li>
          <li>• Laporan moderasi dan catatan tindakan moderator dipertahankan tanpa identitas pelapor. Rinciannya ada di kebijakan privasi.</li>
        </ul>
      </section>
    </>
  );
}

function Progress({ stage }: { stage: DeletionStage }) {
  return (
    <p role="alert" className="text-sm text-muted">
      {STAGE_LABEL[stage]} Jangan tutup halaman ini.
    </p>
  );
}

/**
 * Hapus akun. Akun password: verifikasi dengan password. Akun Google-only: verifikasi ulang lewat Google
 * (halaman ini dibuka lagi setelah Google), dan UID yang kembali harus sama dengan akun target.
 */
export function DeleteAccount({ uid, email, hasPassword, returnedFromGoogle }: { uid: string; email: string | null; hasPassword: boolean; returnedFromGoogle: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<DeletionStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false); // Google: sudah kembali dengan akun yang sama
  const busy = stage !== null;
  const ready = confirm.trim().toUpperCase() === CONFIRM_WORD && (!hasPassword || password.length > 0);

  // Kembali dari Google: pastikan akun sama dan masih dalam jendela waktu.
  const checked = useRef(false);
  useEffect(() => {
    if (!returnedFromGoogle || checked.current) return;
    checked.current = true;
    const pending = readReauth();
    writeReauth(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending) return setError('Verifikasi Google tidak ditemukan. Ulangi dari awal.');
    if (pending.uid !== uid) {
      // Sesi sekarang milik akun Google lain: akhiri dan jangan hapus akun mana pun.
      void signOut();
      return;
    }
    if (Date.now() - pending.startedAt > REAUTH_WINDOW_MS) return setError('Verifikasi sudah terlalu lama. Ulangi dari awal.');
    setVerified(true);
  }, [returnedFromGoogle, uid]);

  async function run() {
    setOpen(false);
    setError(null);
    setStage('storage');
    const supabase = createClient();
    if (hasPassword && email) {
      const reauth = await supabase.auth.signInWithPassword({ email, password });
      if (reauth.error) {
        setStage(null);
        return setError('Password salah.');
      }
    }
    const err = await startAccountDeletion(supabase, uid, setStage);
    if (err) {
      setError(err);
      return setStage(null);
    }
    window.location.assign('/login?deleted=1'); // sesi lokal sudah diakhiri
  }

  async function verifyWithGoogle() {
    setOpen(false);
    setError(null);
    writeReauth({ uid, startedAt: Date.now() });
    const next = encodeURIComponent('/settings/delete-account?reauth=google');
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        queryParams: { prompt: 'select_account', ...(email ? { login_hint: email } : {}) },
      },
    });
    if (err) {
      writeReauth(null);
      setError('Tidak bisa terhubung ke Google. Coba lagi.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Hapus akun</h1>
      <Consequences />

      {verified ? (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-accent p-4">
          <p className="font-semibold">Akun Google terverifikasi.</p>
          <p className="text-sm text-muted">Lanjutkan sekarang untuk menghapus akunmu secara permanen. Verifikasi berlaku beberapa menit.</p>
          {busy && stage && <Progress stage={stage} />}
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen(true)}
            className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60"
          >
            {busy ? 'Memproses…' : 'Hapus akun saya sekarang'}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ready && !busy) setOpen(true);
          }}
          className="flex flex-col gap-4"
        >
          {hasPassword ? (
            <TextInput
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          ) : (
            <p className="text-sm text-muted">Kamu akan diminta memilih akun Google yang sama untuk memastikan ini benar-benar kamu.</p>
          )}
          <TextInput label={`Ketik ${CONFIRM_WORD} untuk melanjutkan`} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} autoCapitalize="characters" />
          {busy && stage && <Progress stage={stage} />}
          <button type="submit" disabled={!ready || busy} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-50">
            {busy ? 'Memproses…' : hasPassword ? 'Hapus akun saya' : 'Verifikasi dengan Google'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {`${error} Datamu belum selesai dihapus; kamu bisa mencoba lagi.`}
        </p>
      )}

      <ConfirmDialog
        open={open}
        title="Hapus akun secara permanen?"
        message="Tindakan ini tidak bisa dibatalkan."
        confirmLabel={verified || hasPassword ? 'Hapus akun' : 'Lanjut ke Google'}
        busy={busy}
        onConfirm={verified || hasPassword ? run : verifyWithGoogle}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

/** Akun berstatus 'deleting' (penghapusan terputus): hanya boleh menyelesaikan penghapusan atau keluar. */
export function DeletionResume({ uid }: { uid: string }) {
  const [stage, setStage] = useState<DeletionStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setStage('storage');
    const err = await resumeAccountDeletion(createClient(), uid, setStage);
    if (err) {
      setError(err);
      return setStage(null);
    }
    window.location.assign('/login?deleted=1');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Penghapusan akun belum selesai</h1>
      <p className="text-muted">
        Kamu sudah meminta penghapusan akun, tetapi prosesnya terputus. Akun ini tidak aktif dan tidak bisa dipakai sampai penghapusan diselesaikan.
      </p>
      {stage && <Progress stage={stage} />}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <button type="button" onClick={run} disabled={stage !== null} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
        {stage ? 'Memproses…' : 'Lanjutkan penghapusan'}
      </button>
      <form action={signOut}>
        <button type="submit" disabled={stage !== null} className="min-h-11 w-full rounded-md border border-line-strong px-5 disabled:opacity-60">
          Keluar
        </button>
      </form>
    </main>
  );
}
