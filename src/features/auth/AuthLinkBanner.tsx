import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

/** Pemberitahuan bila tautan email (verifikasi/reset) gagal diproses. */
export function AuthLinkBanner() {
  const { linkError, clearLinkError } = useAuth();
  const insets = useSafeAreaInsets();
  if (!linkError) return null;
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
      <Text style={{ color: colors.text }}>{linkError}</Text>
      <Button title="Tutup" variant="secondary" onPress={clearLinkError} />
    </View>
  );
}
