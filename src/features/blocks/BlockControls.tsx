import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/theme';
import { serverErrorMessage } from '@/utils/errors';

/**
 * Blokir/buka blokir dan laporkan pengguna. Memblokir memutus follow di kedua arah dan
 * menyembunyikan konten kedua pihak satu sama lain (ditegakkan di server lewat RLS).
 */
export function BlockControls({ targetId, userId, onChanged }: { targetId: string; userId: string | undefined; onChanged: () => void }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
      .eq('blocked_id', targetId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBlocked(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, targetId]);

  async function run(action: 'block_user' | 'unblock_user') {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc(action, { p_user_id: targetId });
    setBusy(false);
    if (err) return setError(serverErrorMessage(err));
    setBlocked(action === 'block_user');
    onChanged();
  }

  function toggle() {
    if (busy || blocked === null) return;
    if (blocked) return run('unblock_user');
    Alert.alert('Blokir pengguna ini?', 'Kalian tidak akan saling melihat post dan komentar, dan tidak bisa saling mengikuti. Follow yang ada akan diputus.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Blokir', style: 'destructive', onPress: () => run('block_user') },
    ]);
  }

  return (
    <>
      <Button title={blocked ? 'Buka blokir' : 'Blokir'} variant="secondary" onPress={toggle} disabled={blocked === null} loading={busy} />
      <Button title="Laporkan pengguna" variant="secondary" onPress={() => router.push({ pathname: '/report', params: { targetType: 'user', targetId } })} />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </>
  );
}
