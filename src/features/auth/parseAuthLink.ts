export type AuthLink =
  | { kind: 'none' }
  | { kind: 'cancelled' }
  | { kind: 'error' }
  | { kind: 'code'; code: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string };

/** Urai tautan reson://auth/callback tanpa efek samping (mudah diuji). */
export function parseAuthLink(url: string): AuthLink {
  if (!url.includes('auth/callback')) return { kind: 'none' };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'none' };
  }
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const query = parsed.searchParams;

  const err = query.get('error') ?? hash.get('error');
  if (err) return err === 'access_denied' && !(query.get('error_code') ?? hash.get('error_code')) ? { kind: 'cancelled' } : { kind: 'error' };

  const code = query.get('code');
  if (code) return { kind: 'code', code };

  // Tautan tanpa PKCE (mis. kirim ulang verifikasi) membawa token di fragmen.
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };
  return { kind: 'none' };
}
