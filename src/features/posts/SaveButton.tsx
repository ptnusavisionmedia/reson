import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { serverErrorMessage } from '@/utils/errors';

/** Simpan post (privat) dengan perubahan seketika dan rollback bila ditolak. */
export function SaveButton({ postId, userId }: { postId: string; userId: string | undefined }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSaved(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, userId]);

  async function toggle() {
    if (busy || saved === null || !userId) return;
    const previous = saved;
    setSaved(!previous);
    setBusy(true);
    setError(null);
    const { error: err } = previous
      ? await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', userId)
      : await supabase.from('saved_posts').upsert({ post_id: postId, user_id: userId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true });
    setBusy(false);
    if (err) {
      setSaved(previous);
      setError(serverErrorMessage(err));
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!saved, disabled: saved === null }}
        accessibilityLabel={saved ? 'Hapus dari simpanan' : 'Simpan post'}
        onPress={toggle}
        style={{
          minHeight: minTouchTarget,
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: saved ? 2 : 1,
          borderColor: saved ? colors.accent : colors.borderStrong,
          backgroundColor: colors.surface,
        }}>
        <Text style={{ color: colors.text }}>{saved ? '✓ Tersimpan' : 'Simpan'}</Text>
      </Pressable>
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </>
  );
}
