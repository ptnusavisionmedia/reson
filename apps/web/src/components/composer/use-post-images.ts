'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { prepareJpeg } from '@/lib/browser/image';
import { createClient } from '@/lib/supabase/browser';
import { POST_LIMITS } from '@shared/validation/post';

const BUCKET = 'post-images';

export type ImageItem = {
  key: string; // juga nama berkas: post-images/{uid}/{postId}/{key}.jpg
  previewUrl: string;
  file: File;
  status: 'uploading' | 'done' | 'error';
  error?: string;
};

/**
 * Foto composer: unggah langsung saat dipilih, status per foto, retry, dan hapus. Foto yang terunggah
 * tapi tidak pernah diterbitkan dibersihkan saat composer ditutup (best effort; rekonsiliasi server menyusul).
 */
export function usePostImages(uid: string, postId: string) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const removed = useRef(new Set<string>()); // dibatalkan saat masih mengunggah
  const published = useRef(false);
  const latest = useRef<ImageItem[]>([]);

  useEffect(() => {
    latest.current = items;
  }, [items]);

  const pathOf = useCallback((key: string) => `${uid}/${postId}/${key}.jpg`, [uid, postId]);

  const upload = useCallback(
    async (key: string, file: File) => {
      const supabase = createClient();
      const prep = await prepareJpeg(file);
      let err: string | null = null;
      if ('error' in prep) err = prep.error;
      else {
        const { error } = await supabase.storage.from(BUCKET).upload(pathOf(key), prep.blob, { contentType: 'image/jpeg' });
        if (error) err = 'Gagal mengunggah foto. Coba lagi.';
      }
      if (removed.current.has(key)) {
        if (!err) await supabase.storage.from(BUCKET).remove([pathOf(key)]); // dibatalkan: buang hasil unggahan
        return;
      }
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, status: err ? 'error' : 'done', error: err ?? undefined } : i)));
    },
    [pathOf],
  );

  const add = useCallback(
    (files: File[]) => {
      const room = POST_LIMITS.images - latest.current.length;
      const next: ImageItem[] = files.slice(0, Math.max(0, room)).map((file) => ({
        key: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        file,
        status: 'uploading',
      }));
      if (!next.length) return;
      setItems((prev) => [...prev, ...next]);
      next.forEach((n) => void upload(n.key, n.file));
    },
    [upload],
  );

  const remove = useCallback(
    (key: string) => {
      const item = latest.current.find((i) => i.key === key);
      if (!item) return;
      removed.current.add(key);
      URL.revokeObjectURL(item.previewUrl);
      if (item.status === 'done') void createClient().storage.from(BUCKET).remove([pathOf(key)]);
      setItems((prev) => prev.filter((i) => i.key !== key));
    },
    [pathOf],
  );

  // Retry memakai nama berkas baru agar tidak bentrok bila unggahan sebelumnya sebenarnya sampai.
  const retry = useCallback(
    (key: string) => {
      const item = latest.current.find((i) => i.key === key);
      if (!item) return;
      const fresh = crypto.randomUUID();
      removed.current.add(key);
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, key: fresh, status: 'uploading', error: undefined } : i)));
      void upload(fresh, item.file);
    },
    [upload],
  );

  const markPublished = useCallback(() => {
    published.current = true;
  }, []);

  // Composer ditutup tanpa terbit: bersihkan foto yang sudah terunggah dan lepaskan object URL.
  useEffect(() => {
    return () => {
      latest.current.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      if (published.current) return;
      const paths = latest.current.filter((i) => i.status === 'done').map((i) => `${uid}/${postId}/${i.key}.jpg`);
      if (paths.length) void createClient().storage.from(BUCKET).remove(paths);
    };
  }, [uid, postId]);

  return {
    items,
    add,
    remove,
    retry,
    markPublished,
    paths: items.filter((i) => i.status === 'done').map((i) => pathOf(i.key)),
    uploading: items.some((i) => i.status === 'uploading'),
    failed: items.some((i) => i.status === 'error'),
  };
}
