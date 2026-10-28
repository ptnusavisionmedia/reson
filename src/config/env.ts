// Hanya konfigurasi publik (EXPO_PUBLIC_*). Jangan taruh service_role key di sini.
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Tautan hukum dan dukungan. Kosong = tombol tidak ditampilkan (jangan menautkan ke halaman yang belum ada).
export const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';
export const deleteAccountUrl = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ?? '';
export const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '';
