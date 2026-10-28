import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { colors } from '@/theme';
import { serverErrorMessage } from '@/utils/errors';

/**
 * Ikuti/Berhenti mengikuti dengan perubahan seketika dan rollback bila server menolak.
 * Server idempoten, jadi ketukan berulang tidak menggandakan hitungan.
 */
export function FollowButton({ targetId, userId, onChanged }: { targetId: string; userId: string | undefined; onChanged: () => void }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('following_id', targetId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFollowing(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, targetId]);

  async function toggle() {
    if (busy || following === null) return;
    const previous = following;
    setFollowing(!previous);
    setBusy(true);
    setError(null);
    const { error: err } = previous
      ? await supabase.rpc('unfollow_user', { p_user_id: targetId })
      : await supabase.rpc('follow_user', { p_user_id: targetId });
    setBusy(false);
    if (err) {
      setFollowing(previous);
      return setError(serverErrorMessage(err));
    }
    onChanged(); // muat ulang profil agar jumlah pengikut ikut berubah
  }

  return (
    <>
      <Button
        title={following ? 'Berhenti mengikuti' : 'Ikuti'}
        variant={following ? 'secondary' : 'primary'}
        onPress={toggle}
        disabled={following === null}
        loading={busy}
      />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </>
  );
}
