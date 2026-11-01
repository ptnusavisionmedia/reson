'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AuthShell, Divider, Field, FormError, GoogleButton, SubmitButton, authErrorMessage } from '@/components/auth-ui';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors, registerSchema } from '@shared/validation/auth';

export default function RegisterPage() {
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    const f = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      displayName: f.get('displayName'),
      username: f.get('username'),
      email: f.get('email'),
      password: f.get('password'),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: free, error: checkError } = await supabase.rpc('username_available', { p_username: parsed.data.username });
      if (checkError) return setFormError(authErrorMessage(checkError));
      if (!free) return setErrors({ username: 'Username sudah dipakai.' });

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { username: parsed.data.username, display_name: parsed.data.displayName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        },
      });
      if (error) return setFormError(authErrorMessage(error));
      if (data.session) window.location.assign('/home');
      else setSentTo(parsed.data.email);
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Cek email Anda">
        <p className="text-muted">Kami mengirim tautan verifikasi ke {sentTo}. Buka tautan itu untuk melanjutkan.</p>
        <Link href="/login" className="flex min-h-11 items-center text-accent">Kembali ke Masuk</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Daftar">
      <GoogleButton />
      <Divider>atau daftar dengan email</Divider>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Nama tampilan" name="displayName" autoComplete="name" error={errors.displayName} />
        <Field label="Username (tidak bisa diganti nanti)" name="username" autoCapitalize="none" autoCorrect="off" error={errors.username} />
        <Field label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" error={errors.password} />
        <FormError message={formError} />
        <SubmitButton loading={loading}>Daftar</SubmitButton>
      </form>
      <Link href="/login" className="flex min-h-11 items-center text-sm text-accent">Sudah punya akun? Masuk</Link>
    </AuthShell>
  );
}
