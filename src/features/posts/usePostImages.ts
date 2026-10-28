import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { prepareJpeg, removeFiles, uploadJpeg } from '@/lib/storage';
import { POST_LIMITS } from '@shared/validation/post';

import { POST_IMAGES_BUCKET } from './api';

export type ImageItem = {
  key: string; // juga nama berkas: post-images/{uid}/{postId}/{key}.jpg
  localUri: string;
  width?: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
};

const MAX_WIDTH = 1600;

/**
 * Mengelola foto composer: unggah langsung saat dipilih, per-foto status, retry, dan hapus.
 * Foto yang diunggah tapi tidak pernah diterbitkan dibersihkan saat composer ditutup.
 */
export function usePostImages(uid: string | undefined, postId: string) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const removed = useRef(new Set<string>()); // foto dibatalkan saat masih mengunggah
  const published = useRef(false);
  const latest = useRef<ImageItem[]>([]);

  useEffect(() => {
    latest.current = items;
  }, [items]);

  const pathOf = useCallback((key: string) => `${uid}/${postId}/${key}.jpg`, [uid, postId]);

  const upload = useCallback(
    async (key: string, uri: string, width?: number) => {
      const prep = await prepareJpeg(uri, { maxWidth: MAX_WIDTH, sourceWidth: width });
      const err = 'error' in prep ? prep.error : await uploadJpeg(POST_IMAGES_BUCKET, pathOf(key), prep.bytes);
      if (removed.current.has(key)) {
        if (!err) await removeFiles(POST_IMAGES_BUCKET, [pathOf(key)]); // dibatalkan: buang hasil unggahan
        return;
      }
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, status: err ? 'error' : 'done', error: err ?? undefined } : i)));
    },
    [pathOf],
  );

  const add = useCallback(
    (assets: { uri: string; width?: number }[]) => {
      const room = POST_LIMITS.images - latest.current.length;
      const next = assets.slice(0, Math.max(0, room)).map((a) => ({
        key: Crypto.randomUUID(),
        localUri: a.uri,
        width: a.width,
        status: 'uploading' as const,
      }));
      if (!next.length) return;
      setItems((prev) => [...prev, ...next]);
      next.forEach((n) => upload(n.key, n.localUri, n.width));
    },
    [upload],
  );

  const remove = useCallback(
    (key: string) => {
      const item = latest.current.find((i) => i.key === key);
      if (!item) return;
      removed.current.add(key);
      if (item.status === 'done') removeFiles(POST_IMAGES_BUCKET, [pathOf(key)]);
      setItems((prev) => prev.filter((i) => i.key !== key));
    },
    [pathOf],
  );

  // Retry memakai nama berkas baru agar tidak bentrok bila unggahan sebelumnya sebenarnya sampai.
  const retry = useCallback(
    (key: string) => {
      const item = latest.current.find((i) => i.key === key);
      if (!item) return;
      const fresh = Crypto.randomUUID();
      removed.current.add(key);
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, key: fresh, status: 'uploading', error: undefined } : i)));
      upload(fresh, item.localUri, item.width);
    },
    [upload],
  );

  const markPublished = useCallback(() => {
    published.current = true;
  }, []);

  // Composer ditutup tanpa terbit: bersihkan foto yang sudah terunggah.
  useEffect(() => {
    const cleanupRemoved = removed.current;
    return () => {
      if (published.current) return;
      const paths = latest.current.filter((i) => i.status === 'done').map((i) => `${uid}/${postId}/${i.key}.jpg`);
      cleanupRemoved.clear();
      removeFiles(POST_IMAGES_BUCKET, paths);
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
