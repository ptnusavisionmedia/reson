import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { likePost, unlikePost } from '@/features/comments/api';
import { supabase } from '@/lib/supabase/client';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

/**
 * Like/unlike optimistis: tampilan berubah seketika dan dikembalikan (rollback) bila server
 * menolak. Server idempoten, jadi ketukan berulang tidak menggandakan hitungan.
 */
export function LikeButton({ postId, userId, initialCount }: { postId: string; userId: string | undefined; initialCount: number }) {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = serverCount ?? initialCount;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLiked(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, userId]);

  async function toggle() {
    if (busy || liked === null) return;
    const previous = { liked, count };
    const next = !liked;
    setLiked(next);
    setServerCount(Math.max(0, count + (next ? 1 : -1)));
    setBusy(true);
    setError(null);
    const res = next ? await likePost(postId) : await unlikePost(postId);
    setBusy(false);
    if ('error' in res) {
      setLiked(previous.liked);
      setServerCount(previous.count);
      return setError(res.error);
    }
    setServerCount(res.count);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!liked, disabled: liked === null }}
        accessibilityLabel={liked ? 'Batal suka' : 'Suka'}
        onPress={toggle}
        style={{
          minHeight: minTouchTarget,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: liked ? 2 : 1,
          borderColor: liked ? colors.accent : colors.borderStrong,
          backgroundColor: colors.surface,
        }}>
        <Text style={{ color: colors.text }}>{`${liked ? '♥ Disukai' : '♡ Suka'} • ${count}`}</Text>
      </Pressable>
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </>
  );
}
