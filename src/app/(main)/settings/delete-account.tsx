import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, Card, Input } from '@/components/ui';
import { startAccountDeletion } from '@/features/account/deleteAccount';
import type { DeletionStage } from '@/features/account/deletionFlow';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

const CONFIRM_WORD = 'HAPUS';
const STAGE_LABEL: Record<DeletionStage, string> = {
  storage: 'Menghapus foto…',
  data: 'Menghapus data…',
  finalize: 'Menyelesaikan…',
};

export default function DeleteAccount() {
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<DeletionStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = stage !== null;
  const email = session?.user.email;
  const uid = session?.user.id;
  const ready = !!email && !!uid && password.length > 0 && confirm.trim().toUpperCase() === CONFIRM_WORD;

  function ask() {
    if (!ready || busy) return;
    Alert.alert('Hapus akun secara permanen?', 'Tindakan ini tidak bisa dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus akun', style: 'destructive', onPress: run },
    ]);
  }

  async function run() {
    if (!email || !uid) return;
    setError(null);
    setStage('storage');
    const err = await startAccountDeletion(email, uid, password, setStage);
    // Sukses: sesi dihapus dan app otomatis kembali ke layar masuk. Gagal: tetap di sini dan bisa mencoba lagi.
    if (err) {
      setError(err);
      setStage(null);
    }
  }

  return (
    <Screen inStack>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Hapus akun</Text>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Yang akan dihapus</Text>
        <Text style={{ color: colors.textSecondary }}>• Akunmu, profil, dan Sound Profile</Text>
        <Text style={{ color: colors.textSecondary }}>• Semua post dan fotomu (beserta komentar orang lain di post itu)</Text>
        <Text style={{ color: colors.textSecondary }}>• Komentar, like, simpanan, daftar perangkat, blokir, notifikasi, dan hasil Match</Text>
        <Text style={{ color: colors.textSecondary }}>• Hubungan ikuti, dan keanggotaan komunitas</Text>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Yang tetap ada</Text>
        <Text style={{ color: colors.textSecondary }}>• Balasan orang lain di komentar utamamu tetap tampil di bawah komentar yang telah dihapus, tanpa isi dan tanpa namamu.</Text>
        <Text style={{ color: colors.textSecondary }}>• Laporan moderasi dan catatan tindakan moderator dipertahankan tanpa identitas pelapor. Rinciannya ada di kebijakan privasi.</Text>
      </Card>
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password" editable={!busy} />
      <Input label={`Ketik ${CONFIRM_WORD} untuk melanjutkan`} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" editable={!busy} />
      {busy && <Text style={{ color: colors.textSecondary }} accessibilityRole="alert">{STAGE_LABEL[stage]} Jangan tutup aplikasi.</Text>}
      {!!error && (
        <Text style={{ color: colors.accent }} accessibilityRole="alert">
          {`${error} Datamu belum selesai dihapus; kamu bisa mencoba lagi atau melanjutkannya saat membuka aplikasi.`}
        </Text>
      )}
      <Button title="Hapus akun saya" onPress={ask} disabled={!ready} loading={busy} />
    </Screen>
  );
}
