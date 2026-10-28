import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing } from '@/theme';

import { LOGO } from './illustrationPaths';

/** Tanda logo Reson: garis headphone putih dengan satu titik coral. Statis (tanpa animasi). */
export function LogoMark({ size = 64, color = colors.text, dot = colors.accent }: { size?: number; color?: string; dot?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {LOGO.paths.map((d) => (
        <Path key={d} d={d} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <Circle cx={LOGO.dot[0]} cy={LOGO.dot[1]} r={5} fill={dot} />
    </Svg>
  );
}

/** Logo + nama. Dibacakan pembaca layar sebagai satu gambar bernama "Reson". */
export function Logo({ size = 72, tagline }: { size?: number; tagline?: boolean }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Reson" style={{ alignItems: 'center', gap: spacing.sm }}>
      <LogoMark size={size} />
      <Text style={{ color: colors.text, fontSize: Math.round(size * 0.42), fontWeight: '600', letterSpacing: 3 }}>Reson</Text>
      {tagline && <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Temukan orang yang mendengar seperti kamu.</Text>}
    </View>
  );
}
