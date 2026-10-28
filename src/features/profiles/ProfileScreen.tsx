import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { PostFeedList } from '@/features/posts/PostFeedList';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import type { SoundProfileInput } from '@shared/validation/soundProfile';

import { ProfileView } from './ProfileView';
import type { PublicProfile } from './useProfile';

type Tab = 'all' | 'review' | 'showcase';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Post' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Setup' },
];

/**
 * Profil dengan tab Post / Review / Setup. Ketiganya mengambil post yang sama berdasarkan jenis,
 * jadi satu review atau showcase punya satu ID, satu set like dan komentar di semua jalur masuk.
 */
export function ProfileScreen({ profile, sound, isSelf, actions, title, inStack }: {
  profile: PublicProfile;
  sound: SoundProfileInput | null;
  isSelf: boolean;
  actions?: ReactNode;
  title?: string;
  inStack?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('all');

  const header = (
    <View style={{ gap: spacing.md }}>
      {!!title && <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>{title}</Text>}
      <ProfileView profile={profile} sound={sound} isSelf={isSelf}>{actions}</ProfileView>
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

  const list = (
    <PostFeedList
      key={tab}
      source={{ kind: 'author', authorId: profile.id, type: tab === 'all' ? undefined : tab }}
      header={header}
      empty={<EmptyState title={tab === 'review' ? 'Belum ada review' : tab === 'showcase' ? 'Belum ada setup' : 'Belum ada post'} />}
    />
  );

  return inStack ? list : <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>{list}</SafeAreaView>;
}
