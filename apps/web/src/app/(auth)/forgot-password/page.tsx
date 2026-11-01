'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AuthShell, Field, FormError, SubmitButton, authErrorMessage } from '@/components/auth-ui';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors, forgotPasswordSchema } from '@shared/validation/auth';

export default function ForgotPasswordPage() {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse({ email: new FormData(e.currentTarget).get('email') });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);
    if (error) return setFormError(authErrorMessage(error));
    setSent(true); // pesan netral: tidak membocorkan apakah email terdaftar
  }

  return (
    <AuthShell title="Lupa password">
      {sent ? (
        <p className="text-muted">Jika email terdaftar, tautan untuk mengatur ulang password sudah dikirim.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
          <FormError message={formError} />
          <SubmitButton loading={loading}>Kirim tautan</SubmitButton>
        </form>
      )}
      <Link href="/login" className="flex min-h-11 items-center text-sm text-accent">Kembali ke Masuk</Link>
    </AuthShell>
  );
}
