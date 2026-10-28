import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Loading } from '@/components/ui';
import { useCommunities, type CommunityItem } from '@/features/communities/useCommunities';
import { catalogConflictMessage, devicesByIds, findCatalogConflict } from '@/features/devices/api';
import { createPost } from '@/features/posts/api';
import { clearDraft, loadDraft, saveDraft } from '@/features/posts/draft';
import {
  ReviewFields,
  ShowcaseFields,
  emptyReview,
  emptyShowcase,
  reviewPayload,
  showcasePayload,
  type ReviewForm,
  type ShowcaseForm,
} from '@/features/posts/PostTypeFields';
import { usePostImages } from '@/features/posts/usePostImages';
import { useAuth } from '@/providers/AuthProvider';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { fieldErrors } from '@shared/validation/auth';
import { OWNERSHIP, reviewDetailsSchema, showcaseDetailsSchema } from '@shared/validation/postDetails';
import { POST_LIMITS, POST_TYPES, TEXT_REQUIRED_TYPES, bodyRequiredError, postInputSchema, type PostType } from '@shared/validation/post';

const TYPES: { id: PostType; label: string }[] = [
  { id: 'discussion', label: 'Diskusi' },
  { id: 'question', label: 'Pertanyaan' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Showcase' },
];

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

function Composer({ uid, joined, initialCommunityId, initialType, initialDeviceId }: {
  uid: string;
  joined: CommunityItem[];
  initialCommunityId?: string;
  initialType?: PostType;
  initialDeviceId?: string;
}) {
  const router = useRouter();
  const [postId] = useState(() => Crypto.randomUUID()); // satu ID per composer = kunci idempotensi
  const images = usePostImages(uid, postId);
  const [hydrated, setHydrated] = useState(false);
  const [type, setType] = useState<PostType>(initialType ?? 'discussion');
  const [communityId, setCommunityId] = useState<string | undefined>(initialCommunityId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [review, setReview] = useState<ReviewForm>(emptyReview);
  const [showcase, setShowcase] = useState<ShowcaseForm>(emptyShowcase);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const effectiveCommunity = joined.find((c) => c.id === communityId) ?? joined[0];
  const isDetailType = type === 'review' || type === 'showcase';

  useEffect(() => {
    loadDraft(uid).then(async (d) => {
      if (d) {
        // Parameter rute (mis. dari halaman perangkat) lebih diutamakan daripada draf.
        if (!initialType) setType(d.type);
        setTitle(d.title);
        setBody(d.body);
        if (d.review) setReview({ ...emptyReview, ...d.review });
        if (d.showcase) setShowcase({ ...emptyShowcase, ...d.showcase });
        setCommunityId((current) => current ?? d.communityId ?? undefined);
      }
      if (initialDeviceId) {
        const found = (await devicesByIds([initialDeviceId]))[initialDeviceId];
        if (found) setReview((r) => ({ ...r, device: { id: found.id, name: found.name } }));
      }
      setHydrated(true);
    });
  }, [uid, initialType, initialDeviceId]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => saveDraft(uid, { type, communityId: effectiveCommunity.id, title, body, review, showcase }), 400);
    return () => clearTimeout(t);
  }, [hydrated, uid, type, effectiveCommunity.id, title, body, review, showcase]);

  async function pickPhotos() {
    const room = POST_LIMITS.images - images.items.length;
    if (room <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 1 });
    if (!res.canceled) images.add(res.assets.map((a) => ({ uri: a.uri, width: a.width })));
  }

  function details(): Record<string, unknown> {
    return type === 'review' ? reviewPayload(review) : type === 'showcase' ? showcasePayload(showcase) : {};
  }

  async function toPreview() {
    const parsed = postInputSchema.safeParse({ type, communityId: effectiveCommunity.id, title, body });
    const errs = parsed.success ? {} : fieldErrors(parsed.error);
    if (TEXT_REQUIRED_TYPES.includes(type) && !body.trim()) errs.body = bodyRequiredError;
    setErrors(errs);

    let detailMsg: string | null = null;
    if (type === 'review') {
      const r = reviewDetailsSchema.safeParse(reviewPayload(review));
      if (!r.success) detailMsg = review.device ? r.error.issues[0].message : 'Pilih perangkat yang di-review.';
    } else if (type === 'showcase') {
      const r = showcaseDetailsSchema.safeParse(showcasePayload(showcase));
      if (!r.success) detailMsg = r.error.issues[0].message;
    }
    if (!detailMsg && type === 'showcase') {
      const dup = await findCatalogConflict(showcase.components.filter((c) => !c.device).map((c) => c.label));
      if (dup) detailMsg = catalogConflictMessage(dup);
    }
    setDetailsError(detailMsg);

    if (Object.keys(errs).length || detailMsg) return;
    setFormError(null);
    setStep('preview');
  }

  async function publish() {
    if (publishing) return;
    if (images.uploading) return setFormError('Tunggu sampai semua foto selesai diunggah.');
    if (images.failed) return setFormError('Ada foto yang gagal diunggah. Coba lagi atau hapus fotonya.');
    setPublishing(true);
    setFormError(null);
    const res = await createPost({
      id: postId,
      communityId: effectiveCommunity.id,
      type,
      title: title.trim(),
      body: body.trim(),
      imagePaths: images.paths,
      details: details(),
    });
    setPublishing(false);
    if ('error' in res) return setFormError(res.error);
    images.markPublished();
    await clearDraft(uid);
    router.replace({ pathname: '/posts/[postId]', params: { postId: res.data.id } });
  }

  const photoList = images.items.map((i) => (
    <View key={i.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Image source={{ uri: i.localUri }} style={{ width: 64, height: 64, borderRadius: radius.sm }} accessibilityLabel="Foto terpilih" />
      <Text style={{ flex: 1, color: i.status === 'error' ? colors.accent : colors.textSecondary }}>
        {i.status === 'uploading' ? 'Mengunggah…' : i.status === 'done' ? 'Terunggah' : `Gagal: ${i.error ?? 'coba lagi'}`}
      </Text>
      {step === 'edit' && (
        <>
          {i.status === 'error' && <Button title="Coba lagi" variant="secondary" onPress={() => images.retry(i.key)} />}
          <Button title="Hapus" variant="secondary" onPress={() => images.remove(i.key)} />
        </>
      )}
    </View>
  ));

  if (step === 'preview') {
    const ownershipLabel = OWNERSHIP.find((o) => o.id === review.ownership)?.label;
    return (
      <Screen inStack>
        <Text accessibilityRole="header" style={{ color: colors.textSecondary }}>Pratinjau</Text>
        <Card>
          <Badge label={`${TYPES.find((t) => t.id === type)?.label} • ${effectiveCommunity.name}`} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{title.trim()}</Text>
          {type === 'review' && (
            <>
              <Text style={{ color: colors.text }}>{`Perangkat: ${review.device?.name}`}</Text>
              <Text style={{ color: colors.textSecondary }}>{`Status: ${ownershipLabel}`}</Text>
            </>
          )}
          {type === 'showcase' &&
            showcase.components.filter((c) => c.label.trim()).map((c, i) => (
              <Text key={i} style={{ color: colors.text }}>{`${i + 1}. ${c.label.trim()}${c.device ? '' : ' (item bebas)'}`}</Text>
            ))}
          {!!body.trim() && <Text style={{ color: colors.text }}>{body.trim()}</Text>}
          {photoList}
        </Card>
        {!!formError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{formError}</Text>}
        <Button title="Terbitkan" onPress={publish} loading={publishing} />
        <Button title="Kembali mengedit" variant="secondary" onPress={() => setStep('edit')} disabled={publishing} />
      </Screen>
    );
  }

  return (
    <Screen inStack>
      <Text style={{ color: colors.textSecondary }}>Jenis post</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {TYPES.map((t) => <Chip key={t.id} label={t.label} selected={type === t.id} onPress={() => setType(t.id)} />)}
      </View>
      <Text style={{ color: colors.textSecondary }}>Komunitas</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {joined.map((c) => <Chip key={c.id} label={c.name} selected={effectiveCommunity.id === c.id} onPress={() => setCommunityId(c.id)} />)}
      </View>
      {!!errors.communityId && <Text style={{ color: colors.accent }}>{errors.communityId}</Text>}

      <Input label={type === 'showcase' ? 'Nama setup' : type === 'review' ? 'Judul review' : 'Judul'} value={title} onChangeText={setTitle} error={errors.title} maxLength={POST_LIMITS.title} />

      {type === 'review' && (
        <ReviewFields
          value={review}
          onChange={(v) => {
            // Judul disarankan dari nama perangkat saat pertama dipilih dan judul masih kosong.
            if (v.device && !review.device && !title.trim()) setTitle(`Review ${v.device.name}`);
            setReview(v);
          }}
        />
      )}
      {type === 'showcase' && <ShowcaseFields value={showcase} onChange={setShowcase} />}

      <Input
        label={isDetailType ? 'Catatan tambahan (opsional)' : 'Isi'}
        value={body}
        onChangeText={setBody}
        error={errors.body}
        multiline
        maxLength={POST_LIMITS.body}
        style={{ minHeight: isDetailType ? 80 : 140, textAlignVertical: 'top' }}
      />
      <Text style={{ color: colors.textSecondary }}>{`${body.length}/${POST_LIMITS.body}`}</Text>

      <Text style={{ color: colors.textSecondary }}>{`Foto (${images.items.length}/${POST_LIMITS.images})`}</Text>
      {photoList}
      <Button title="Tambah foto" variant="secondary" onPress={pickPhotos} disabled={images.items.length >= POST_LIMITS.images} />

      {!!detailsError && <Text style={{ color: colors.accent }} accessibilityRole="alert">{detailsError}</Text>}
      <Button title="Pratinjau" onPress={toPreview} />
    </Screen>
  );
}

export default function CreatePost() {
  const router = useRouter();
  const { communityId, type, deviceId } = useLocalSearchParams<{ communityId?: string; type?: string; deviceId?: string }>();
  const uid = useAuth().session?.user.id;
  const { state, reload } = useCommunities();

  if (!uid || !state) return <Loading />;
  if (state.status === 'error') return <ErrorState message="Tidak bisa memuat komunitas." onRetry={reload} />;
  const joined = state.items.filter((c) => c.joined);
  if (!joined.length) {
    return (
      <EmptyState
        title="Gabung komunitas dulu"
        message="Post selalu masuk ke satu komunitas. Gabung ke salah satunya untuk mulai menulis."
        actionLabel="Lihat komunitas"
        onAction={() => router.replace('/community')}
      />
    );
  }
  const initialType = POST_TYPES.find((t) => t === type);
  return <Composer uid={uid} joined={joined} initialCommunityId={communityId} initialType={initialType} initialDeviceId={deviceId} />;
}
