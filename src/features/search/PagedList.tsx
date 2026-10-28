import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { ErrorState, Loading } from '@/components/ui';
import { colors, spacing } from '@/theme';

/** Daftar hasil berhalaman dengan state memuat/error/kosong/akhir. Dipakai Jelajah dan Perangkatku. */
export function PagedList<T>({ status, items, done, loadingMore, loadMore, retry, header, empty, renderItem, keyExtractor, errorMessage }: {
  status: 'loading' | 'ready' | 'error';
  items: T[];
  done: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
  header?: ReactNode;
  empty: ReactNode;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  errorMessage?: string;
}) {
  return (
    <FlatList
      data={status === 'ready' ? items : []}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => <>{renderItem(item)}</>}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          {header}
          {status === 'loading' && <Loading />}
          {status === 'error' && <ErrorState message={errorMessage ?? 'Tidak bisa memuat hasil.'} onRetry={retry} />}
          {status === 'ready' && items.length === 0 && empty}
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={colors.accent} />
        ) : status === 'ready' && items.length > 0 && done ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Sudah sampai akhir.</Text>
        ) : undefined
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      keyboardShouldPersistTaps="handled"
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
}
