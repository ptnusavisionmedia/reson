import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Badge, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { timeAgo } from '@/utils/time';

type Report = { id: string; target_type: 'post' | 'comment' | 'user'; reason: string; created_at: string };
const TYPE_LABEL = { post: 'Post', comment: 'Komentar', user: 'Pengguna' } as const;

export default function ModerationQueue() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const [state, setState] = useState<{ status: 'ready'; items: Report[] } | { status: 'error' } | null>(null);

  const load = useCallback(async () => {
    // RLS: hanya staf yang bisa membaca laporan orang lain. Akun biasa hanya melihat laporannya sendiri.
    const { data, error } = await supabase
      .from('reports')
      .select('id, target_type, reason, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) {
      console.warn('[moderation]', error.code, error.message);
      return setState((s) => (s?.status === 'ready' ? s : { status: 'error' }));
    }
    setState({ status: 'ready', items: data as Report[] });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isStaff) load();
    }, [isStaff, load]),
  );

  if (!isStaff) return <EmptyState title="Tidak tersedia" message="Halaman ini hanya untuk moderator." actionLabel="Kembali" onAction={() => router.back()} />;
  if (!state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat antrean." onRetry={load} />;
  if (state.items.length === 0) return <EmptyState title="Antrean kosong" message="Tidak ada laporan yang menunggu." />;

  return (
    <Screen inStack>
      {state.items.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={`Buka laporan ${TYPE_LABEL[r.target_type]}`}
          onPress={() => router.push({ pathname: '/moderation/[reportId]', params: { reportId: r.id } })}>
          <Card>
            <Badge label={TYPE_LABEL[r.target_type]} />
            <Text style={{ color: colors.text }}>{r.reason}</Text>
            <Text style={{ color: colors.textSecondary }}>{timeAgo(r.created_at)}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
