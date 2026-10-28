import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { DEVICE_SELECT, categoryLabel, toDevice, type DeviceItem } from '@/features/devices/api';
import { DeviceListControls } from '@/features/devices/DeviceListControls';
import { deviceImageUrl } from '@/features/devices/DeviceCard';
import { PostFeedList } from '@/features/posts/PostFeedList';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

type Tab = 'review' | 'showcase';

function DeviceDetail({ device, userId }: { device: DeviceItem; userId: string | undefined }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('review');
  const uri = deviceImageUrl(device.imagePath);
  const specs = Object.entries(device.specs);

  const header = (
    <View style={{ gap: spacing.md }}>
      {uri && <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="contain" accessibilityLabel={`Foto ${device.name}`} />}
      <Badge label={categoryLabel(device.category)} />
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>{device.name}</Text>
      <Text style={{ color: colors.textSecondary }}>{device.brand}</Text>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Spesifikasi</Text>
        {specs.length ? (
          specs.map(([k, v]) => (
            <Text key={k} style={{ color: colors.textSecondary }}>{`${k}: ${v}`}</Text>
          ))
        ) : (
          <Text style={{ color: colors.textSecondary }}>Spesifikasi belum tersedia.</Text>
        )}
        {device.sourceUrl ? (
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(device.sourceUrl as string)} style={{ minHeight: minTouchTarget, justifyContent: 'center' }}>
            <Text style={{ color: colors.accent }}>Lihat sumber</Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.textSecondary }}>Belum ada sumber yang dicantumkan.</Text>
        )}
        <Text style={{ color: colors.textSecondary }}>Tidak ada harga otomatis di Reson.</Text>
      </Card>

      <DeviceListControls deviceId={device.id} userId={userId} />
      <Button title="Tulis review" onPress={() => router.push({ pathname: '/create-post', params: { type: 'review', deviceId: device.id } })} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['review', 'showcase'] as const).map((t) => {
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
              <Text style={{ color: colors.text }}>{selected ? '✓ ' : ''}{t === 'review' ? 'Review' : 'Setup terkait'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <PostFeedList
      key={tab}
      source={{ kind: 'device', deviceId: device.id, type: tab }}
      header={header}
      empty={<EmptyState title={tab === 'review' ? 'Belum ada review' : 'Belum ada setup'} message={tab === 'review' ? 'Jadilah yang pertama menulis review perangkat ini.' : 'Belum ada setup yang memakai perangkat ini.'} />}
    />
  );
}

export default function DeviceScreen() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const userId = useAuth().session?.user.id;
  const [state, setState] = useState<{ forId: string; result: { device: DeviceItem } | 'not_found' | 'error' } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    supabase
      .from('devices')
      .select(DEVICE_SELECT)
      .eq('id', deviceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[device]', error.code, error.message);
          return setState({ forId: deviceId, result: 'error' });
        }
        setState({ forId: deviceId, result: data ? { device: toDevice(data) } : 'not_found' });
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId, attempt]);

  const result = state && state.forId === deviceId ? state.result : null;
  if (!result) return <Loading />;
  if (result === 'error') return <ErrorState message="Tidak bisa memuat perangkat." onRetry={() => { setState(null); setAttempt((n) => n + 1); }} />;
  if (result === 'not_found') return <EmptyState title="Perangkat tidak tersedia" actionLabel="Kembali" onAction={() => router.back()} />;
  return <DeviceDetail device={result.device} userId={userId} />;
}
