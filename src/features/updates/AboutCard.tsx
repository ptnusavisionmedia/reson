import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Text } from 'react-native';

import { Card } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Info versi untuk memastikan pembaruan benar-benar terpasang. ID pembaruan berubah setiap kali
 * `eas update` dipublikasikan dan diterapkan; "bawaan build" berarti belum ada pembaruan yang dipakai.
 */
export function AboutCard() {
  const line = (label: string, value: string) => (
    <Text style={{ color: colors.textSecondary }}>{`${label}: ${value}`}</Text>
  );
  return (
    <Card>
      <Text style={{ color: colors.text, fontWeight: '600' }}>Tentang aplikasi</Text>
      {line('Versi', Constants.expoConfig?.version ?? '-')}
      {Updates.isEnabled ? (
        <>
          {line('Saluran', Updates.channel ?? '-')}
          {line('Runtime', Updates.runtimeVersion ?? '-')}
          {line('Pembaruan', Updates.isEmbeddedLaunch || !Updates.updateId ? 'bawaan build' : Updates.updateId.slice(0, 8))}
          {!!Updates.createdAt && line('Diterbitkan', Updates.createdAt.toLocaleString('id-ID'))}
        </>
      ) : (
        line('Mode', 'pengembangan (pembaruan nonaktif)')
      )}
    </Card>
  );
}
