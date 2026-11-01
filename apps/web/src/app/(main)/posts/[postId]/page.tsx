import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';

import { CommentSection } from '@/components/comment-section';
import { EmptyState } from '@/components/empty-state';
import { DeletePostButton, LikeButton, SaveButton } from '@/components/post-actions';
import { deviceIdsOf, PostDetailsView } from '@/components/post-details-view';
import { fetchComments } from '@/lib/data/comments';
import { fetchDevices, fetchPost, signPostImages } from '@/lib/data/post-detail';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@utils/time';

const TYPE_LABEL = { discussion: 'Diskusi', question: 'Pertanyaan', review: 'Review', showcase: 'Showcase' } as const;

// Konten komunitas privat: metadata tidak memuat isi post.
export const metadata: Metadata = { title: 'Post • Reson', robots: { index: false, follow: false } };

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const unavailable = (
    <EmptyState title="Post tidak tersedia" message="Post ini sudah dihapus atau disembunyikan." href="/home" actionLabel="Kembali ke Beranda" />
  );
  if (!z.uuid().safeParse(postId).success) return unavailable;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? '';

  const result = await fetchPost(supabase, postId);
  if (result.status === 'not_found') return unavailable;
  if (result.status === 'error') {
    return <EmptyState title="Gagal memuat" message="Tidak bisa memuat post. Muat ulang halaman untuk mencoba lagi." />;
  }
  const { post } = result;

  const avatarUrl = (path: string | null) => (path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : null);
  const [urls, devices, comments, like, saved] = await Promise.all([
    signPostImages(supabase, post.imagePaths),
    fetchDevices(supabase, deviceIdsOf(post.type, post.details)),
    fetchComments(supabase, postId, avatarUrl),
    supabase.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
    supabase.from('saved_posts').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
  ]);

  const isAuthor = post.authorId === userId;
  const edited = new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000;
  const authorAvatar = avatarUrl(post.authorAvatarPath);

  return (
    <article className="flex flex-col gap-5">
      <p className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">
        {TYPE_LABEL[post.type]} • {post.communityName}
      </p>
      <h1 className="text-2xl font-semibold">{post.title}</h1>

      <Link href={`/users/${post.authorId}`} className="flex w-fit items-center gap-3" aria-label={`Buka profil ${post.authorName}`}>
        {authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={authorAvatar} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-line">
            {post.authorName.trim().charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <div>
          <p>{post.authorName}</p>
          <p className="text-sm text-muted" suppressHydrationWarning>
            @{post.authorUsername} • {timeAgo(post.createdAt)}
            {edited ? ' • diedit' : ''}
          </p>
        </div>
      </Link>

      {(post.type === 'review' || post.type === 'showcase') && <PostDetailsView type={post.type} details={post.details} devices={devices} />}
      {post.body && <p className="whitespace-pre-wrap break-words text-base leading-7">{post.body}</p>}

      {post.imagePaths.map((p) =>
        urls[p] ? (
          // Signed URL privat: sengaja bukan next/image agar tidak lewat optimizer/cache bersama.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p} src={urls[p]} alt="Foto post" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
        ) : (
          <div key={p} className="aspect-[4/3] w-full rounded-lg bg-surface" role="img" aria-label="Foto tidak dapat dimuat" />
        ),
      )}

      <div className="flex flex-wrap items-start gap-3">
        <LikeButton postId={post.id} initialLiked={!!like.data} initialCount={post.likeCount} />
        <SaveButton postId={post.id} initialSaved={!!saved.data} />
        {isAuthor && <DeletePostButton postId={post.id} />}
      </div>

      <p className="text-sm text-muted">{post.commentCount} komentar</p>
      <CommentSection postId={post.id} currentUserId={userId} tree={comments.tree} loadFailed={comments.error} />
    </article>
  );
}
