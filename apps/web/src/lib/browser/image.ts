export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTR = ACCEPTED.join(',');

/**
 * Validasi tipe dan ukuran, lalu kompres ke JPEG (lebar maksimal 1600px) di browser.
 * Mengembalikan blob, atau pesan galat yang bisa ditampilkan.
 */
export async function prepareJpeg(file: File, maxWidth = 1600, quality = 0.8): Promise<{ blob: Blob } | { error: string }> {
  if (!ACCEPTED.includes(file.type)) return { error: 'Format foto harus JPEG, PNG, atau WebP.' };
  if (file.size > MAX_INPUT_BYTES) return { error: 'Foto terlalu besar. Pilih foto lain.' };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
    ctx.fillStyle = '#ffffff'; // PNG/WebP transparan menjadi latar putih saat jadi JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size < 1024) return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
    if (blob.size > MAX_IMAGE_BYTES) return { error: 'Foto terlalu besar (maksimal 5 MB).' };
    return { blob };
  } catch {
    return { error: 'Foto tidak bisa diproses. Pilih foto lain.' };
  }
}
