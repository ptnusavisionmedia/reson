import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit-sound-profile" options={{ title: 'Ubah Sound Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit profil' }} />
      <Stack.Screen name="settings/index" options={{ title: 'Pengaturan' }} />
      <Stack.Screen name="users/[userId]" options={{ title: 'Profil' }} />
      <Stack.Screen name="communities/[communityId]" options={{ title: 'Komunitas' }} />
      <Stack.Screen name="create-post" options={{ title: 'Buat post' }} />
      <Stack.Screen name="posts/[postId]" options={{ title: 'Post' }} />
      <Stack.Screen name="edit-post" options={{ title: 'Edit post' }} />
      <Stack.Screen name="saved" options={{ title: 'Simpanan' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifikasi' }} />
      <Stack.Screen name="settings/delete-account" options={{ title: 'Hapus akun' }} />
      <Stack.Screen name="devices/[deviceId]" options={{ title: 'Perangkat' }} />
      <Stack.Screen name="my-devices" options={{ title: 'Perangkatku' }} />
      <Stack.Screen name="suggest-device" options={{ title: 'Usulkan perangkat' }} />
      <Stack.Screen name="report" options={{ title: 'Laporkan' }} />
      <Stack.Screen name="settings/blocked-users" options={{ title: 'Pengguna diblokir' }} />
      <Stack.Screen name="moderation/index" options={{ title: 'Moderasi' }} />
      <Stack.Screen name="moderation/[reportId]" options={{ title: 'Tinjau laporan' }} />
    </Stack>
  );
}
