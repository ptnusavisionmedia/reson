import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, minTouchTarget, radius, spacing } from '@/theme';

import { signInWithGoogle } from './google';

/** Tombol "Lanjutkan dengan Google": satu tombol untuk masuk dan daftar. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setLoading(false);
    // Sukses: AuthProvider menangkap sesi dan guard memindahkan layar. Batal bukan galat.
    if (result.status === 'error') setError(result.message);
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lanjutkan dengan Google"
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: minTouchTarget,
          borderRadius: radius.sm,
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm + 4,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.8 : 1,
        })}>
        {loading ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <Svg width={18} height={18} viewBox="0 0 48 48">
              <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.5z" />
              <Path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
              <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </Svg>
            <Text style={{ color: '#1F1F1F', fontSize: 16, fontWeight: '600' }}>Lanjutkan dengan Google</Text>
          </>
        )}
      </Pressable>
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <View accessible={false} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
