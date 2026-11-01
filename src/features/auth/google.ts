import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

import { authRedirectUrl, exchangeCode } from './authLinks';

WebBrowser.maybeCompleteAuthSession();

export type GoogleResult = { status: 'ok'; userId: string } | { status: 'cancelled' } | { status: 'error'; message: string };

const FAILED = 'Tidak bisa masuk dengan Google. Coba lagi atau gunakan email.';

/**
 * Masuk/daftar lewat Google dengan OAuth PKCE di browser sistem (Custom Tab).
 * Tanpa modul native: berjalan di Expo Go dan APK yang sudah ada. Pemilihan akun ditangani Google.
 * Sesi dibuat lewat exchangeCodeForSession; AuthProvider menangkapnya dan guard memindahkan layar.
 */
export async function signInWithGoogle(loginHint?: string): Promise<GoogleResult> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account', ...(loginHint ? { login_hint: loginHint } : {}) },
    },
  });
  if (error || !data.url) return { status: 'error', message: FAILED };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { status: 'cancelled' }; // ditutup/dibatalkan pengguna: bukan galat

  const params = new URL(result.url).searchParams;
  if (params.get('error') === 'access_denied') return { status: 'cancelled' };
  const code = params.get('code');
  if (!code) return { status: 'error', message: FAILED };

  const exchanged = await exchangeCode(code);
  if (!exchanged.ok || !exchanged.userId) return { status: 'error', message: FAILED };
  return { status: 'ok', userId: exchanged.userId };
}
