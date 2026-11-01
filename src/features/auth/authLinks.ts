import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase/client';

import { parseAuthLink } from './parseAuthLink';

/** Tujuan semua tautan email/OAuth ke app (harus ada di Redirect URLs Supabase). */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

export const LINK_EXPIRED = 'Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru, dan buka di perangkat ini.';

type ExchangeResult = { ok: boolean; userId?: string };
const inflight = new Map<string, Promise<ExchangeResult>>();

/**
 * Tukar kode PKCE menjadi sesi. Satu kode hanya boleh ditukar sekali, padahal Android bisa mengirim
 * tautan yang sama lewat dua jalur (hasil browser auth dan listener tautan), jadi hasilnya dipakai bersama.
 */
export function exchangeCode(code: string): Promise<ExchangeResult> {
  let pending = inflight.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => ({ ok: !error && !!data.user, userId: data.user?.id }));
    inflight.set(code, pending);
  }
  return pending;
}

/**
 * Tangani tautan reson://auth/callback (verifikasi email, reset password, Google).
 * Mengembalikan pesan galat untuk ditampilkan, atau null bila sukses/bukan tautan auth/dibatalkan pengguna.
 */
export async function handleAuthLink(url: string): Promise<string | null> {
  const link = parseAuthLink(url);
  switch (link.kind) {
    case 'error':
      return LINK_EXPIRED;
    case 'code':
      return (await exchangeCode(link.code)).ok ? null : LINK_EXPIRED;
    case 'tokens': {
      const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
      return error ? LINK_EXPIRED : null;
    }
    default:
      return null;
  }
}
