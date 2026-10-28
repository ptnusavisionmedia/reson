import { useRouter } from 'expo-router';

import { Button, ErrorState, Loading } from '@/components/ui';
import { ProfileScreen } from '@/features/profiles/ProfileScreen';
import { useProfile } from '@/features/profiles/useProfile';
import { useAuth } from '@/providers/AuthProvider';

export default function Profile() {
  const router = useRouter();
  const { session, signOut, isStaff } = useAuth();
  const { result, retry } = useProfile(session?.user.id);

  if (!result) return <Loading />;
  if (result.status !== 'ready') return <ErrorState message="Tidak bisa memuat profil." onRetry={retry} />;

  return (
    <ProfileScreen
      title="Profil"
      profile={result.profile}
      sound={result.sound}
      isSelf
      actions={
        <>
          <Button title="Edit profil" onPress={() => router.push('/edit-profile')} />
          <Button title="Ubah Sound Profile" variant="secondary" onPress={() => router.push('/edit-sound-profile')} />
          <Button title="Perangkatku" variant="secondary" onPress={() => router.push('/my-devices')} />
          <Button title="Simpanan" variant="secondary" onPress={() => router.push('/saved')} />
          <Button title="Pengaturan" variant="secondary" onPress={() => router.push('/settings')} />
          {isStaff && <Button title="Moderasi" variant="secondary" onPress={() => router.push('/moderation')} />}
          <Button title="Keluar" variant="secondary" onPress={signOut} />
        </>
      }
    />
  );
}
