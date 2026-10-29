import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

/**
 * Layar berisi form/teks yang bisa digulir, dan otomatis memberi ruang saat keyboard muncul.
 *
 * Android modern menggambar konten sampai tepi bawah layar (edge-to-edge) dan TIDAK lagi
 * mengecilkan jendela saat keyboard muncul, sehingga keyboard menutupi kolom di bagian bawah.
 * Di sini ketinggian keyboard dipakai sebagai padding bawah (mengikuti animasinya), sehingga
 * area gulir mengecil tepat di atas keyboard. Android lalu menggulirkan kolom yang sedang fokus
 * agar tetap terlihat saat ukuran area gulir berubah.
 *
 * `inStack`: layar di dalam Stack yang sudah punya header, jadi tidak perlu inset atas lagi.
 */
export function Screen({ title, children, inStack }: { title?: string; children: ReactNode; inStack?: boolean }) {
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true, isNavigationBarTranslucentAndroid: true });
  const lift = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));

  return (
    <SafeAreaView style={styles.root} edges={inStack ? [] : ['top']}>
      <Animated.View style={[styles.fill, lift]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {!!title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
          <View style={{ gap: spacing.md }}>{children}</View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
});
