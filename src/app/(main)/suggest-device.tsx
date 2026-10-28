import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, EmptyState, Input } from '@/components/ui';
import { suggestDevice } from '@/features/devices/api';
import { colors } from '@/theme';

export default function SuggestDevice() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <EmptyState
        title="Usulan terkirim"
        message="Terima kasih. Admin akan meninjau dan menambahkannya ke katalog bila sesuai. Belum ada jaminan waktu penambahan."
        actionLabel="Selesai"
        onAction={() => router.back()}
      />
    );
  }

  async function submit() {
    if (busy) return;
    if (name.trim().length < 2 || !brand.trim()) return setError('Isi nama dan merek perangkat.');
    setBusy(true);
    setError(null);
    const err = await suggestDevice({ name, brand, sourceUrl });
    setBusy(false);
    if (err) return setError(err);
    setSent(true);
  }

  return (
    <Screen inStack>
      <Text style={{ color: colors.textSecondary }}>Usulkan perangkat yang belum ada di katalog. Admin yang menambahkannya.</Text>
      <Input label="Nama perangkat" value={name} onChangeText={setName} maxLength={100} />
      <Input label="Merek" value={brand} onChangeText={setBrand} maxLength={60} />
      <Input label="Tautan sumber (opsional)" value={sourceUrl} onChangeText={setSourceUrl} maxLength={300} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
      <Button title="Kirim usulan" onPress={submit} loading={busy} />
    </Screen>
  );
}
