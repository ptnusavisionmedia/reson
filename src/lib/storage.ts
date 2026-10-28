import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase/client';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Kompres ke JPEG dan kembalikan byte-nya. `storage-js` di React Native hanya andal dengan
 * ArrayBuffer dari base64 (bukan Blob/fetch), jadi base64 diminta langsung dari manipulator.
 * Jika `sourceWidth` diketahui dan sudah <= maxWidth, gambar tidak diperbesar.
 */
export async function prepareJpeg(
  uri: string,
  opts: { maxWidth: number; sourceWidth?: number; quality?: number },
): Promise<{ bytes: Uint8Array<ArrayBuffer> } | { error: string }> {
  try {
    const actions = opts.sourceWidth !== undefined && opts.sourceWidth <= opts.maxWidth ? [] : [{ resize: { width: opts.maxWidth } }];
    const img = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: opts.quality ?? 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (!img.base64) return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
    const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
    // Jaga-jaga: JPEG hasil kompres selalu jauh lebih besar dari ini.
    if (bytes.byteLength < 1024) return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
    if (bytes.byteLength > MAX_IMAGE_BYTES) return { error: 'Foto terlalu besar (maksimal 5 MB).' };
    return { bytes };
  } catch {
    return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
  }
}

/** Mengembalikan pesan error, atau null bila berhasil. */
export async function uploadJpeg(bucket: string, path: string, bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes.buffer, { contentType: 'image/jpeg' });
  return error ? 'Gagal mengunggah foto. Coba lagi.' : null;
}

/** Best effort: dipakai untuk membersihkan unggahan yatim atau berkas lama. */
export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length) await supabase.storage.from(bucket).remove(paths);
}
