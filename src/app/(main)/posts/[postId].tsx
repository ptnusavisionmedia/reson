import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar, Badge, Button, EmptyState, ErrorState, Loading } from '@/components/ui';
import { CommentSection } from '@/features/comments/CommentSection';
import { LikeButton } from '@/features/posts/LikeButton';
import { PostDetailsView } from '@/features/posts/PostDetailsView';
import { SaveButton } from '@/features/posts/SaveButton';
import { avatarUrl } from '@/features/profiles/api';
import { deletePost } from '@/features/posts/api';
import { usePost, type PostDetail } from '@/features/posts/usePost';
import { useSignedUrls } from '@/features/posts/useSignedUrls';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

const TYPE_LABEL = { discussion: 'Diskusi', question: 'Pertanyaan', review: 'Review', showcase: 'Showcase' } as const;

function Detail({ post, isAuthor, userId, onChanged }: { post: PostDetail; isAuthor: boolean; userId: string | undefined; onChanged: () => void }) {
  const router = useRouter();
  const urls = useSignedUrls(post.imagePaths);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edited = new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000;

  function confirmDelete() {
    Alert.alert('Hapus post?', 'Post dan fotonya akan dihapus dan tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const err = await deletePost(post.id);
          setBusy(false);
          if (err) return setError(err);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen inStack>
      <Badge label={`${TYPE_LABEL[post.type]} • ${post.communityName}`} />
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>{post.title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Buka profil ${post.authorName}`}
        onPress={() => router.push({ pathname: '/users/[userId]', params: { userId: post.authorId } })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
        <Avatar uri={avatarUrl(post.authorAvatarPath)} name={post.authorName} size={36} />
        <View>
          <Text style={{ color: colors.text }}>{post.authorName}</Text>
          <Text style={{ color: colors.textSecondary }}>{`@${post.authorUsername} • ${timeAgo(post.createdAt)}${edited ? ' • diedit' : ''}`}</Text>
        </View>
      </Pressable>
      {(post.type === 'review' || post.type === 'showcase') && <PostDetailsView type={post.type} details={post.details} />}
      {!!post.body && <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{post.body}</Text>}
      {post.imagePaths.map((p) =>
        urls[p] ? (
          <Image key={p} source={{ uri: urls[p] }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" accessibilityLabel="Foto post" />
        ) : (
          <View key={p} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surface }} />
        ),
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <LikeButton postId={post.id} userId={userId} initialCount={post.likeCount} />
        <SaveButton postId={post.id} userId={userId} />
      </View>
      {!isAuthor && (
        <Button title="Laporkan post" variant="secondary" onPress={() => router.push({ pathname: '/report', params: { targetType: 'post', targetId: post.id } })} />
      )}
      {isAuthor && (
        <>
          <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/edit-post', params: { postId: post.id } })} disabled={busy} />
          <Button title="Hapus" variant="secondary" onPress={confirmDelete} loading={busy} />
        </>
      )}
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
      <Text style={{ color: colors.textSecondary }}>{`${post.commentCount} komentar`}</Text>
      <CommentSection postId={post.id} currentUserId={userId} onChanged={onChanged} />
    </Screen>
  );
}

export default function PostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const uid = useAuth().session?.user.id;
  const { result, retry } = usePost(postId);

  if (!result) return <Loading />;
  if (result.status === 'error') return <ErrorState message="Tidak bisa memuat post." onRetry={retry} />;
  if (result.status === 'not_found') {
    return <EmptyState title="Post tidak tersedia" message="Post ini sudah dihapus atau disembunyikan." actionLabel="Kembali" onAction={() => router.back()} />;
  }
  return <Detail post={result.post} isAuthor={result.post.authorId === uid} userId={uid} onChanged={retry} />;
}
