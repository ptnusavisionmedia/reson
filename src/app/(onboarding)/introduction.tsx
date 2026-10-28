import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui';
import { DrawOnIllustration, type IllustrationName } from '@/components/ui/DrawOnIllustration';
import { useAuth } from '@/providers/AuthProvider';
import { colors, minTouchTarget, spacing } from '@/theme';

const PAGES: { title: string; body: string; art: IllustrationName }[] = [
  { title: 'Kenali selera', body: 'Jawab beberapa pertanyaan singkat tentang musik dan suara yang kamu suka. Tidak perlu paham istilah audio.', art: 'headphone' },
  { title: 'Temukan teman satu selera', body: 'Reson mencocokkan pendengar dengan selera serupa, lengkap dengan alasan yang bisa kamu pahami.', art: 'listener' },
  { title: 'Bagikan cerita', body: 'Baca pengalaman orang lain, lalu bagikan ulasan dan setup milikmu sendiri.', art: 'conversation' },
];

export default function Introduction() {
  const router = useRouter();
  const { markIntroSeen } = useAuth();
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const last = page === PAGES.length - 1;

  async function finish() {
    await markIntroSeen();
    router.replace('/sound-quiz');
  }

  return (
    <Screen>
      <View style={{ alignItems: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={finish} style={{ minHeight: minTouchTarget, justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Lewati</Text>
        </Pressable>
      </View>
      {/* key = halaman: ilustrasi dan teks dibuat ulang (dan animasinya diputar) hanya untuk halaman aktif.
          Tombol tidak menunggu animasi; pengguna boleh lanjut kapan saja. */}
      <View key={page} style={{ alignItems: 'center', gap: spacing.md }}>
        <Animated.View entering={FadeIn.duration(900)}>
          <DrawOnIllustration name={current.art} size={240} />
        </Animated.View>
        {/* Teks muncul pelan setelah garis mulai tergambar, bukan serentak. */}
        <Animated.View entering={FadeInDown.duration(1100).delay(700)} style={{ alignItems: 'center', gap: spacing.md }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>{current.title}</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{current.body}</Text>
        </Animated.View>
      </View>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }} accessibilityLabel={`Halaman ${page + 1} dari ${PAGES.length}`}>
        {PAGES.map((_, i) => (i === page ? '● ' : '○ ')).join('')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {page > 0 && <View style={{ flex: 1 }}><Button title="Kembali" variant="secondary" onPress={() => setPage(page - 1)} /></View>}
        <View style={{ flex: 2 }}>
          <Button title={last ? 'Mulai' : 'Lanjut'} onPress={last ? finish : () => setPage(page + 1)} />
        </View>
      </View>
    </Screen>
  );
}
