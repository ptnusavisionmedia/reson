import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/ui/Logo';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase/client';
import { colors, spacing } from '@/theme';
import { fieldErrors, loginSchema } from '@shared/validation/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    // Sukses: AuthProvider menangkap sesi dan guard memindahkan layar.
    if (error) setFormError(authErrorMessage(error));
  }

  return (
    <Screen>
      <View style={{ paddingVertical: spacing.lg }}>
        <Logo tagline />
      </View>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Masuk</Text>
      <Input label="Email" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="password" />
      <Pressable accessibilityRole="button" onPress={() => setShowPassword((v) => !v)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>{showPassword ? 'Sembunyikan password' : 'Tampilkan password'}</Text>
      </Pressable>
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Masuk" onPress={onSubmit} loading={submitting} />
      <View style={{ gap: spacing.sm }}>
        <Link href="/forgot-password" style={{ color: colors.text, minHeight: 44, paddingVertical: 12 }}>Lupa password?</Link>
        <Link href="/register" style={{ color: colors.accent, minHeight: 44, paddingVertical: 12 }}>Belum punya akun? Daftar</Link>
      </View>
    </Screen>
  );
}
