import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { authRedirectUrl } from '@/features/auth/authLinks';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/theme';
import { fieldErrors, forgotPasswordSchema } from '@shared/validation/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (submitting) return;
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(fieldErrors(parsed.error).email);
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: authRedirectUrl() });
    setSubmitting(false);
    // Respons sama untuk email terdaftar maupun tidak, agar tidak membocorkan akun.
    if (err && err.code !== 'user_not_found') return setFormError(authErrorMessage(err));
    setSent(true);
  }

  return (
    <Screen title="Lupa password">
      {sent ? (
        <Text style={{ color: colors.text }}>Jika email terdaftar, kami telah mengirim tautan untuk mengatur ulang password.</Text>
      ) : (
        <>
          <Input label="Email" value={email} onChangeText={setEmail} error={error} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
          <Button title="Kirim tautan" onPress={onSubmit} loading={submitting} />
        </>
      )}
      <Link href="/login" style={{ color: colors.accent, minHeight: 44, paddingVertical: 12 }}>Kembali ke masuk</Link>
    </Screen>
  );
}
