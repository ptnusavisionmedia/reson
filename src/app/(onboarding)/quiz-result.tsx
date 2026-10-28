import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, ErrorState, Loading } from '@/components/ui';
import { describeProfile } from '@/features/onboarding/describe';
import { useSoundProfile } from '@/features/onboarding/useSoundProfile';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { isInitialProfile } from '@shared/validation/soundProfile';

export default function QuizResult() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const { state, reload } = useSoundProfile();

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat hasil." onRetry={reload} />;
  if (!state.data) {
    return (
      <Screen title="Sound Profile">
        <Text style={{ color: colors.textSecondary }}>Belum ada jawaban tersimpan.</Text>
        <Button title="Isi kuis" onPress={() => router.replace('/sound-quiz')} />
      </Screen>
    );
  }

  return (
    <Screen title="Selera suaramu">
      <Card>
        {isInitialProfile(state.data) && <Badge label="Profil awal" />}
        {describeProfile(state.data).map((line) => (
          <Text key={line} style={{ color: colors.text }}>{line}</Text>
        ))}
      </Card>
      <Text style={{ color: colors.textSecondary }}>
        Ini hanya gambaran selera, bukan penilaian kemampuan mendengar. Kamu bisa mengubahnya kapan saja dari profil.
      </Text>
      <Button
        title="Mulai jelajah"
        onPress={async () => {
          if (await completeOnboarding()) router.replace('/home');
        }}
      />
      <Button title="Ubah jawaban" variant="secondary" onPress={() => router.replace('/sound-quiz')} />
    </Screen>
  );
}
