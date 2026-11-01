import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';

import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import { fieldErrors, usernameSchema } from '@shared/validation/auth';

const schema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, 'Nama wajib diisi.').max(50, 'Nama maksimal 50 karakter.'),
});

/** Akun Google baru: pilih username final sekali. Sebelum ini selesai, interaksi sosial ditolak server. */
export default function CompleteProfile() {
  const { profile, retry, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    setFormError(null);
    const parsed = schema.safeParse({ username, displayName });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.rpc('finalize_profile', { p_username: parsed.data.username, p_display_name: parsed.data.displayName });
    setSubmitting(false);
    if (error && error.code === '23505') return setErrors({ username: 'Username sudah dipakai.' });
    // 42501 = sudah lengkap di perangkat lain: cukup muat ulang akun.
    if (error && error.code !== '42501') return setFormError('Tidak bisa menyimpan profil. Periksa koneksi lalu coba lagi.');
    retry(); // muat ulang akun; guard memindahkan layar
  }

  return (
    <Screen>
      <View style={{ paddingVertical: spacing.md }}>
        <Logo size={56} />
      </View>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Lengkapi profil</Text>
      <Text style={{ color: colors.textSecondary }}>Pilih username untuk Reson. Username tidak bisa diganti setelah ini.</Text>
      <Input label="Nama tampilan" value={displayName} onChangeText={setDisplayName} error={errors.displayName} />
      <Input label="Username" value={username} onChangeText={setUsername} error={errors.username} autoCapitalize="none" autoCorrect={false} />
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Simpan" onPress={onSubmit} loading={submitting} />
      <Pressable accessibilityRole="button" onPress={signOut} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Keluar</Text>
      </Pressable>
    </Screen>
  );
}
