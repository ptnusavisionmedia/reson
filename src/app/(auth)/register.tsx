import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase/client';
import { colors, spacing } from '@/theme';
import { fieldErrors, registerSchema } from '@shared/validation/auth';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit() {
    if (submitting) return;
    setFormError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSubmitting(true);
    try {
      const { data: free, error: checkError } = await supabase.rpc('username_available', { p_username: parsed.data.username });
      if (checkError) return setFormError(authErrorMessage(checkError));
      if (!free) return setErrors({ username: 'Username sudah dipakai.' });

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { username: parsed.data.username, display_name: parsed.data.displayName } },
      });
      if (error) return setFormError(authErrorMessage(error));
      // Tanpa sesi = menunggu verifikasi email. Dengan sesi, guard yang memindahkan layar.
      if (!data.session) router.replace({ pathname: '/verify-email', params: { email: parsed.data.email } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={{ paddingVertical: spacing.md }}>
        <Logo size={56} />
      </View>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Daftar</Text>
      <Input label="Nama tampilan" value={form.displayName} onChangeText={set('displayName')} error={errors.displayName} />
      <Input label="Username (tidak bisa diganti nanti)" value={form.username} onChangeText={set('username')} error={errors.username} autoCapitalize="none" autoCorrect={false} />
      <Input label="Email" value={form.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Password" value={form.password} onChangeText={set('password')} error={errors.password} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Daftar" onPress={onSubmit} loading={submitting} />
      <Link href="/login" style={{ color: colors.accent, minHeight: 44, paddingVertical: 12 }}>Sudah punya akun? Masuk</Link>
    </Screen>
  );
}
