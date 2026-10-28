import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Card, EmptyState, Input } from '@/components/ui';
import { DEVICE_CATEGORIES, DEVICE_PAGE, escapeLike, searchDevices } from '@/features/devices/api';
import { DeviceCard } from '@/features/devices/DeviceCard';
import { PostFeedList } from '@/features/posts/PostFeedList';
import type { PostType } from '@/features/posts/usePosts';
import { avatarUrl } from '@/features/profiles/api';
import { PagedList } from '@/features/search/PagedList';
import { useDebounced, usePagedQuery } from '@/features/search/usePagedQuery';
import { supabase } from '@/lib/supabase/client';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

type Tab = 'devices' | 'posts' | 'users';
const TABS: { id: Tab; label: string }[] = [
  { id: 'devices', label: 'Perangkat' },
  { id: 'posts', label: 'Post' },
  { id: 'users', label: 'Pengguna' },
];
const POST_TYPES: { id: PostType; label: string }[] = [
  { id: 'discussion', label: 'Diskusi' },
  { id: 'question', label: 'Pertanyaan' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Showcase' },
];
const USER_PAGE = 20;

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.sm,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.borderStrong,
        backgroundColor: colors.surface,
      }}>
      <Text style={{ color: colors.text }}>{selected ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

type UserRow = { id: string; username: string; displayName: string; avatarPath: string | null };

export default function Explore() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('devices');
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim().toLowerCase());
  const [category, setCategory] = useState<string | null>(null);
  const [postType, setPostType] = useState<PostType | null>(null);

  const devices = usePagedQuery(`devices:${dq}:${category}`, (offset) => searchDevices({ q: dq, category, offset }), DEVICE_PAGE, tab === 'devices');
  const users = usePagedQuery(
    `users:${dq}`,
    async (offset) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path')
        .ilike('username', `${escapeLike(dq)}%`)
        .order('username', { ascending: true })
        .range(offset, offset + USER_PAGE - 1);
      if (error) {
        console.warn('[searchUsers]', error.code, error.message);
        return { error: 'Tidak bisa memuat pengguna.' };
      }
      return { items: data.map((r): UserRow => ({ id: r.id, username: r.username, displayName: r.display_name, avatarPath: r.avatar_path })) };
    },
    USER_PAGE,
    tab === 'users' && dq.length > 0, // tanpa kata kunci, daftar pengguna tidak ditampilkan
  );

  const header = (
    <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: '600' }}>Jelajah</Text>
      <Input
        label="Cari"
        value={q}
        onChangeText={setQ}
        placeholder={tab === 'devices' ? 'Nama perangkat' : tab === 'posts' ? 'Judul post' : 'Username'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={{ color: colors.textSecondary }}>Pencarian berdasarkan awal kata, bukan pencarian teks penuh.</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </View>
      {tab === 'devices' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Semua kategori" selected={category === null} onPress={() => setCategory(null)} />
          {DEVICE_CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>
      )}
      {tab === 'posts' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Semua jenis" selected={postType === null} onPress={() => setPostType(null)} />
          {POST_TYPES.map((t) => (
            <Chip key={t.id} label={t.label} selected={postType === t.id} onPress={() => setPostType(t.id)} />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {tab === 'posts' ? (
        <PostFeedList
          key={`posts:${dq}:${postType}`}
          source={{ kind: 'search', q: dq, type: postType ?? undefined }}
          header={header}
          empty={<EmptyState title="Tidak ada post" message={dq ? 'Tidak ada judul yang diawali kata itu.' : 'Belum ada post.'} />}
        />
      ) : tab === 'devices' ? (
        <PagedList
          {...devices}
          header={header}
          keyExtractor={(d) => d.id}
          renderItem={(d) => <DeviceCard device={d} />}
          empty={
            <EmptyState
              title="Perangkat tidak ditemukan"
              message="Katalog dikurasi admin. Kamu bisa mengusulkan perangkat yang belum ada."
              actionLabel="Usulkan perangkat"
              onAction={() => router.push('/suggest-device')}
            />
          }
        />
      ) : (
        <PagedList
          {...users}
          status={dq ? users.status : 'ready'}
          items={dq ? users.items : []}
          header={header}
          keyExtractor={(u) => u.id}
          renderItem={(u) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Buka profil ${u.displayName}`}
              onPress={() => router.push({ pathname: '/users/[userId]', params: { userId: u.id } })}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar uri={avatarUrl(u.avatarPath)} name={u.displayName} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{u.displayName}</Text>
                    <Text style={{ color: colors.textSecondary }}>@{u.username}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
          empty={<EmptyState title={dq ? 'Pengguna tidak ditemukan' : 'Cari pengguna'} message={dq ? 'Tidak ada username yang diawali kata itu.' : 'Ketik awal username untuk mencari.'} />}
        />
      )}
    </SafeAreaView>
  );
}
