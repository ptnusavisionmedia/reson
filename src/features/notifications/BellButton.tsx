import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, minTouchTarget } from '@/theme';

import { useUnreadCount } from './useUnreadCount';

/** Ikon lonceng dengan lencana jumlah belum dibaca. Angka ikut dibacakan pembaca layar. */
export function BellButton() {
  const router = useRouter();
  const { count } = useUnreadCount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'}
      onPress={() => router.push('/notifications')}
      style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" stroke={colors.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {count > 0 && (
        <View style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: colors.background, fontSize: 11, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}
