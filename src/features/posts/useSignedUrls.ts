import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

import { POST_IMAGES_BUCKET } from './api';

const TTL_SECONDS = 3600;
const cache = new Map<string, { url: string; expiresAt: number }>();

/** Dipanggil saat logout: signed URL adalah bearer, jangan dibawa ke akun berikutnya. */
export function clearSignedUrlCache() {
  cache.clear();
}

/** Signed URL untuk foto post (bucket privat), di-cache sampai mendekati kedaluwarsa. */
export function useSignedUrls(paths: string[]): Record<string, string> {
  const key = paths.join('|');
  const [state, setState] = useState<{ key: string; urls: Record<string, string> } | null>(null);

  useEffect(() => {
    if (!key) return;
    const wanted = key.split('|');
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const need = wanted.filter((p) => (cache.get(p)?.expiresAt ?? 0) < now + 60_000);
      if (need.length) {
        const { data } = await supabase.storage.from(POST_IMAGES_BUCKET).createSignedUrls(need, TTL_SECONDS);
        data?.forEach((d) => {
          if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, expiresAt: now + TTL_SECONDS * 1000 });
        });
      }
      if (cancelled) return;
      const urls: Record<string, string> = {};
      wanted.forEach((p) => {
        const hit = cache.get(p);
        if (hit) urls[p] = hit.url;
      });
      setState({ key, urls });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return key && state?.key === key ? state.urls : {};
}
