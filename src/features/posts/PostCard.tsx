import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Badge, Card } from '@/components/ui';
import { colors } from '@/theme';
import { timeAgo } from '@/utils/time';

import type { PostItem } from './usePosts';

const TYPE_LABEL: Record<PostItem['type'], string> = {
  discussion: 'Diskusi',
  question: 'Pertanyaan',
  review: 'Review',
  showcase: 'Showcase',
};

export function PostCard({ post }: { post: PostItem }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka post ${post.title}`}
      onPress={() => router.push({ pathname: '/posts/[postId]', params: { postId: post.id } })}>
      <Card>
        <Badge label={TYPE_LABEL[post.type]} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{post.title}</Text>
        <Text style={{ color: colors.textSecondary }}>{`@${post.authorUsername} • ${timeAgo(post.createdAt)}`}</Text>
        <Text style={{ color: colors.textSecondary }}>{`${post.likeCount} suka • ${post.commentCount} komentar`}</Text>
      </Card>
    </Pressable>
  );
}
