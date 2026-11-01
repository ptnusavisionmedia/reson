'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AuthShell, Divider, Field, FormError, GoogleButton, SubmitButton, authErrorMessage } from '@/components/auth-ui';
import { safeReturnTo } from '@/lib/auth/return-to';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors, loginSchema } from '@shared/validation/auth';

export function LoginForm({ returnTo, callbackError, accountDeleted }: { returnTo: string | null; callbackError: boolean; accountDeleted: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(
    callbackError ? 'Tautan masuk sudah kedaluwarsa atau tidak valid. Coba lagi.' : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      return setFormError(authErrorMessage(error));
    }
    router.replace(safeReturnTo(returnTo));
    router.refresh();
  }

  return (
    <AuthShell title="Masuk">
      {accountDeleted && (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm text-muted">
          Akunmu sudah dihapus.
        </p>
      )}
      <GoogleButton returnTo={returnTo} />
      <Divider>atau masuk dengan email</Divider>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" error={errors.password} />
        <FormError message={formError} />
        <SubmitButton loading={loading}>Masuk</SubmitButton>
      </form>
      <div className="flex flex-col gap-1 text-sm">
        <Link href="/forgot-password" className="py-2">Lupa password?</Link>
        <Link href="/register" className="py-2 text-accent">Belum punya akun? Daftar</Link>
      </div>
    </AuthShell>
  );
}
