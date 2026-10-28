import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

/** Jumlah notifikasi belum dibaca; dimuat ulang diam-diam tiap layar kembali fokus. */
export function useUnreadCount() {
  const uid = useAuth().session?.user.id;
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!uid) return;
    // RLS ikut berlaku: notifikasi dari akun yang diblokir tidak dihitung.
    const { count: n, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .is('read_at', null);
    if (!error) setCount(n ?? 0);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { count, refresh };
}
