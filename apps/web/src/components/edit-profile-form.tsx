'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { saveProfile } from '@/app/actions';
import { ACCEPT_ATTR, prepareJpeg } from '@/lib/browser/image';
import { createClient } from '@/lib/supabase/browser';
import { fieldErrors } from '@shared/validation/auth';
import { profileEditSchema } from '@shared/validation/profile';

import { SmallButton, TextArea, TextInput } from './composer/fields';

const BUCKET = 'avatars';

export function EditProfileForm({
  uid,
  initial,
}: {
  uid: string;
  initial: { displayName: string; bio: string; avatarPath: string | null; avatarUrl: string | null };
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const parsed = profileEditSchema.safeParse({ displayName, bio });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSaving(true);
    try {
      const supabase = createClient();
      let avatarPath = initial.avatarPath;
      let uploaded: string | null = null;
      if (picked) {
        const prep = await prepareJpeg(picked.file, 512);
        if ('error' in prep) return setFormError(prep.error);
        const path = `${uid}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, prep.blob, { contentType: 'image/jpeg' });
        if (error) return setFormError('Gagal mengunggah foto. Coba lagi.');
        uploaded = avatarPath = path;
      }
      const res = await saveProfile({ ...parsed.data, avatarPath });
      if (res.error !== undefined) {
        if (uploaded) await supabase.storage.from(BUCKET).remove([uploaded]); // bersihkan unggahan yatim; avatar lama tetap utuh
        return setFormError(res.error);
      }
      if (uploaded && initial.avatarPath) await supabase.storage.from(BUCKET).remove([initial.avatarPath]); // hapus lama hanya setelah yang baru berhasil
      router.push(`/users/${uid}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const preview = picked?.url ?? initial.avatarUrl;

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <h1 className="text-2xl font-semibold">Ubah profil</h1>

      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto profil" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex h-24 w-24 items-center justify-center rounded-full bg-line text-3xl">
            {displayName.trim().charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            tabIndex={-1}
            aria-label="Pilih foto profil"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) setPicked({ file, url: URL.createObjectURL(file) });
            }}
          />
          <SmallButton onClick={() => fileInput.current?.click()} disabled={saving}>
            Ganti foto
          </SmallButton>
        </div>
      </div>

      <TextInput label="Nama tampilan" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} error={errors.displayName} />
      <TextArea label="Bio" value={bio} maxLength={300} onChange={(e) => setBio(e.target.value)} error={errors.bio} hint={`${bio.length}/300`} />

      {formError && (
        <p role="alert" className="text-sm text-accent">
          {formError}
        </p>
      )}
      <button type="submit" disabled={saving} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>
    </form>
  );
}
