import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Input } from '@/components/ui';
import { DEVICE_PAGE, searchDevices, type DeviceItem } from '@/features/devices/api';
import { usePagedQuery, useDebounced } from '@/features/search/usePagedQuery';
import { colors, spacing } from '@/theme';

import { DeviceCard } from './DeviceCard';

/**
 * Pemilih perangkat dari katalog (inline). Perangkat yang belum ada bisa diusulkan; item bebas
 * tidak dianggap terverifikasi.
 */
export function DevicePicker({ onPick, onClose, excludeIds = [] }: { onPick: (d: DeviceItem) => void; onClose: () => void; excludeIds?: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim());
  const list = usePagedQuery(`picker:${dq}`, (offset) => searchDevices({ q: dq, category: null, offset }), DEVICE_PAGE);
  const shown = list.items.filter((d) => !excludeIds.includes(d.id));

  return (
    <View style={{ gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
      <Input label="Cari perangkat (awal nama)" value={q} onChangeText={setQ} placeholder="mis. moondrop" autoCapitalize="none" autoCorrect={false} />
      {list.status === 'loading' && <Text style={{ color: colors.textSecondary }}>Memuat…</Text>}
      {list.status === 'error' && <Text style={{ color: colors.accent }}>Tidak bisa memuat katalog.</Text>}
      {list.status === 'ready' && shown.length === 0 && <Text style={{ color: colors.textSecondary }}>Tidak ada perangkat yang cocok.</Text>}
      {shown.map((d) => (
        <DeviceCard key={d.id} device={d} onPress={() => onPick(d)} />
      ))}
      {list.status === 'ready' && !list.done && <Button title="Muat lebih banyak" variant="secondary" onPress={list.loadMore} loading={list.loadingMore} />}
      <Button title="Usulkan perangkat baru" variant="secondary" onPress={() => router.push('/suggest-device')} />
      <Button title="Tutup" variant="secondary" onPress={onClose} />
    </View>
  );
}
