/** Memetakan error RPC aksi sosial ke pesan yang aman dan jelas bagi pengguna. */
export function serverErrorMessage(error: { message?: string } | null | undefined): string {
  const m = error?.message ?? '';
  if (m.includes('email not verified')) return 'Verifikasi email Anda dulu untuk melakukan ini.';
  if (m.includes('account not active')) return 'Akun Anda sedang tidak aktif.';
  if (m.includes('community not found')) return 'Komunitas tidak ditemukan.';
  if (m.includes('not a member')) return 'Gabung ke komunitas ini dulu untuk membuat post.';
  if (m.includes('rate limited')) return 'Terlalu banyak aksi dalam waktu singkat. Coba lagi nanti.';
  if (m.includes('post not found')) return 'Post tidak ditemukan atau sudah dihapus.';
  if (m.includes('cannot follow self')) return 'Kamu tidak bisa mengikuti diri sendiri.';
  if (m.includes('user not found')) return 'Akun tidak ditemukan atau sudah tidak aktif.';
  if (m.includes('catalog device exists')) {
    const label = m.split('catalog device exists:')[1]?.trim();
    return label ? `"${label}" sudah ada di katalog. Pilih dari katalog.` : 'Ada komponen bebas yang sudah ada di katalog. Pilih dari katalog.';
  }
  if (m.includes('blocked')) return 'Tindakan ini tidak tersedia untuk akun tersebut.';
  if (m.includes('not authorized')) return 'Anda tidak memiliki akses untuk melakukan ini.';
  if (m.includes('report already resolved')) return 'Laporan ini sudah diproses.';
  if (m.includes('report not found') || m.includes('target not found')) return 'Data yang dilaporkan tidak ditemukan.';
  if (m.includes('invalid reason')) return 'Alasan tidak valid. Tulis alasan yang jelas.';
  if (m.includes('cannot moderate staff')) return 'Akun staf tidak bisa dimoderasi.';
  if (m.includes('invalid target')) return 'Target tidak valid.';
  if (m.includes('comment not found')) return 'Komentar tidak ditemukan atau sudah dihapus.';
  if (m.includes('invalid parent')) return 'Komentar yang dibalas sudah tidak tersedia.';
  if (m.includes('invalid images')) return 'Foto tidak valid. Hapus lalu unggah ulang.';
  if (m.includes('invalid title') || m.includes('invalid body')) return 'Judul atau isi tidak valid.';
  if (m.includes('conflict')) return 'Terjadi konflik. Muat ulang lalu coba lagi.';
  if (m.toLowerCase().includes('network')) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  return 'Terjadi masalah. Coba lagi nanti.';
}
