'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';

import { AuthShell, Field, FormError, SubmitButton } from '@/components/auth-ui';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors, usernameSchema } from '@shared/validation/auth';

const schema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, 'Nama wajib diisi.').max(50, 'Nama maksimal 50 karakter.'),
});

export function CompleteProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ username: f.get('username'), displayName: f.get('displayName') });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await createClient().rpc('finalize_profile', {
      p_username: parsed.data.username,
      p_display_name: parsed.data.displayName,
    });
    if (error) {
      setLoading(false);
      if (error.code === '23505') return setErrors({ username: 'Username sudah dipakai.' });
      if (error.code === '42501') return router.replace('/home'); // sudah lengkap
      return setFormError('Tidak bisa menyimpan profil. Periksa koneksi lalu coba lagi.');
    }
    router.replace('/home');
    router.refresh();
  }

  return (
    <AuthShell title="Lengkapi profil">
      <p className="text-sm text-muted">Pilih username untuk Reson. Username tidak bisa diganti setelah ini.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Nama tampilan" name="displayName" defaultValue={initialDisplayName} error={errors.displayName} />
        <Field label="Username" name="username" autoCapitalize="none" autoCorrect="off" error={errors.username} />
        <FormError message={formError} />
        <SubmitButton loading={loading}>Simpan</SubmitButton>
      </form>
    </AuthShell>
  );
}
