import { useEffect, useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { useRouter } from 'expo-router';
import { Button, Card, ErrorState, Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { deleteAccountUrl, privacyUrl, supportEmail } from '@/config/env';
import { AboutCard } from '@/features/updates/AboutCard';
import { useAuth } from '@/providers/AuthProvider';
import { colors, minTouchTarget, spacing } from '@/theme';
import { normalizePreferences, type NotificationKey, type NotificationPreferences } from '@shared/validation/profile';

const ROWS: { key: NotificationKey; label: string }[] = [
  { key: 'follow', label: 'Pengikut baru' },
  { key: 'comment', label: 'Komentar pada post saya' },
  { key: 'reply', label: 'Balasan komentar saya' },
];

export default function Settings() {
  const router = useRouter();
  const uid = useAuth().session?.user.id;
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    supabase.from('accounts').select('notification_preferences').eq('id', uid).single().then(({ data, error }) => {
      if (cancelled) return;
      if (error) setFailed(true);
      else setPrefs(normalizePreferences(data.notification_preferences));
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function toggle(key: NotificationKey, value: boolean) {
    if (!prefs) return;
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next); // optimistis, rollback bila server menolak
    setMessage(null);
    const { error } = await supabase.rpc('update_notification_preferences', { p_prefs: next });
    if (error) {
      setPrefs(previous);
      setMessage('Gagal menyimpan. Periksa koneksi lalu coba lagi.');
    }
  }

  if (failed) return <ErrorState message="Tidak bisa memuat pengaturan." />;
  if (!prefs) return <Loading />;

  return (
    <Screen inStack>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Notifikasi dalam aplikasi</Text>
        {ROWS.map((r) => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}>
            <Text style={{ flex: 1, color: colors.text }}>{r.label}</Text>
            <Switch
              accessibilityLabel={r.label}
              value={prefs[r.key]}
              onValueChange={(v) => toggle(r.key, v)}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
        ))}
      </Card>
      <Button title="Pengguna yang diblokir" variant="secondary" onPress={() => router.push('/settings/blocked-users')} />
      {!!privacyUrl && <Button title="Kebijakan privasi" variant="secondary" onPress={() => Linking.openURL(privacyUrl)} />}
      {!!deleteAccountUrl && <Button title="Permintaan penghapusan akun (web)" variant="secondary" onPress={() => Linking.openURL(deleteAccountUrl)} />}
      {!!supportEmail && <Button title="Hubungi dukungan" variant="secondary" onPress={() => Linking.openURL(`mailto:${supportEmail}`)} />}
      <Button title="Hapus akun" variant="secondary" onPress={() => router.push('/settings/delete-account')} />
      <AboutCard />
      {!!message && <Text style={{ color: colors.accent }} accessibilityRole="alert">{message}</Text>}
    </Screen>
  );
}
