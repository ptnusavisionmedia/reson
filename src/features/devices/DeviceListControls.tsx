import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { serverErrorMessage } from '@/utils/errors';

type Flags = { owned: boolean; wanted: boolean };

function Toggle({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
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

/** "Punya" dan "Incar" untuk satu perangkat. Daftar ini privat (hanya terbaca pemiliknya). */
export function DeviceListControls({ deviceId, userId }: { deviceId: string; userId: string | undefined }) {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('device_lists')
      .select('owned, wanted')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFlags({ owned: data?.owned ?? false, wanted: data?.wanted ?? false });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, deviceId]);

  async function toggle(key: keyof Flags) {
    if (busy || !flags || !userId) return;
    const previous = flags;
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next); // optimistis; rollback bila ditolak
    setBusy(true);
    setError(null);
    const { error: err } =
      next.owned || next.wanted
        ? await supabase.from('device_lists').upsert({ user_id: userId, device_id: deviceId, owned: next.owned, wanted: next.wanted, updated_at: new Date().toISOString() })
        : await supabase.from('device_lists').delete().eq('user_id', userId).eq('device_id', deviceId);
    setBusy(false);
    if (err) {
      setFlags(previous);
      setError(serverErrorMessage(err));
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Toggle label="Punya" selected={!!flags?.owned} disabled={!flags || busy} onPress={() => toggle('owned')} />
        <Toggle label="Incar" selected={!!flags?.wanted} disabled={!flags || busy} onPress={() => toggle('wanted')} />
      </View>
      <Text style={{ color: colors.textSecondary }}>Daftar ini privat, hanya kamu yang bisa melihatnya.</Text>
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
