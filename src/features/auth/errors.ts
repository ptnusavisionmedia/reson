// Pesan aman: tidak membedakan "email tidak ada" vs "password salah".
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'Email atau password salah.';
    case 'email_not_confirmed':
      return 'Email belum diverifikasi. Cek kotak masuk Anda.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Terlalu sering mencoba. Tunggu sebentar lalu ulangi.';
    case 'weak_password':
      return 'Password terlalu lemah.';
    case 'unexpected_failure':
      // Trigger profil gagal (mis. username bentrok pada saat bersamaan).
      return 'Pendaftaran gagal. Username mungkin baru saja dipakai orang lain.';
  }
  if (error?.message?.toLowerCase().includes('network')) return 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  return 'Terjadi masalah. Coba lagi nanti.';
}
