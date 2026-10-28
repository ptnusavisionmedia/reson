import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { colors, spacing } from '@/theme';

/** `inStack`: layar di dalam Stack yang sudah punya header, jadi tidak perlu inset atas lagi. */
export function Screen({ title, children, inStack }: { title?: string; children: ReactNode; inStack?: boolean }) {
  return (
    <SafeAreaView style={styles.root} edges={inStack ? [] : ['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!!title && <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
        <View style={{ gap: spacing.md }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
});
