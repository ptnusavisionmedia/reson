import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar, Button, ErrorState, Input, Loading } from '@/components/ui';
import { avatarUrl, removeAvatar, updateMyProfile, uploadAvatar } from '@/features/profiles/api';
import { useProfile, type PublicProfile } from '@/features/profiles/useProfile';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { fieldErrors } from '@shared/validation/auth';
import { profileEditSchema } from '@shared/validation/profile';

function EditForm({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (!res.canceled) setPickedUri(res.assets[0].uri);
  }

  async function save() {
    if (saving) return;
    setFormError(null);
    const parsed = profileEditSchema.safeParse({ displayName, bio });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSaving(true);
    try {
      let avatarPath = profile.avatarPath;
      let uploaded: string | null = null;
      if (pickedUri) {
        const up = await uploadAvatar(profile.id, pickedUri);
        if ('error' in up) return setFormError(up.error);
        uploaded = avatarPath = up.path;
      }
      const err = await updateMyProfile({ ...parsed.data, avatarPath });
      if (err) {
        await removeAvatar(uploaded); // bersihkan unggahan yatim; avatar lama tetap utuh
        return setFormError(err);
      }
      if (uploaded) await removeAvatar(profile.avatarPath); // hapus lama hanya setelah yang baru berhasil
      await refreshProfile();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen inStack>
      <Avatar uri={pickedUri ?? avatarUrl(profile.avatarPath)} name={displayName} size={96} />
      <Button title="Ganti foto" variant="secondary" onPress={pick} disabled={saving} />
      <Input label="Nama tampilan" value={displayName} onChangeText={setDisplayName} error={errors.displayName} maxLength={50} />
      <Input label="Bio" value={bio} onChangeText={setBio} error={errors.bio} multiline maxLength={300} style={{ minHeight: 96, textAlignVertical: 'top' }} />
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Simpan" onPress={save} loading={saving} />
    </Screen>
  );
}

export default function EditProfile() {
  const { session } = useAuth();
  const { result, retry } = useProfile(session?.user.id);
  if (!result) return <Loading />;
  if (result.status !== 'ready') return <ErrorState message="Tidak bisa memuat profil." onRetry={retry} />;
  return <EditForm profile={result.profile} />;
}
