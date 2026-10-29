import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/**
 * Pemberitahuan pembaruan (EAS Update). expo-updates mengunduh pembaruan di latar saat app dibuka;
 * setelah siap, pengguna memilih kapan memulai ulang. Tidak memulai ulang sendiri agar tidak
 * memotong yang sedang diketik. Tidak tampil di mode pengembangan (Expo Go) karena pembaruan nonaktif di sana.
 */
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);

  if (!isUpdatePending || dismissed) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.md,
        right: spacing.md,
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.accent,
        backgroundColor: colors.surface,
      }}>
      <Text style={{ color: colors.text, fontWeight: '600' }}>Pembaruan tersedia</Text>
      <Text style={{ color: colors.textSecondary }}>Versi terbaru sudah diunduh. Mulai ulang aplikasi untuk memakainya.</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Button title="Nanti" variant="secondary" onPress={() => setDismissed(true)} disabled={restarting} /></View>
        <View style={{ flex: 1 }}>
          <Button
            title="Mulai ulang"
            loading={restarting}
            onPress={async () => {
              setRestarting(true);
              try {
                await Updates.reloadAsync();
              } catch {
                setRestarting(false); // gagal memulai ulang: pembaruan tetap terpasang di buka berikutnya
              }
            }}
          />
        </View>
      </View>
    </View>
  );
}
