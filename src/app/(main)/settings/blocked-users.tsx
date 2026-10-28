import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar, Button, Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { avatarUrl } from '@/features/profiles/api';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import { serverErrorMessage } from '@/utils/errors';

type Item = { id: string; username: string; displayName: string; avatarPath: string | null };
type Row = { blocked_id: string; profiles: { username: string; display_name: string; avatar_path: string | null } | null };

export default function BlockedUsers() {
  const uid = useAuth().session?.user.id;
  const [state, setState] = useState<{ status: 'ready'; items: Item[] } | { status: 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data, error: err } = await supabase
      .from('blocks')
      .select('blocked_id, profiles!blocks_blocked_id_fkey(username, display_name, avatar_path)')
      .eq('blocker_id', uid)
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) {
      console.warn('[blocked-users]', err.code, err.message);
      return setState((s) => (s?.status === 'ready' ? s : { status: 'error' }));
    }
    setState({
      status: 'ready',
      items: (data as unknown as Row[]).map((r) => ({
        id: r.blocked_id,
        username: r.profiles?.username ?? '',
        displayName: r.profiles?.display_name ?? 'Akun tidak tersedia',
        avatarPath: r.profiles?.avatar_path ?? null,
      })),
    });
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function unblock(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const { error: err } = await supabase.rpc('unblock_user', { p_user_id: id });
    setBusyId(null);
    if (err) return setError(serverErrorMessage(err));
    await load();
  }

  if (!state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat daftar blokir." onRetry={load} />;
  if (state.items.length === 0) return <EmptyState title="Tidak ada pengguna yang diblokir" />;

  return (
    <Screen inStack>
      {state.items.map((u) => (
        <Card key={u.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar uri={avatarUrl(u.avatarPath)} name={u.displayName} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{u.displayName}</Text>
              {!!u.username && <Text style={{ color: colors.textSecondary }}>@{u.username}</Text>}
            </View>
          </View>
          <Button title="Buka blokir" variant="secondary" onPress={() => unblock(u.id)} loading={busyId === u.id} />
        </Card>
      ))}
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </Screen>
  );
}
