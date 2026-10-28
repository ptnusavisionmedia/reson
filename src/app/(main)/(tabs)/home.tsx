import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components/ui';
import { BellButton } from '@/features/notifications/BellButton';
import { PostFeedList } from '@/features/posts/PostFeedList';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

type Tab = 'forYou' | 'following';
const TABS: { id: Tab; label: string }[] = [
  { id: 'forYou', label: 'Untukmu' },
  { id: 'following', label: 'Mengikuti' },
];

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('forYou');

  const header = (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Beranda</Text>
        <BellButton />
      </View>
      <Button title="Buat post" onPress={() => router.push('/create-post')} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setTab(t.id)}
              style={{
                minHeight: minTouchTarget,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                borderRadius: radius.sm,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.accent : colors.borderStrong,
                backgroundColor: colors.surface,
              }}>
              <Text style={{ color: colors.text }}>{selected ? `✓ ${t.label}` : t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* key: ganti tab = feed baru; hanya feed aktif yang memuat data */}
      <PostFeedList
        key={tab}
        source={{ kind: tab }}
        header={header}
        empty={
          tab === 'forYou' ? (
            <EmptyState
              title="Belum ada post"
              message="Gabung ke komunitas untuk melihat post terbaru mereka di sini."
              actionLabel="Lihat komunitas"
              onAction={() => router.push('/community')}
            />
          ) : (
            <EmptyState
              title="Belum ada post dari yang kamu ikuti"
              message="Ikuti pengguna dari profil mereka, atau lihat Match untuk menemukan pendengar dengan selera mirip."
              actionLabel="Buka Match"
              onAction={() => router.push('/match')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
