import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { colors, radius, spacing } from '@/theme';

import { categoryLabel, type DeviceItem } from './api';

export function deviceImageUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from('device-images').getPublicUrl(path).data.publicUrl : null;
}

/** Kartu perangkat. Tanpa `onPress`, mengetuk membuka detail perangkat. */
export function DeviceCard({ device, onPress }: { device: DeviceItem; onPress?: () => void }) {
  const router = useRouter();
  const uri = deviceImageUrl(device.imagePath);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${categoryLabel(device.category)}`}
      onPress={onPress ?? (() => router.push({ pathname: '/devices/[deviceId]', params: { deviceId: device.id } }))}>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel={`Foto ${device.name}`} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.border }} />
          )}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{device.name}</Text>
            <Text style={{ color: colors.textSecondary }}>{device.brand}</Text>
            <Badge label={categoryLabel(device.category)} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
