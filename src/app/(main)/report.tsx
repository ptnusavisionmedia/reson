import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, EmptyState, Input } from '@/components/ui';
import { REPORT_REASONS, createReport, type ReportTargetType } from '@/features/moderation/api';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

const TYPE_LABEL: Record<ReportTargetType, string> = { post: 'post', comment: 'komentar', user: 'pengguna' };

export default function Report() {
  const router = useRouter();
  const { targetType, targetId } = useLocalSearchParams<{ targetType: ReportTargetType; targetId: string }>();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!targetId || !(targetType in TYPE_LABEL)) {
    return <EmptyState title="Laporan tidak valid" actionLabel="Kembali" onAction={() => router.back()} />;
  }
  if (sent) {
    return (
      <EmptyState
        title="Laporan terkirim"
        message="Terima kasih. Moderator akan meninjaunya. Kamu tidak akan melihat hasil tinjauan orang lain."
        actionLabel="Selesai"
        onAction={() => router.back()}
      />
    );
  }

  async function submit() {
    if (busy) return;
    if (!reason) return setError('Pilih alasan terlebih dahulu.');
    setBusy(true);
    setError(null);
    const text = note.trim() ? `${reason}: ${note.trim()}` : reason;
    const err = await createReport(targetType, targetId, text.slice(0, 500));
    setBusy(false);
    if (err) return setError(err);
    setSent(true);
  }

  return (
    <Screen inStack>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{`Laporkan ${TYPE_LABEL[targetType]}`}</Text>
      <Text style={{ color: colors.textSecondary }}>Pilih alasan yang paling sesuai.</Text>
      <View style={{ gap: spacing.sm }}>
        {REPORT_REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setReason(r)}
              style={{
                minHeight: minTouchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.sm,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.accent : colors.borderStrong,
                backgroundColor: colors.surface,
              }}>
              <Text style={{ color: colors.text }}>{selected ? `✓ ${r}` : r}</Text>
            </Pressable>
          );
        })}
      </View>
      <Input label="Keterangan tambahan (opsional)" value={note} onChangeText={setNote} multiline maxLength={300} style={{ minHeight: 80, textAlignVertical: 'top' }} />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
      <Button title="Kirim laporan" onPress={submit} loading={busy} />
    </Screen>
  );
}
