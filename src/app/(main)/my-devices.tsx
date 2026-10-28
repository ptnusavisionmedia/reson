import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { DEVICE_PAGE, DEVICE_SELECT, toDevice, type DeviceItem } from '@/features/devices/api';
import { DeviceCard } from '@/features/devices/DeviceCard';
import { PagedList } from '@/features/search/PagedList';
import { usePagedQuery } from '@/features/search/usePagedQuery';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

type Tab = 'owned' | 'wanted';

export default function MyDevices() {
  const uid = useAuth().session?.user.id;
  const [tab, setTab] = useState<Tab>('owned');
  const [stamp, setStamp] = useState(0); // naik tiap layar kembali fokus agar daftar mengikuti perubahan di detail perangkat

  useFocusEffect(
    useCallback(() => {
      setStamp((n) => n + 1);
    }, []),
  );

  const list = usePagedQuery(
    `mine:${tab}:${stamp}`,
    async (offset) => {
      const { data, error } = await supabase
        .from('device_lists')
        .select(`updated_at, devices!device_lists_device_id_fkey(${DEVICE_SELECT})`)
        .eq('user_id', uid as string)
        .eq(tab, true)
        .order('updated_at', { ascending: false })
        .range(offset, offset + DEVICE_PAGE - 1);
      if (error) {
        console.warn('[my-devices]', error.code, error.message);
        return { error: 'Tidak bisa memuat daftar perangkat.' };
      }
      const rows = data as unknown as { devices: Parameters<typeof toDevice>[0] | null }[];
      return { items: rows.filter((r) => r.devices).map((r) => toDevice(r.devices as Parameters<typeof toDevice>[0])) };
    },
    DEVICE_PAGE,
    !!uid,
  );

  const header = (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {(['owned', 'wanted'] as const).map((t) => {
        const selected = tab === t;
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setTab(t)}
            style={{
              minHeight: minTouchTarget,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.accent : colors.borderStrong,
              backgroundColor: colors.surface,
            }}>
            <Text style={{ color: colors.text }}>{`${selected ? '✓ ' : ''}${t === 'owned' ? 'Punya' : 'Incar'}`}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <PagedList<DeviceItem>
      {...list}
      header={header}
      keyExtractor={(d) => d.id}
      renderItem={(d) => <DeviceCard device={d} />}
      empty={<EmptyState title={tab === 'owned' ? 'Belum ada perangkat' : 'Belum ada incaran'} message="Buka Jelajah → Perangkat lalu tandai Punya atau Incar. Daftar ini privat." />}
    />
  );
}
