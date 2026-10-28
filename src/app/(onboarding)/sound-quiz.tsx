import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { Button, ErrorState, Loading } from '@/components/ui';
import { SoundQuizForm } from '@/features/onboarding/SoundQuizForm';
import { saveSoundProfile, useSoundProfile } from '@/features/onboarding/useSoundProfile';
import { useAuth } from '@/providers/AuthProvider';

export default function SoundQuiz() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const { state, reload } = useSoundProfile();

  async function skip() {
    if (await completeOnboarding()) router.replace('/home');
  }

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat jawaban Anda." onRetry={reload} />;

  return (
    <Screen title="Sound Profile">
      <SoundQuizForm
        initial={state.data}
        submitLabel="Lihat hasil"
        onSubmit={async (value) => {
          const err = await saveSoundProfile(value);
          if (!err) router.replace('/quiz-result');
          return err;
        }}
      />
      {/* Kuis boleh dilewati; Match akan mengajak melengkapinya nanti. */}
      <Button title="Lewati, isi nanti" variant="secondary" onPress={skip} />
    </Screen>
  );
}
