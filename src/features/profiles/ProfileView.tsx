import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Avatar, Card } from '@/components/ui';
import { describeProfile } from '@/features/onboarding/describe';
import { colors, spacing } from '@/theme';
import type { SoundProfileInput } from '@shared/validation/soundProfile';

import { avatarUrl } from './api';
import type { PublicProfile } from './useProfile';

export function ProfileView({ profile, sound, isSelf, children }: {
  profile: PublicProfile;
  sound: SoundProfileInput | null;
  isSelf: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card>
        <Avatar uri={avatarUrl(profile.avatarPath)} name={profile.displayName} size={72} />
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{profile.displayName}</Text>
        <Text style={{ color: colors.textSecondary }}>@{profile.username}</Text>
        {!!profile.bio && <Text style={{ color: colors.text }}>{profile.bio}</Text>}
        <Text style={{ color: colors.textSecondary }}>
          {`${profile.followerCount} pengikut • ${profile.followingCount} mengikuti`}
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Sound Profile</Text>
        {sound ? (
          describeProfile(sound).map((line) => (
            <Text key={line} style={{ color: colors.textSecondary }}>{line}</Text>
          ))
        ) : (
          <Text style={{ color: colors.textSecondary }}>
            {isSelf ? 'Kamu belum mengisi Sound Profile.' : 'Sound Profile tidak ditampilkan.'}
          </Text>
        )}
      </Card>
      {children}
    </View>
  );
}
