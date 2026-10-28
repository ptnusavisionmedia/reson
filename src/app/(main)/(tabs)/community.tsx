import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { JoinButton } from '@/features/communities/JoinButton';
import { useCommunities, type CommunityItem } from '@/features/communities/useCommunities';
import { colors, spacing } from '@/theme';

export default function Community() {
  const router = useRouter();
  const { state, reload, apply } = useCommunities();

  if (!state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat komunitas." onRetry={reload} />;

  const mine = state.items.filter((c) => c.joined);
  const others = state.items.filter((c) => !c.joined);

  const card = (c: CommunityItem) => (
    <Card key={c.id}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buka komunitas ${c.name}`}
        onPress={() => router.push({ pathname: '/communities/[communityId]', params: { communityId: c.id } })}
        style={{ gap: spacing.xs, minHeight: 44 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{c.name}</Text>
        <Text style={{ color: colors.textSecondary }}>{c.description}</Text>
        <Text style={{ color: colors.textSecondary }}>{`${c.memberCount} anggota`}</Text>
      </Pressable>
      {/* Anggota keluar dari halaman detail; di hub hanya yang belum bergabung melihat tombol Gabung. */}
      {!c.joined && <JoinButton community={c} onChanged={apply} />}
    </Card>
  );

  return (
    <Screen title="Community">
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Komunitasmu</Text>
      {mine.length ? mine.map(card) : <EmptyState title="Belum bergabung" message="Pilih komunitas di bawah untuk mulai." />}
      {others.length > 0 && (
        <>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Temukan komunitas</Text>
          {others.map(card)}
        </>
      )}
    </Screen>
  );
}
