import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

import { resumeAccountDeletion } from './deleteAccount';
import type { DeletionStage } from './deletionFlow';

const STAGE_LABEL: Record<DeletionStage, string> = {
  storage: 'Menghapus foto…',
  data: 'Menghapus data…',
  finalize: 'Menyelesaikan…',
};

/**
 * Ditampilkan bila akun berstatus 'deleting' (penghapusan terputus di tengah jalan). Akun ini
 * sudah tidak bisa dipakai untuk apa pun selain menyelesaikan penghapusan atau keluar.
 */
export function DeletionResume() {
  const { session, signOut } = useAuth();
  const [stage, setStage] = useState<DeletionStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = session?.user.id;

  async function run() {
    if (!uid) return;
    setError(null);
    setStage('storage');
    const err = await resumeAccountDeletion(uid, setStage);
    if (err) {
      setError(err);
      setStage(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' }}>
      <View style={{ gap: spacing.md }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>Penghapusan akun belum selesai</Text>
        <Text style={{ color: colors.textSecondary }}>
          Kamu sudah meminta penghapusan akun, tetapi prosesnya terputus. Akun ini tidak aktif dan tidak bisa dipakai sampai penghapusan diselesaikan.
        </Text>
        {stage && <Text style={{ color: colors.textSecondary }} accessibilityRole="alert">{`${STAGE_LABEL[stage]} Jangan tutup aplikasi.`}</Text>}
        {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
        <Button title="Lanjutkan penghapusan" onPress={run} loading={stage !== null} />
        <Button title="Keluar" variant="secondary" onPress={signOut} disabled={stage !== null} />
      </View>
    </SafeAreaView>
  );
}
