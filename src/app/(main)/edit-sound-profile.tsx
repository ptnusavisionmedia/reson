import { useRouter } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { ErrorState, Loading } from '@/components/ui';
import { SoundQuizForm } from '@/features/onboarding/SoundQuizForm';
import { saveSoundProfile, useSoundProfile } from '@/features/onboarding/useSoundProfile';

export default function EditSoundProfile() {
  const router = useRouter();
  const { state, reload } = useSoundProfile();

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat Sound Profile." onRetry={reload} />;

  return (
    <Screen inStack>
      <SoundQuizForm
        initial={state.data}
        submitLabel="Simpan"
        onSubmit={async (value) => {
          const err = await saveSoundProfile(value);
          if (!err) router.back();
          return err;
        }}
      />
    </Screen>
  );
}
