import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { buildExplanation, type MatchCard } from '@/features/match/explain';
import { MATCH_LABELS, useMatches } from '@/features/match/useMatches';
import { useSoundProfile } from '@/features/onboarding/useSoundProfile';
import { avatarUrl } from '@/features/profiles/api';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import type { SoundProfileInput } from '@shared/validation/soundProfile';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.sm,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.borderStrong,
        backgroundColor: colors.surface,
      }}>
      <Text style={{ color: colors.text }}>{selected ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

function MatchItem({ card, me }: { card: MatchCard; me: SoundProfileInput }) {
  const router = useRouter();
  const { reasons, differences } = buildExplanation(card, me);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar uri={avatarUrl(card.avatarPath)} name={card.displayName} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{card.displayName}</Text>
          <Text style={{ color: colors.textSecondary }}>@{card.username}</Text>
        </View>
        <Badge label={card.label} />
      </View>
      {card.label === 'Kecocokan awal' && (
        <Text style={{ color: colors.textSecondary }}>Data masih sedikit, jadi ini baru perkiraan awal.</Text>
      )}
      {reasons.map((r) => (
        <Text key={r} style={{ color: colors.text }}>{`• ${r}`}</Text>
      ))}
      {differences.length > 0 && (
        <>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Yang berbeda</Text>
          {differences.map((d) => (
            <Text key={d} style={{ color: colors.textSecondary }}>{`• ${d}`}</Text>
          ))}
        </>
      )}
      <Button title="Lihat profil" variant="secondary" onPress={() => router.push({ pathname: '/users/[userId]', params: { userId: card.candidateId } })} />
    </Card>
  );
}

export default function Match() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const { state, loadingMore, refreshing, notice, loadMore, refresh, retry } = useMatches(label);
  const mine = useSoundProfile();

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Match</Text>
      <Text style={{ color: colors.textSecondary }}>
        Pendengar dengan selera yang mirip denganmu. Ini kecocokan selera, bukan ukuran keahlian, dan belum tentu kamu menyukai perangkat yang sama.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label="Semua" selected={label === null} onPress={() => setLabel(null)} />
        {MATCH_LABELS.map((l) => (
          <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
        ))}
      </View>
      {!!notice && <Text style={{ color: colors.textSecondary }} accessibilityRole="alert">{notice}</Text>}
    </View>
  );

  let body: React.ReactNode = null;
  if (state.status === 'loading' || mine.state.status === 'loading') body = <Loading />;
  else if (state.status === 'error') body = <ErrorState message="Tidak bisa memuat Match." onRetry={retry} />;
  else if (state.status === 'no_profile' || (mine.state.status === 'ready' && !mine.state.data)) {
    body = (
      <EmptyState
        title="Lengkapi Sound Profile"
        message="Jawab kuis singkat agar kami bisa mencarikan pendengar dengan selera mirip."
        actionLabel="Buka kuis"
        onAction={() => router.push('/edit-sound-profile')}
      />
    );
  } else if (state.status === 'disabled') {
    body = (
      <EmptyState
        title="Match dinonaktifkan"
        message="Kamu menyembunyikan Sound Profile, jadi tidak ikut Match. Aktifkan lagi lewat Ubah Sound Profile."
        actionLabel="Ubah Sound Profile"
        onAction={() => router.push('/edit-sound-profile')}
      />
    );
  } else if (state.status === 'ready' && state.items.length === 0) {
    body = (
      <EmptyState
        title="Belum ada kecocokan"
        message={label ? 'Tidak ada hasil dengan filter ini.' : 'Belum ada pendengar lain yang cocok untuk ditampilkan. Coba lagi nanti.'}
      />
    );
  }

  const me = mine.state.status === 'ready' ? mine.state.data : null;
  const items = state.status === 'ready' && me ? state.items : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.candidateId}
        renderItem={({ item }) => (me ? <MatchItem card={item} me={me} /> : null)}
        ListHeaderComponent={
          <>
            {header}
            {body}
          </>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.accent} />
          ) : state.status === 'ready' && state.done && items.length > 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Sudah sampai akhir.</Text>
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
}
