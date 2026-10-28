import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { devicesByIds, type DeviceItem } from '@/features/devices/api';
import { DeviceCard } from '@/features/devices/DeviceCard';
import { colors, minTouchTarget, spacing } from '@/theme';
import { OWNERSHIP, parseStoredReview, parseStoredShowcase } from '@shared/validation/postDetails';

function useDevices(ids: string[]): Record<string, DeviceItem> {
  const key = ids.join(',');
  const [state, setState] = useState<{ key: string; map: Record<string, DeviceItem> } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    devicesByIds(key.split(',')).then((map) => {
      if (!cancelled) setState({ key, map });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return key && state?.key === key ? state.map : {};
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: colors.text }}>{text}</Text>
    </View>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{title}</Text>
      {items.map((x, i) => (
        <Text key={i} style={{ color: colors.text }}>{`• ${x}`}</Text>
      ))}
    </View>
  );
}

/** Isi terstruktur review/showcase. Review dan showcase berbagi ID post, like, dan komentar dengan post biasa. */
export function PostDetailsView({ type, details }: { type: 'review' | 'showcase'; details: unknown }) {
  const review = type === 'review' ? parseStoredReview(details) : null;
  const showcase = type === 'showcase' ? parseStoredShowcase(details) : null;
  const deviceIds = review ? [review.deviceId, ...review.companionDeviceIds] : (showcase?.components.flatMap((c) => (c.deviceId ? [c.deviceId] : [])) ?? []);
  const devices = useDevices(deviceIds);

  if (review) {
    const main = devices[review.deviceId];
    const ownership = OWNERSHIP.find((o) => o.id === review.ownership)?.label ?? review.ownership;
    return (
      <View style={{ gap: spacing.md }}>
        {main ? <DeviceCard device={main} /> : <Card><Text style={{ color: colors.textSecondary }}>Perangkat tidak tersedia di katalog.</Text></Card>}
        <Badge label={`Status: ${ownership}`} />
        {review.ownership === 'sponsored' && <Text style={{ color: colors.textSecondary }}>Unit ini sponsor/gratis dari pihak lain. Pertimbangkan hal itu saat membaca.</Text>}
        <Text style={{ color: colors.textSecondary }}>Kesan suara bersifat subjektif dan belum tentu sama di telinga lain.</Text>
        <Section title="Bass" text={review.bassNotes} />
        <Section title="Vokal" text={review.vocalNotes} />
        <Section title="Treble" text={review.trebleNotes} />
        <Section title="Kenyamanan" text={review.comfortNotes} />
        <Bullets title="Kelebihan" items={review.pros} />
        <Bullets title="Kekurangan" items={review.cons} />
        {review.companionDeviceIds.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Perangkat pendamping</Text>
            {review.companionDeviceIds.map((id) => (devices[id] ? <DeviceCard key={id} device={devices[id]} /> : null))}
          </View>
        )}
        {review.referenceTracks.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Lagu referensi</Text>
            {review.referenceTracks.map((t, i) =>
              t.url ? (
                <Pressable key={i} accessibilityRole="link" onPress={() => Linking.openURL(t.url as string)} style={{ minHeight: minTouchTarget, justifyContent: 'center' }}>
                  <Text style={{ color: colors.accent }}>{`♪ ${t.title} (buka tautan)`}</Text>
                </Pressable>
              ) : (
                <Text key={i} style={{ color: colors.text }}>{`♪ ${t.title}`}</Text>
              ),
            )}
          </View>
        )}
      </View>
    );
  }

  if (showcase) {
    return (
      <View style={{ gap: spacing.md }}>
        <Section title="Tujuan" text={showcase.purpose} />
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Komponen</Text>
          {showcase.components.map((c, i) => {
            const d = c.deviceId ? devices[c.deviceId] : undefined;
            return (
              <View key={i} style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.text }}>{`${i + 1}. ${c.label}`}</Text>
                {c.deviceId ? (
                  d ? <DeviceCard device={d} /> : <Text style={{ color: colors.textSecondary }}>Perangkat katalog tidak tersedia.</Text>
                ) : (
                  <Text style={{ color: colors.textSecondary }}>Item bebas, belum diverifikasi.</Text>
                )}
              </View>
            );
          })}
        </View>
        <Section title="Kesan pemilik" text={showcase.impressions} />
      </View>
    );
  }

  return null;
}
