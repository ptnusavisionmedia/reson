'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AuthShell, Field, FormError, SubmitButton, authErrorMessage } from '@/components/auth-ui';
import { createClient } from '@/lib/supabase/browser';
import { passwordSchema } from '@shared/validation/auth';

export default function UpdatePasswordPage() {
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    const parsed = passwordSchema.safeParse(new FormData(e.currentTarget).get('password'));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data });
    if (updateError) {
      setLoading(false);
      return setFormError(
        updateError.message.toLowerCase().includes('session')
          ? 'Tautan sudah kedaluwarsa. Minta tautan baru.'
          : authErrorMessage(updateError),
      );
    }
    // Login ulang dengan password baru, sesuai alur PRD.
    await supabase.auth.signOut();
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="Password diperbarui">
        <p className="text-muted">Silakan masuk dengan password baru.</p>
        <Link href="/login" className="min-h-11 rounded-md bg-accent px-5 py-3 text-center font-medium text-bg">Masuk</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Password baru">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Password baru" name="password" type="password" autoComplete="new-password" error={error} />
        <FormError message={formError} />
        <SubmitButton loading={loading}>Simpan</SubmitButton>
      </form>
      <Link href="/forgot-password" className="py-2 text-sm text-muted">Minta tautan baru</Link>
    </AuthShell>
  );
}
