import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Button, ErrorState, Loading } from '@/components/ui';
import { colors, spacing } from '@/theme';

import { PostCard } from './PostCard';
import { usePostFeed, type FeedSource } from './usePosts';

/**
 * Daftar post berhalaman dengan semua state: memuat awal, kosong, error+retry, tarik-untuk-refresh,
 * memuat halaman lanjutan (dengan retry), dan akhir daftar. `header` tampil di atas daftar.
 */
export function PostFeedList({ source, header, empty }: { source: FeedSource; header?: ReactNode; empty: ReactNode }) {
  const feed = usePostFeed(source);

  const listHeader = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      {header}
      {feed.status === 'loading' && <Loading />}
      {feed.status === 'error' && <ErrorState message="Tidak bisa memuat post." onRetry={feed.retry} />}
      {feed.status === 'ready' && feed.items.length === 0 && empty}
    </View>
  );

  const footer = feed.moreFailed ? (
    <Button title="Gagal memuat. Coba lagi" variant="secondary" onPress={feed.loadMore} />
  ) : feed.loadingMore ? (
    <ActivityIndicator color={colors.accent} />
  ) : feed.status === 'ready' && feed.items.length > 0 && feed.done ? (
    <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Sudah sampai akhir.</Text>
  ) : undefined;

  return (
    <FlatList
      data={feed.status === 'ready' ? feed.items : []}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={listHeader}
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.5}
      refreshing={feed.refreshing}
      onRefresh={feed.onRefresh}
    />
  );
}
