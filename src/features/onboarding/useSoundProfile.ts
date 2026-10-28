import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { soundProfileSchema, type SoundProfileInput } from '@shared/validation/soundProfile';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: SoundProfileInput | null }; // null = belum pernah mengisi

export function useSoundProfile() {
  const uid = useAuth().session?.user.id;
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!uid) return;
    const { data, error } = await supabase
      .from('sound_profiles')
      .select('genres, bass, vocals, treble, contexts, discoverable')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) return setState((s) => (s.status === 'ready' ? s : { status: 'error' }));
    if (!data) return setState({ status: 'ready', data: null });
    const parsed = soundProfileSchema.safeParse(data);
    setState({ status: 'ready', data: parsed.success ? parsed.data : null });
  }, [uid]);

  // Muat ulang diam-diam tiap layar kembali fokus (mis. setelah profil diubah dari layar lain).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, reload };
}

/** Mengembalikan pesan error, atau null jika tersimpan. Validasi final ada di server. */
export async function saveSoundProfile(input: SoundProfileInput): Promise<string | null> {
  const parsed = soundProfileSchema.safeParse(input);
  if (!parsed.success) return 'Jawaban tidak valid. Periksa kembali pilihan Anda.';
  const p = parsed.data;
  const { error } = await supabase.rpc('save_sound_profile', {
    p_genres: p.genres,
    p_bass: p.bass as number,
    p_vocals: p.vocals as number,
    p_treble: p.treble as number,
    p_contexts: p.contexts,
    p_discoverable: p.discoverable,
  });
  return error ? 'Gagal menyimpan. Periksa koneksi lalu coba lagi.' : null;
}
