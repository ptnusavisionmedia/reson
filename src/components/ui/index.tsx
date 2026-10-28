import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewProps } from 'react-native';
import { Image } from 'expo-image';

import { colors, minTouchTarget, radius, spacing } from '@/theme';

export function Button({ title, onPress, variant = 'primary', disabled, loading }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; loading?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary, (disabled || pressed) && { opacity: 0.7 }]}>
      {loading ? <ActivityIndicator color={primary ? colors.background : colors.text} /> : (
        <Text style={[styles.buttonText, { color: primary ? colors.background : colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        {...props}
        // style digabung, bukan ditimpa: gaya dasar (warna teks, latar, border) harus tetap berlaku.
        style={[styles.input, !!error && { borderColor: colors.accent }, style]}
      />
      {!!error && <Text style={styles.error}>{`Perlu diperbaiki: ${error}`}</Text>}
    </View>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return uri && failedUri !== uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel={`Foto ${name}`}
      onError={() => setFailedUri(uri)}
    />
  ) : (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.text, fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

export function Badge({ label }: { label: string }) {
  return <Text style={styles.badge}>{label}</Text>;
}

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

export function Loading({ label = 'Memuat…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }: { title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.heading}>{title}</Text>
      {!!message && <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text>}
      {!!actionLabel && !!onAction && <Button title={actionLabel} variant="secondary" onPress={onAction} />}
    </View>
  );
}

export function ErrorState({ message = 'Terjadi masalah.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <EmptyState title="Gagal memuat" message={message} actionLabel={onRetry ? 'Coba lagi' : undefined} onAction={onRetry} />;
}

const styles = StyleSheet.create({
  button: { minHeight: minTouchTarget, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  buttonText: { fontSize: 16, fontWeight: '600' },
  label: { color: colors.textSecondary, fontSize: 13 },
  input: { minHeight: minTouchTarget, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md },
  error: { color: colors.accent, fontSize: 13 },
  avatar: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  badge: { color: colors.textSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, fontSize: 12, alignSelf: 'flex-start' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  heading: { color: colors.text, fontSize: 18, fontWeight: '600' },
  muted: { color: colors.textSecondary },
});
