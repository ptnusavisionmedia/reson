'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { publishPost } from '@/app/actions';
import { ACCEPT_ATTR } from '@/lib/browser/image';
import { clearDraft, loadDraft, saveDraft } from '@/lib/composer/draft';
import { detailsPayload, emptyReview, emptyShowcase, reviewPayload, showcasePayload, type ReviewForm, type ShowcaseForm } from '@/lib/composer/forms';
import { catalogConflictMessage, findCatalogConflict } from '@/lib/data/devices';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors } from '@shared/validation/auth';
import { bodyRequiredError, POST_LIMITS, postInputSchema, TEXT_REQUIRED_TYPES, type PostType } from '@shared/validation/post';
import { OWNERSHIP, reviewDetailsSchema, showcaseDetailsSchema } from '@shared/validation/postDetails';

import { Choice, SmallButton, TextArea, TextInput } from './fields';
import { ReviewFields, ShowcaseFields } from './type-fields';
import { usePostImages } from './use-post-images';

const TYPES: { id: PostType; label: string }[] = [
  { id: 'discussion', label: 'Diskusi' },
  { id: 'question', label: 'Pertanyaan' },
  { id: 'review', label: 'Review' },
  { id: 'showcase', label: 'Showcase' },
];

type Community = { id: string; name: string };

export function Composer({
  uid,
  communities,
  initialCommunityId,
  initialType,
}: {
  uid: string;
  communities: Community[];
  initialCommunityId?: string;
  initialType?: PostType;
}) {
  const router = useRouter();
  const [postId] = useState(() => crypto.randomUUID()); // satu ID per composer = kunci idempotensi
  const images = usePostImages(uid, postId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [type, setType] = useState<PostType>(initialType ?? 'discussion');
  const [communityId, setCommunityId] = useState<string | undefined>(communities.some((c) => c.id === initialCommunityId) ? initialCommunityId : undefined);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [review, setReview] = useState<ReviewForm>(emptyReview);
  const [showcase, setShowcase] = useState<ShowcaseForm>(emptyShowcase);
  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const published = useRef(false);

  const community = communities.find((c) => c.id === communityId) ?? communities[0];
  const isDetailType = type === 'review' || type === 'showcase';

  // Draf dimuat setelah mount (localStorage tidak ada di server). Parameter URL lebih diutamakan daripada draf.
  useEffect(() => {
    const d = loadDraft(uid);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d) {
      if (!initialType) setType(d.type);
      setTitle(d.title);
      setBody(d.body);
      if (d.review) setReview({ ...emptyReview, ...d.review });
      if (d.showcase) setShowcase({ ...emptyShowcase, ...d.showcase });
      setCommunityId((current) => current ?? (communities.some((c) => c.id === d.communityId) ? (d.communityId ?? undefined) : undefined));
    }
    setHydrated(true);
  }, [uid, initialType, communities]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => saveDraft(uid, { type, communityId: community.id, title, body, review, showcase }), 400);
    return () => clearTimeout(t);
  }, [hydrated, uid, type, community.id, title, body, review, showcase]);

  // Peringatan sebelum menutup tab bila ada isi yang belum diterbitkan.
  const dirty = !!title.trim() || !!body.trim() || images.items.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (published.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  async function toPreview() {
    const parsed = postInputSchema.safeParse({ type, communityId: community.id, title, body });
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
      const dup = await findCatalogConflict(createClient(), showcase.components.filter((c) => !c.device).map((c) => c.label));
      if (dup) detailMsg = catalogConflictMessage(dup);
    }
    setDetailsError(detailMsg);

    if (Object.keys(errs).length || detailMsg) return;
    setFormError(null);
    setStep('preview');
    window.scrollTo({ top: 0 });
  }

  async function publish() {
    if (publishing) return;
    if (images.uploading) return setFormError('Tunggu sampai semua foto selesai diunggah.');
    if (images.failed) return setFormError('Ada foto yang gagal diunggah. Coba lagi atau hapus fotonya.');
    setPublishing(true);
    setFormError(null);
    const res = await publishPost({
      id: postId,
      communityId: community.id,
      type,
      title: title.trim(),
      body: body.trim(),
      imagePaths: images.paths,
      details: detailsPayload(type, review, showcase),
    });
    setPublishing(false);
    if (res.error !== undefined) return setFormError(res.error);
    published.current = true;
    images.markPublished();
    clearDraft(uid);
    router.replace(`/posts/${res.id}`);
  }

  const photoList = images.items.map((i) => (
    <li key={i.key} className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={i.previewUrl} alt="Foto terpilih" className="h-16 w-16 rounded-md object-cover" />
      <span role={i.status === 'error' ? 'alert' : undefined} className={`flex-1 text-sm ${i.status === 'error' ? 'text-accent' : 'text-muted'}`}>
        {i.status === 'uploading' ? 'Mengunggah…' : i.status === 'done' ? 'Terunggah' : `Gagal: ${i.error ?? 'coba lagi'}`}
      </span>
      {step === 'edit' && (
        <>
          {i.status === 'error' && <SmallButton onClick={() => images.retry(i.key)}>Coba lagi</SmallButton>}
          <SmallButton onClick={() => images.remove(i.key)}>Hapus</SmallButton>
        </>
      )}
    </li>
  ));

  if (step === 'preview') {
    const ownershipLabel = OWNERSHIP.find((o) => o.id === review.ownership)?.label;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-sm text-muted">Pratinjau</h1>
        <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <p className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">
            {TYPES.find((t) => t.id === type)?.label} • {community.name}
          </p>
          <h2 className="text-lg font-semibold">{title.trim()}</h2>
          {type === 'review' && (
            <>
              <p>Perangkat: {review.device?.name}</p>
              <p className="text-sm text-muted">Status: {ownershipLabel}</p>
            </>
          )}
          {type === 'showcase' &&
            showcase.components
              .filter((c) => c.label.trim())
              .map((c, i) => (
                <p key={i}>
                  {i + 1}. {c.label.trim()}
                  {c.device ? '' : ' (item bebas)'}
                </p>
              ))}
          {body.trim() && <p className="whitespace-pre-wrap break-words">{body.trim()}</p>}
          {images.items.length > 0 && <ul className="flex flex-col gap-2">{photoList}</ul>}
        </article>
        {formError && (
          <p role="alert" className="text-sm text-accent">
            {formError}
          </p>
        )}
        <button type="button" onClick={publish} disabled={publishing} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
          {publishing ? 'Menerbitkan…' : 'Terbitkan'}
        </button>
        <SmallButton onClick={() => setStep('edit')} disabled={publishing}>
          Kembali mengedit
        </SmallButton>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void toPreview();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <h1 className="text-2xl font-semibold">Buat post</h1>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted">Jenis post</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Choice key={t.id} label={t.label} selected={type === t.id} onClick={() => setType(t.id)} />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="community" className="text-sm text-muted">
          Komunitas
        </label>
        <select
          id="community"
          value={community.id}
          onChange={(e) => setCommunityId(e.target.value)}
          className="min-h-11 rounded-md border border-line-strong bg-surface px-3 text-fg"
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.communityId && <p className="text-sm text-accent">{errors.communityId}</p>}
      </div>

      <TextInput
        label={type === 'showcase' ? 'Nama setup' : type === 'review' ? 'Judul review' : 'Judul'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        maxLength={POST_LIMITS.title}
      />

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

      <TextArea
        label={isDetailType ? 'Catatan tambahan (opsional)' : 'Isi'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        error={errors.body}
        maxLength={POST_LIMITS.body}
        hint={`${body.length}/${POST_LIMITS.body}`}
        className={`${isDetailType ? 'min-h-24' : 'min-h-40'} rounded-md border border-line-strong bg-surface p-3 text-fg`}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm text-muted">
          Foto ({images.items.length}/{POST_LIMITS.images})
        </legend>
        {images.items.length > 0 && <ul className="flex flex-col gap-2">{photoList}</ul>}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="sr-only"
          aria-label="Pilih foto"
          tabIndex={-1}
          onChange={(e) => {
            images.add(Array.from(e.target.files ?? []));
            e.target.value = ''; // izinkan memilih berkas yang sama lagi
          }}
        />
        <div>
          <SmallButton onClick={() => fileInput.current?.click()} disabled={images.items.length >= POST_LIMITS.images}>
            Tambah foto
          </SmallButton>
        </div>
        <p className="text-xs text-muted">JPEG, PNG, atau WebP. Foto dikompres otomatis.</p>
      </fieldset>

      {detailsError && (
        <p role="alert" className="text-sm text-accent">
          {detailsError}
        </p>
      )}
      <button type="submit" className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg">
        Pratinjau
      </button>
    </form>
  );
}
