import Link from 'next/link';

import type { PostItem, PostType } from '@/lib/data/posts';
import { timeAgo } from '@utils/time';

const TYPE_LABEL: Record<PostType, string> = {
  discussion: 'Diskusi',
  question: 'Pertanyaan',
  review: 'Review',
  showcase: 'Showcase',
};

export function PostCard({ post }: { post: PostItem }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
    >
      <span className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">{TYPE_LABEL[post.type]}</span>
      <h3 className="text-base font-semibold">{post.title}</h3>
      <p className="text-sm text-muted">
        @{post.authorUsername} •{' '}
        <time dateTime={post.createdAt} suppressHydrationWarning>
          {timeAgo(post.createdAt)}
        </time>
      </p>
      <p className="text-sm text-muted">
        {post.likeCount} suka • {post.commentCount} komentar
      </p>
    </Link>
  );
}
