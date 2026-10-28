import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button, EmptyState, ErrorState, Input, Loading } from '@/components/ui';
import { catalogConflictMessage, devicesByIds, findCatalogConflict } from '@/features/devices/api';
import { editPost } from '@/features/posts/api';
import {
  ReviewFields,
  ShowcaseFields,
  emptyReview,
  emptyShowcase,
  reviewFromStored,
  reviewPayload,
  showcaseFromStored,
  showcasePayload,
  type ReviewForm,
  type ShowcaseForm,
} from '@/features/posts/PostTypeFields';
import { usePost, type PostDetail } from '@/features/posts/usePost';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { fieldErrors } from '@shared/validation/auth';
import { POST_LIMITS, TEXT_REQUIRED_TYPES, bodyRequiredError, postEditSchema } from '@shared/validation/post';
import { parseStoredReview, parseStoredShowcase, reviewDetailsSchema, showcaseDetailsSchema } from '@shared/validation/postDetails';

function EditForm({ post, review: initialReview, showcase: initialShowcase }: { post: PostDetail; review: ReviewForm; showcase: ShowcaseForm }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [review, setReview] = useState(initialReview);
  const [showcase, setShowcase] = useState(initialShowcase);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isDetailType = post.type === 'review' || post.type === 'showcase';

  async function save() {
    if (saving) return;
    const parsed = postEditSchema.safeParse({ title, body });
    const errs = parsed.success ? {} : fieldErrors(parsed.error);
    if (TEXT_REQUIRED_TYPES.includes(post.type) && !body.trim()) errs.body = bodyRequiredError;

    let details: Record<string, unknown> | undefined;
    let detailMsg: string | null = null;
    if (post.type === 'review') {
      details = reviewPayload(review);
      const r = reviewDetailsSchema.safeParse(details);
      if (!r.success) detailMsg = review.device ? r.error.issues[0].message : 'Pilih perangkat yang di-review.';
    } else if (post.type === 'showcase') {
      details = showcasePayload(showcase);
      const r = showcaseDetailsSchema.safeParse(details);
      if (!r.success) detailMsg = r.error.issues[0].message;
      else {
        const dup = await findCatalogConflict(showcase.components.filter((c) => !c.device).map((c) => c.label));
        if (dup) detailMsg = catalogConflictMessage(dup);
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length || detailMsg) return setFormError(detailMsg);

    setFormError(null);
    setSaving(true);
    const err = await editPost(post.id, title.trim(), body.trim(), details);
    setSaving(false);
    if (err) return setFormError(err);
    router.back();
  }

  return (
    <Screen inStack>
      <Text style={{ color: colors.textSecondary }}>Jenis post dan komunitas tidak bisa diubah.</Text>
      <Input label={post.type === 'showcase' ? 'Nama setup' : 'Judul'} value={title} onChangeText={setTitle} error={errors.title} maxLength={POST_LIMITS.title} />
      {post.type === 'review' && <ReviewFields value={review} onChange={setReview} />}
      {post.type === 'showcase' && <ShowcaseFields value={showcase} onChange={setShowcase} />}
      <Input
        label={isDetailType ? 'Catatan tambahan (opsional)' : 'Isi'}
        value={body}
        onChangeText={setBody}
        error={errors.body}
        multiline
        maxLength={POST_LIMITS.body}
        style={{ minHeight: isDetailType ? 80 : 140, textAlignVertical: 'top' }}
      />
      {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
      <Button title="Simpan" onPress={save} loading={saving} />
    </Screen>
  );
}

/** Memuat nama perangkat dulu agar form edit menampilkan perangkat yang sudah dipilih. */
function WithDeviceNames({ post }: { post: PostDetail }) {
  const stored = post.type === 'review' ? parseStoredReview(post.details) : post.type === 'showcase' ? parseStoredShowcase(post.details) : null;
  const ids =
    stored && 'deviceId' in stored
      ? [stored.deviceId, ...stored.companionDeviceIds]
      : stored && 'components' in stored
        ? stored.components.flatMap((c) => (c.deviceId ? [c.deviceId] : []))
        : [];
  const [names, setNames] = useState<Record<string, string> | null>(ids.length ? null : {});

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    devicesByIds(ids).then((map) => {
      if (!cancelled) setNames(Object.fromEntries(Object.entries(map).map(([id, d]) => [id, d.name])));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  if (!names) return <Loading />;
  const review = post.type === 'review' ? parseStoredReview(post.details) : null;
  const showcase = post.type === 'showcase' ? parseStoredShowcase(post.details) : null;
  return (
    <EditForm
      post={post}
      review={review ? reviewFromStored(review, names) : emptyReview}
      showcase={showcase ? showcaseFromStored(showcase, names) : emptyShowcase}
    />
  );
}

export default function EditPost() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const uid = useAuth().session?.user.id;
  const { result, retry } = usePost(postId);

  if (!result) return <Loading />;
  if (result.status === 'error') return <ErrorState message="Tidak bisa memuat post." onRetry={retry} />;
  if (result.status === 'not_found' || result.post.authorId !== uid) {
    return <EmptyState title="Post tidak tersedia" actionLabel="Kembali" onAction={() => router.back()} />;
  }
  return <WithDeviceNames post={result.post} />;
}
