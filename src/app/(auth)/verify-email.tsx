import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui';
import { authRedirectUrl } from '@/features/auth/authLinks';
import { authErrorMessage } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/theme';

const COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS); // email baru saja terkirim saat daftar
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setMessage(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl() } });
    setSending(false);
    if (error) return setMessage(authErrorMessage(error));
    setCooldown(COOLDOWN_SECONDS);
    setMessage('Email verifikasi dikirim ulang.');
  }

  return (
    <Screen title="Verifikasi email">
      <Text style={{ color: colors.text }}>
        Kami mengirim tautan verifikasi{email ? ` ke ${email}` : ''}. Buka tautan itu, lalu masuk.
      </Text>
      {!!message && <Text style={{ color: colors.textSecondary }} accessibilityRole="alert">{message}</Text>}
      <Button
        title={cooldown > 0 ? `Kirim ulang (${cooldown} dtk)` : 'Kirim ulang email'}
        variant="secondary"
        onPress={resend}
        disabled={cooldown > 0 || !email}
        loading={sending}
      />
      <Link href="/login" style={{ color: colors.accent, minHeight: 44, paddingVertical: 12 }}>Saya sudah verifikasi, masuk</Link>
    </Screen>
  );
}
