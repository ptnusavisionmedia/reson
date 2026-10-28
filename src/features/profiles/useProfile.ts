import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { soundProfileSchema, type SoundProfileInput } from '@shared/validation/soundProfile';

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
  followerCount: number;
  followingCount: number;
};

type Result =
  | { status: 'ready'; profile: PublicProfile; sound: SoundProfileInput | null }
  | { status: 'not_found' }
  | { status: 'error' };

/**
 * Memuat profil publik + Sound Profile (hanya bila pemilik mengizinkan; RLS yang menyaring).
 * Akun suspended/deleting tidak dikembalikan oleh RLS, jadi tampil sama dengan "tidak ditemukan".
 * Dimuat ulang diam-diam setiap layar kembali fokus.
 */
export function useProfile(userId: string | undefined) {
  const [state, setState] = useState<{ forUser: string; result: Result } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [prof, snd] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_path, follower_count, following_count')
        .eq('id', userId)
        .maybeSingle(),
      supabase.from('sound_profiles').select('genres, bass, vocals, treble, contexts, discoverable').eq('user_id', userId).maybeSingle(),
    ]);
    let result: Result;
    if (prof.error) result = { status: 'error' };
    else if (!prof.data) result = { status: 'not_found' };
    else {
      const parsed = snd.data ? soundProfileSchema.safeParse(snd.data) : null;
      result = {
        status: 'ready',
        profile: {
          id: prof.data.id,
          username: prof.data.username,
          displayName: prof.data.display_name,
          bio: prof.data.bio,
          avatarPath: prof.data.avatar_path,
          followerCount: prof.data.follower_count,
          followingCount: prof.data.following_count,
        },
        sound: parsed?.success ? parsed.data : null,
      };
    }
    setState({ forUser: userId, result });
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const result: Result | null = state && state.forUser === userId ? state.result : null;
  return { result, retry: load };
}
