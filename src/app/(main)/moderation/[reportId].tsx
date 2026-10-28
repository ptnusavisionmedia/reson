import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Loading } from '@/components/ui';
import { moderateReport, moderationTarget, type ModerationAction, type ModerationTarget } from '@/features/moderation/api';
import { useSignedUrls } from '@/features/posts/useSignedUrls';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

type Report = { id: string; target_type: string; reason: string; status: string };

export default function ModerationDetail() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [state, setState] = useState<{ report: Report; target: ModerationTarget } | { error: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<ModerationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagePaths = state && 'target' in state ? (state.target.imagePaths ?? []) : [];
  const urls = useSignedUrls(imagePaths);

  useEffect(() => {
    if (!isStaff || !reportId) return;
    let cancelled = false;
    (async () => {
      const [rep, tgt] = await Promise.all([
        supabase.from('reports').select('id, target_type, reason, status').eq('id', reportId).maybeSingle(),
        moderationTarget(reportId),
      ]);
      if (cancelled) return;
      if (rep.error || !rep.data || 'error' in tgt) return setState({ error: 'error' in tgt ? tgt.error : 'Laporan tidak ditemukan.' });
      setState({ report: rep.data as Report, target: tgt.data });
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff, reportId]);

  if (!isStaff) return <EmptyState title="Tidak tersedia" message="Halaman ini hanya untuk moderator." actionLabel="Kembali" onAction={() => router.back()} />;
  if (!state) return <Loading />;
  if ('error' in state) return <ErrorState message={state.error} />;

  const { report, target } = state;
  const hidden = target.status === 'hidden' || target.status === 'suspended';

  async function act(action: ModerationAction) {
    if (busy) return;
    if (reason.trim().length < 3) return setError('Tulis alasan tindakan (minimal 3 karakter).');
    setBusy(action);
    setError(null);
    const err = await moderateReport(report.id, action, reason.trim());
    setBusy(null);
    if (err) return setError(err);
    router.back();
  }

  return (
    <Screen inStack>
      <Card>
        <Badge label={`Laporan • ${report.target_type}`} />
        <Text style={{ color: colors.text }}>{report.reason}</Text>
      </Card>

      <Card>
        <Badge label={target.missing ? 'Target tidak ditemukan' : `Status: ${target.status}`} />
        {!!target.authorUsername && <Text style={{ color: colors.textSecondary }}>{`Penulis/akun: @${target.authorUsername}`}</Text>}
        {!!target.title && <Text style={{ color: colors.text, fontWeight: '600' }}>{target.title}</Text>}
        {!!target.displayName && <Text style={{ color: colors.text, fontWeight: '600' }}>{target.displayName}</Text>}
        {!!(target.body || target.bio) && <Text style={{ color: colors.text }}>{target.body || target.bio}</Text>}
        {imagePaths.map((p) =>
          urls[p] ? (
            <Image key={p} source={{ uri: urls[p] }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" accessibilityLabel="Foto yang dilaporkan" />
          ) : (
            <View key={p} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surface }} />
          ),
        )}
      </Card>

      <Input label="Alasan tindakan (wajib, tercatat di audit)" value={reason} onChangeText={setReason} multiline maxLength={500} style={{ minHeight: 72, textAlignVertical: 'top' }} />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
      <View style={{ gap: spacing.sm }}>
        {!target.missing && !hidden && <Button title={target.type === 'user' ? 'Suspend akun' : 'Sembunyikan konten'} onPress={() => act('hide')} loading={busy === 'hide'} disabled={!!busy} />}
        {!target.missing && hidden && <Button title="Pulihkan" onPress={() => act('restore')} loading={busy === 'restore'} disabled={!!busy} />}
        <Button title="Abaikan laporan" variant="secondary" onPress={() => act('dismiss')} loading={busy === 'dismiss'} disabled={!!busy} />
      </View>
    </Screen>
  );
}
