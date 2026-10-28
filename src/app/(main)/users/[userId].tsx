import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { BlockControls } from '@/features/blocks/BlockControls';
import { FollowButton } from '@/features/follows/FollowButton';
import { ProfileScreen } from '@/features/profiles/ProfileScreen';
import { useProfile } from '@/features/profiles/useProfile';
import { useAuth } from '@/providers/AuthProvider';

export default function UserProfile() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuth();
  const { result, retry } = useProfile(userId);

  if (!result) return <Loading />;
  if (result.status === 'error') return <ErrorState message="Tidak bisa memuat profil." onRetry={retry} />;
  if (result.status === 'not_found') {
    return (
      <EmptyState
        title="Akun tidak tersedia"
        message="Akun ini tidak ditemukan atau sudah tidak aktif."
        actionLabel="Kembali"
        onAction={() => router.back()}
      />
    );
  }

  const isSelf = result.profile.id === session?.user.id;
  return (
    <ProfileScreen
      inStack
      profile={result.profile}
      sound={result.sound}
      isSelf={isSelf}
      actions={
        !isSelf && (
          <>
            <FollowButton targetId={result.profile.id} userId={session?.user.id} onChanged={retry} />
            <BlockControls targetId={result.profile.id} userId={session?.user.id} onChanged={retry} />
          </>
        )
      }
    />
  );
}
