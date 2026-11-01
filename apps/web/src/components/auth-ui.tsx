'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';

import { createClient } from '@/lib/supabase/browser';
import { safeReturnTo } from '@/lib/auth/return-to';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-4 py-10">
      <p className="font-mono text-sm tracking-widest text-accent">RESON</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Field({ label, error, ...props }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="min-h-11 rounded-md border border-line-strong bg-surface px-3 text-fg"
        {...props}
      />
      {error && (
        <p id={`${id}-err`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60"
    >
      {loading ? 'Memproses…' : children}
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-accent">
      {message}
    </p>
  ) : null;
}

/** Tombol "Lanjutkan dengan Google": satu tombol untuk masuk dan daftar. */
export function GoogleButton({ returnTo }: { returnTo?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const next = safeReturnTo(returnTo);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    // Sukses = browser berpindah ke Google; hanya galat yang kembali ke sini.
    if (error) {
      setError('Tidak bisa terhubung ke Google. Coba lagi atau masuk dengan email.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="flex min-h-11 items-center justify-center gap-3 rounded-md border border-line-strong bg-white px-5 font-medium text-[#1f1f1f] disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {loading ? 'Membuka Google…' : 'Lanjutkan dengan Google'}
      </button>
      <FormError message={error} />
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function authErrorMessage(error: { message: string; code?: string }): string {
  const m = error.message.toLowerCase();
  if (m.includes('invalid login')) return 'Email atau password salah.';
  if (m.includes('email not confirmed')) return 'Email belum diverifikasi. Cek kotak masuk Anda.';
  if (m.includes('already registered')) return 'Email sudah terdaftar. Coba masuk.';
  if (m.includes('rate limit') || error.code === 'over_email_send_rate_limit') return 'Terlalu banyak percobaan. Coba lagi nanti.';
  if (m.includes('fetch') || m.includes('network')) return 'Tidak ada koneksi. Periksa jaringan Anda.';
  return 'Terjadi kesalahan. Coba lagi.';
}
