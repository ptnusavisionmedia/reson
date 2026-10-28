import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { JoinButton } from '@/features/communities/JoinButton';
import { useCommunities, type CommunityItem } from '@/features/communities/useCommunities';
import { PostCard } from '@/features/posts/PostCard';
import { PostFeedList } from '@/features/posts/PostFeedList';
import { usePinnedPosts } from '@/features/posts/usePosts';
import { colors, spacing } from '@/theme';

function Detail({ community, apply }: { community: CommunityItem; apply: (id: string, joined: boolean, n: number) => void }) {
  const router = useRouter();
  const pinned = usePinnedPosts(community.pinnedPostIds);

  const header = (
    <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>{community.name}</Text>
      <Text style={{ color: colors.textSecondary }}>{community.description}</Text>
      <Text style={{ color: colors.textSecondary }}>{`${community.memberCount} anggota`}</Text>
      <JoinButton community={community} onChanged={apply} />
      {community.joined ? (
        <Button title="Buat post" onPress={() => router.push({ pathname: '/create-post', params: { communityId: community.id } })} />
      ) : (
        <Text style={{ color: colors.textSecondary }}>Gabung untuk membuat post di komunitas ini.</Text>
      )}
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Aturan</Text>
        {community.rules.map((r, i) => (
          <Text key={r} style={{ color: colors.textSecondary }}>{`${i + 1}. ${r}`}</Text>
        ))}
      </Card>
      {pinned.length > 0 && (
        <>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Disematkan</Text>
          {pinned.map((p) => <PostCard key={p.id} post={p} />)}
        </>
      )}
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Terbaru</Text>
    </View>
  );

  return (
    <PostFeedList
      source={{ kind: 'community', communityId: community.id }}
      header={header}
      empty={<EmptyState title="Belum ada post" message="Jadilah yang pertama memulai percakapan di komunitas ini." />}
    />
  );
}

export default function CommunityDetail() {
  const router = useRouter();
  const { communityId } = useLocalSearchParams<{ communityId: string }>();
  const { state, reload, apply } = useCommunities();

  if (!state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat komunitas." onRetry={reload} />;
  const community = state.items.find((c) => c.id === communityId);
  if (!community) {
    return <EmptyState title="Komunitas tidak ditemukan" actionLabel="Kembali" onAction={() => router.back()} />;
  }
  return <Detail community={community} apply={apply} />;
}
